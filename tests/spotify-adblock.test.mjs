import assert from "node:assert/strict";
import test from "node:test";
import { nested, protobuf as pb, response, runtime, str, utf8 } from "./runtime.mjs";

const url = "https://gew1-spclient.spotify.com:443/user-customization-service/v1/customize?version=1";
const find = (fields, number) => fields.find(item => item.field === number && item.wire === 2);
const bool = (field, value) => ({ field, wire: 0, value: BigInt(value) });
const bytes = value => Buffer.from(value);
const attr = (name, fields) => nested(1, [str(1, name), nested(2, fields), str(90, "metadata")]);
const assigned = (scope, name, field, inner) => nested(3, [nested(1, [str(1, scope), str(2, name)]), nested(field, inner), bool(90, 987)]);

function fixture(bootstrap = false) {
  const attributes = [attr("type", [str(4, "free"), str(90, "unknown")]), attr("ads", [bool(3, 17)]), attr("high-bitrate", [bool(2, 0)]), attr("custom-untouched", [str(4, "keep")]), bool(80, 123)];
  const config = [
    assigned("ios-system-your-plan-sidedrawer", "is_row_enabled", 3, [bool(1, 1), bool(80, 456)]),
    assigned("ios-feature-navigation", "tab_configuration", 5, [str(1, "original tabs")]),
    assigned("ios-feature-share", "is_useractivity_sharing_enabled", 3, [bool(1, 1)]),
    assigned("unrelated-scope", "is_row_enabled", 3, [bool(1, 1)])
  ];
  const success = [nested(3, attributes), nested(1, [nested(1, [str(1, "assignment"), ...config])]), bool(80, 123)];
  const path = bootstrap ? [2, 1, 1, 1] : [1];
  let body = pb.encode(success);
  for (const field of [...path].reverse()) body = pb.encode([{ field, wire: 2, value: body }, bool(80, 123)]);
  return { body, path, attributes };
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
for (const bootstrap of [false, true]) {
  test("Spotify trial keeps its smaller attribute set and preserves unknown fields in " + (bootstrap ? "bootstrap" : "customize"), async () => {
    const { body, path, attributes } = fixture(bootstrap);
    const ctx = response(bootstrap ? url.replace("user-customization-service/v1/customize", "bootstrap/v1/bootstrap") : url, body);
    ctx.method = "POST";
    const rt = runtime("spotify-adblock");
    await rt.run(ctx);
    const result = account(ctx.body, path);
    assert.equal(utf8.decode(find(result.get("type"), 4).value), "premium");
    assert.equal(result.get("ads").find(item => item.field === 2).value, 0n);
    assert.equal(result.get("ads").some(item => item.field === 3), false);
    assert.equal(result.get("high-bitrate").find(item => item.field === 2).value, 0n);
    assert.equal(utf8.decode(find(result.get("type"), 90).value), "unknown");
    for (const key of ["has-audiobooks-subscription", "catalogue", "subscription-enddate", "shuffle", "on-demand"]) assert.equal(result.has(key), false);
    const fields = unwrap(ctx.body, [...path, 3]);
    assert.equal(fields.find(item => item.field === 80).value, 123n);
    const unchanged = fields.find(item => item.wire === 2 && utf8.decode(find(pb.decode(item.value), 1).value) === "custom-untouched");
    assert.deepEqual(bytes(unchanged.value), bytes(attributes[3].value));
    const first = ctx.body;
    await rt.run(ctx);
    assert.deepEqual(bytes(ctx.body), bytes(first));
    assert.equal(rt.calls.length, 0);
    assert.equal(rt.logs.length, 0);
  });
}
test("Spotify trial changes only the requested existing UI settings", async () => {
  for (const parameters of [{}, { tab: "true", useractivity: "false" }]) {
    const { body, path } = fixture();
    const ctx = { ...response(url, body), method: "POST" };
    await runtime("spotify-adblock", parameters).run(ctx);
    const config = unwrap(ctx.body, [...path, 1, 1]).filter(item => item.field === 3);
    const read = (index, field) => pb.decode(find(pb.decode(config[index].value), field).value);
    assert.equal(read(0, 3).find(item => item.field === 1).value, 0n);
    assert.equal(read(0, 3).find(item => item.field === 80).value, 456n);
    assert.equal(utf8.decode(find(read(1, 5), 1).value), parameters.tab ? "" : "original tabs");
    assert.equal(read(2, 3).find(item => item.field === 1).value, parameters.useractivity ? 0n : 1n);
    assert.equal(read(3, 3).find(item => item.field === 1).value, 1n);
    for (const item of config) assert.equal(pb.decode(item.value).find(item => item.field === 90).value, 987n);
  }
});
test("Spotify trial preserves errors, unsupported data and unrelated responses", async () => {
  for (const overrides of [{ body: Uint8Array.from([255]) }, { body: pb.encode([nested(2, [str(1, "error")])]) }, { method: "GET" }, { phase: "request" }, { status: 304 }, { url: url.replace("gew1-spclient", "api") }, { url: url.replace("spotify.com", "spotify.com.evil.example") }, { url: url.replace("customize?", "customize-extra?") }]) {
    const ctx = { ...response(url, fixture().body), method: "POST", ...overrides };
    const before = bytes(ctx.body), rt = runtime("spotify-adblock");
    await rt.run(ctx);
    assert.deepEqual(bytes(ctx.body), before);
    assert.equal(rt.calls.length, 0);
  }
});
test("Spotify trial returns the expected empty or JSON service responses and can disable them", async () => {
  const expected = [
    ["spclient.wg", "pendragon/v1", "{}"], ["gew1-spclient", "pendragon/v1", "{}"],
    ["spclient.wg", "gabo-receiver-service/v1", "{}"], ["gew1-spclient", "gabo-receiver-service/v1", ""],
    ["spclient.wg", "pushka-tokens/v1", ""], ["spclient.wg", "ads/v1", "{}"],
    ["spclient.wg", "offline/v1", "{}"], ["gew1-spclient", "offline/v1", "{}"]
  ];
  for (const [host, path, body] of expected) {
    const ctx = { phase: "request", url: `https://${host}.spotify.com:443/${path}` };
    const rt = runtime("spotify-adblock", {}, undefined, 0);
    await rt.run(ctx);
    assert.equal(rt.responses.length, 1);
    assert.equal(rt.responses[0].status, 200);
    assert.equal(rt.responses[0].body, body);
    if (body) assert.equal(rt.responses[0].headers[0][1], "application/json");
    assert.equal(rt.calls.length, 0);
    const disabled = runtime("spotify-adblock", { blockServices: "false" }, undefined, 0);
    await disabled.run(ctx);
    assert.equal(disabled.responses.length, 0);
  }
  for (const unrelated of ["https://api.spotify.com/pendragon/v1", "https://gew1-spclient.spotify.com/ads/v1", "https://gew1-spclient.spotify.com/pushka-tokens/v1", "https://spclient.wg.spotify.com/advice/v1", "https://spclient.wg.spotify.com/offline-extra/v1", "https://spclient.wg.spotify.com.evil.example/offline/v1"]) {
    const rt = runtime("spotify-adblock", {}, undefined, 0);
    await rt.run({ phase: "request", url: unrelated });
    assert.equal(rt.responses.length, 0);
  }
});
