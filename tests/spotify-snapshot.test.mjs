import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { nested, protobuf as pb, response, runtime, str, utf8 } from "./runtime.mjs";

const url = "https://gew1-spclient.spotify.com:443/user-customization-service/v1/customize?version=1";
const find = (fields, field) => fields.find(item => item.field === field && item.wire === 2);
const bool = (field, value) => ({ field, wire: 0, value: BigInt(value) });
const bytes = value => Buffer.from(value);
const attr = (name, fields) => nested(1, [str(1, name), nested(2, fields), str(90, "map metadata")]);
const config = JSON.parse(readFileSync(new URL("../data/spotify-amlabort-config.json", import.meta.url)));
const module = JSON.parse(readFileSync(new URL("../modules.json", import.meta.url))).find(item => item.id === "spotify-snapshot");

function fixture(bootstrap = false, configured = true) {
  const attributes = [attr("type", [str(4, "free"), str(90, "value metadata")]), attr("ads", [bool(3, 99)]), attr("high-bitrate", [bool(2, 0)]), attr("on-demand-trial", [bool(2, 1)]), attr("shuffle", [bool(2, 1)]), attr("smart-shuffle", [str(4, "AVAILABLE")]), attr("is-premium-eligible-v100", [bool(2, 1)]), attr("is-premium-eligible-v101", [bool(2, 1)]), attr("custom-untouched", [str(4, "keep")]), bool(80, 123)];
  const live = nested(3, [nested(1, [str(1, "live-scope"), str(2, "live-name")]), nested(3, [bool(1, 1)]), bool(80, 456)]);
  const success = [nested(3, attributes), ...(configured ? [nested(1, [nested(1, [str(1, "live assignment id"), bool(4, 12345), live, bool(80, 456)])])] : []), bool(80, 123)];
  const path = bootstrap ? [2, 1, 1, 1] : [1];
  let body = pb.encode(success);
  for (const field of [...path].reverse()) body = pb.encode([{ field, wire: 2, value: body }, bool(80, 123)]);
  if (bootstrap) body = pb.encode([...pb.decode(body), nested(3, [nested(1, [bool(1, 1)])])]);
  return { body, path, attributes, live };
}
function unwrap(body, path) {
  let fields = pb.decode(body);
  for (const field of path) fields = pb.decode(find(fields, field).value);
  return fields;
}
function account(body, path) {
  return new Map(unwrap(body, [...path, 3]).filter(item => item.field === 1 && item.wire === 2).map(item => {
    const fields = pb.decode(item.value);
    return [utf8.decode(find(fields, 1).value), pb.decode(find(fields, 2).value)];
  }));
}
function key(entry) {
  const fields = pb.decode(entry.value), property = pb.decode(find(fields, 1).value);
  return utf8.decode(find(property, 1).value) + "::" + utf8.decode(find(property, 2).value);
}
for (const bootstrap of [false, true]) {
  test("Spotify snapshot rewrites modern flags, trial keys and the complete configuration in " + (bootstrap ? "bootstrap" : "customize"), async () => {
    const { body, path, attributes } = fixture(bootstrap);
    const ctx = { ...response(bootstrap ? url.replace("user-customization-service/v1/customize", "bootstrap/v1/bootstrap") : url, body), method: "POST" };
    const rt = runtime("spotify-snapshot");
    await rt.run(ctx);
    const result = account(ctx.body, path);
    assert.equal(utf8.decode(find(result.get("type"), 4).value), "premium");
    assert.equal(utf8.decode(find(result.get("player-license-v2"), 4).value), "premium");
    assert.equal(result.get("ads").find(item => item.field === 2).value, 0n);
    assert.equal(result.get("high-bitrate").find(item => item.field === 2).value, 0n);
    assert.equal(result.has("audio-quality"), false);
    for (const name of ["on-demand-trial", "shuffle", "smart-shuffle", "is-premium-eligible-v100"]) assert.equal(result.has(name), false);
    assert.equal(result.has("is-premium-eligible-v101"), true);
    assert.equal(utf8.decode(find(result.get("type"), 90).value), "value metadata");
    const untouched = unwrap(ctx.body, [...path, 3]).find(item => item.wire === 2 && utf8.decode(find(pb.decode(item.value), 1).value) === "custom-untouched");
    assert.deepEqual(bytes(untouched.value), bytes(attributes[8].value));
    const configuration = unwrap(ctx.body, [...path, 1, 1]);
    const assignments = configuration.filter(item => item.field === 3 && item.wire === 2);
    assert.equal(assignments.length, 875);
    assert.equal(assignments.some(item => key(item) === "live-scope::live-name"), false);
    for (const blacklisted of config.blacklist) assert.equal(assignments.some(item => key(item) === blacklisted), false);
    assert.equal(utf8.decode(find(configuration, 1).value), "live assignment id");
    assert.equal(configuration.find(item => item.field === 4).value, 12345n);
    assert.equal(configuration.find(item => item.field === 80).value, 456n);
    const first = pb.decode(assignments[0].value), metadata = pb.decode(find(first, 2).value);
    const expected = config.assignments.find(item => !config.blacklist.includes(item.propertyId.scope + "::" + item.propertyId.name));
    assert.equal(metadata.find(item => item.field === 1).value, BigInt(expected.metadata.policyId));
    assert.equal(pb.decode(ctx.body).some(item => item.field === 3 && item.wire === 2), false);
    const expiry = Date.parse(utf8.decode(find(result.get("product-expiry"), 4).value));
    assert.ok(expiry > Date.now() + 360 * 86400000 && expiry < Date.now() + 367 * 86400000);
    assert.equal(rt.calls.length, 0);
    assert.equal(rt.logs.length, 0);
  });
}
test("snapshot replacement can be disabled without discarding live assignments", async () => {
  const { body, path, live } = fixture();
  const ctx = { ...response(url, body), method: "POST" };
  await runtime("spotify-snapshot", { replaceConfiguration: "false" }).run(ctx);
  assert.equal(utf8.decode(find(account(ctx.body, path).get("type"), 4).value), "premium");
  const values = unwrap(ctx.body, [...path, 1, 1]).filter(item => item.field === 3);
  assert.equal(values.length, 1);
  assert.deepEqual(bytes(values[0].value), bytes(live.value));
});
test("snapshot module retains bodies when disabled, malformed, missing success or configuration, or out of scope", async () => {
  for (const overrides of [{ body: Uint8Array.from([255]) }, { body: pb.encode([nested(2, [str(1, "server error")])]) }, { body: fixture(false, false).body }, { method: "GET" }, { status: 304 }, { phase: "request" }, { url: url.replace("gew1-spclient", "api") }, { url: url.replace("spotify.com", "spotify.com.evil.example") }, { url: url.replace("customize?", "customize-extra?") }]) {
    const ctx = { ...response(url, fixture().body), method: "POST", ...overrides };
    const before = bytes(ctx.body), rt = runtime("spotify-snapshot");
    await rt.run(ctx);
    assert.deepEqual(bytes(ctx.body), before);
    assert.equal(rt.calls.length, 0);
  }
  const ctx = { ...response(url, fixture().body), method: "POST" }, before = bytes(ctx.body);
  await runtime("spotify-snapshot", { applyRewrites: "false" }).run(ctx);
  assert.deepEqual(bytes(ctx.body), before);
});
test("snapshot service rules return empty Gabo responses or local rejection only for selected API paths", async () => {
  for (const [host, path, status] of [["spclient.wg", "gabo-receiver-service/v1", 200], ["gew1-spclient", "gabo-receiver-service/v1", 200], ["spclient.wg", "pendragon/v1", 403], ["gew1-spclient", "pam-view-service/v1/test", 403], ["spclient.wg", "playlist/v1/37i9dQZF1EYkqdzj48dyYq", 403]]) {
    const ctx = { phase: "request", url: `https://${host}.spotify.com:443/${path}` };
    const rt = runtime("spotify-snapshot", {}, undefined, 0);
    await rt.run(ctx);
    assert.equal(rt.responses.length, 1);
    assert.equal(rt.responses[0].status, status);
    if (status === 200) assert.equal(rt.responses[0].body, "");
    assert.equal(rt.responses[0].headers.some(([name]) => name.toLowerCase() === "alt-svc"), false);
    const disabled = runtime("spotify-snapshot", { applyRewrites: "false" }, undefined, 0);
    await disabled.run(ctx);
    assert.equal(disabled.responses.length, 0);
  }
  for (const path of ["pam-view-service/v1/test", "offline/v1/test", "pendragon-extra/test", "bootstrap/v1/bootstrap"]) {
    const rt = runtime("spotify-snapshot", {}, undefined, 0);
    await rt.run({ phase: "request", url: `https://spclient.wg.spotify.com/${path}` });
    assert.equal(rt.responses.length, 0);
  }
});
test("optional feed filtering removes structured fields and does not match tag bytes inside a payload", async () => {
  const script = "scripts/spotify-snapshot-feeds.js";
  for (const [path, field, length] of [["browsita/v1/browse", 6, 12001], ["casita/v2/home/default", 21, 10], ["scrollsita/v3/scroll/spotify", 30, 10]]) {
    const body = pb.encode([str(1, "keep"), { field, wire: 2, value: new Uint8Array(length) }, bool(80, 123)]);
    const ctx = response("https://gew1-spclient.spotify.com/" + path, body);
    const untouched = bytes(body);
    await runtime("spotify-snapshot", {}, undefined, 1, script).run(ctx);
    assert.deepEqual(bytes(ctx.body), untouched);
    const enabled = runtime("spotify-snapshot", { filterFeedAds: "true" }, undefined, 1, script);
    await enabled.run(ctx);
    const fields = pb.decode(ctx.body);
    assert.equal(fields.some(item => item.field === field), false);
    assert.equal(utf8.decode(find(fields, 1).value), "keep");
    assert.equal(fields.find(item => item.field === 80).value, 123n);
    assert.equal(enabled.calls.length, 0);
    const embedded = pb.encode([{ field: 1, wire: 2, value: body }]);
    const nestedCtx = response(ctx.url, embedded);
    await enabled.run(nestedCtx);
    assert.deepEqual(bytes(nestedCtx.body), bytes(embedded));
  }
});
test("feed filtering preserves malformed, late, unrelated and short search fields", async () => {
  const feedUrl = "https://spclient.wg.spotify.com/browsita/v1/browse";
  const cases = [
    { url: feedUrl, body: pb.encode([{ field: 6, wire: 2, value: new Uint8Array(12000) }]) },
    { url: feedUrl, body: Uint8Array.from([255]) },
    { url: feedUrl, body: pb.encode([{ field: 1, wire: 2, value: new Uint8Array(700) }, { field: 6, wire: 2, value: new Uint8Array(12001) }]) },
    { url: feedUrl.replace("browsita", "unrelated"), body: pb.encode([{ field: 6, wire: 2, value: new Uint8Array(12001) }]) }
  ];
  for (const item of cases) {
    const ctx = response(item.url, item.body), original = bytes(ctx.body);
    await runtime("spotify-snapshot", { filterFeedAds: "true" }, undefined, 1, "scripts/spotify-snapshot-feeds.js").run(ctx);
    assert.deepEqual(bytes(ctx.body), original);
  }
});
test("snapshot helper uses its own REJECT set and embedded configuration matches the data file", () => {
  const routing = JSON.parse(readFileSync(new URL("../routing.json", import.meta.url))).find(item => item.id === "spotify-snapshot-ads");
  assert.equal(routing.routing, 2);
  assert.deepEqual(routing.rules, [[2, "aet.spotify.com"]]);
  assert.equal(module.rules.filter(item => !Array.isArray(item)).length, 3);
  const text = readFileSync(new URL("../modules/spotify-snapshot.amrs", import.meta.url), "utf8");
  const line = text.split("\n").find(line => line.startsWith("1,100,") && line.includes("bootstrap"));
  const encoded = line.slice(line.lastIndexOf(",") + 1);
  const source = Buffer.from(encoded, "base64").toString("utf8");
  const embedded = JSON.parse(source.match(/^const AML_CONFIG_DATA = (.*);/)[1]);
  assert.deepEqual(embedded, config);
});
