import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { nested, protobuf as pb, response, runtime, str, utf8 } from "./runtime.mjs";

const module = JSON.parse(readFileSync(new URL("../modules.json", import.meta.url))).find(item => item.id === "spotify");
const find = (entries, field) => entries.find(entry => entry.field === field && entry.wire === 2);
const equalBytes = (a, b) => assert.deepEqual(Buffer.from(a), Buffer.from(b));
const extras = [{ field: 80, wire: 0, value: 123n }, str(81, "preserve")];

function fixture(bootstrap = false, empty = false) {
  const entries = empty ? [] : [
    nested(1, [str(1, "type"), nested(2, [str(4, "free"), str(90, "attribute metadata")]), str(40, "map metadata")]),
    nested(1, [str(1, "ads"), nested(2, [{ field: 3, wire: 0, value: 123n }, { field: 91, wire: 0, value: 987n }])]),
    nested(1, [str(1, "custom-untouched"), nested(2, [str(4, "keep"), str(90, "extra")])]),
    ...extras
  ];
  const path = bootstrap ? [2, 1, 1, 1, 3] : [1, 3];
  let body = pb.encode(entries);
  for (let i = path.length - 1; i >= 0; i--) body = pb.encode([{ field: path[i], wire: 2, value: body }, ...extras]);
  return { body, path, entries };
}

function unwrap(body, path) {
  let fields = pb.decode(body);
  for (const field of path) fields = pb.decode(find(fields, field).value);
  return fields;
}

function map(entries) {
  return new Map(entries.filter(entry => entry.field === 1 && entry.wire === 2).map(entry => {
    const fields = pb.decode(entry.value);
    return [utf8.decode(find(fields, 1).value), { fields, values: pb.decode(find(fields, 2).value) }];
  }));
}

for (const bootstrap of [false, true]) {
  test("Spotify rewrites " + (bootstrap ? "bootstrap" : "customize") + " Premium flags and preserves unrecognized fields", async () => {
    const { body, path, entries } = fixture(bootstrap);
    const url = bootstrap ? "http://gew1-spclient.spotify.com:443/bootstrap/v1/bootstrap?version=1" : "https://spclient.wg.spotify.com/user-customization-service/v1/customize";
    const ctx = response(url, body); ctx.method = "POST";
    ctx.headers.push(["Authorization", "Bearer private-token"]);
    const rt = runtime("spotify");
    await rt.run(ctx);
    const result = unwrap(ctx.body, path), account = map(result);
    assert.equal(utf8.decode(find(account.get("type").values, 4).value), "premium");
    assert.equal(utf8.decode(find(account.get("catalogue").values, 4).value), "premium");
    assert.equal(utf8.decode(find(account.get("player-license").values, 4).value), "premium");
    for (const name of ["ads", "shuffle", "pick-and-shuffle"]) assert.equal(account.get(name).values.find(item => item.field === 2).value, 0n);
    for (const name of ["on-demand", "unrestricted", "high-bitrate", "offline"]) assert.equal(account.get(name).values.find(item => item.field === 2).value, 1n);
    assert.equal(account.get("ads").values.some(item => item.field === 3), false);
    assert.equal(account.get("ads").values.find(item => item.field === 91).value, 987n);
    assert.equal(utf8.decode(find(account.get("type").values, 90).value), "attribute metadata");
    assert.equal(utf8.decode(find(account.get("type").fields, 40).value), "map metadata");
    equalBytes(result.find(entry => entry.field === 1 && utf8.decode(find(pb.decode(entry.value), 1).value) === "custom-untouched").value, entries[2].value);
    const expiry = utf8.decode(find(account.get("subscription-enddate").values, 4).value);
    assert.ok(Date.parse(expiry) > Date.now());
    assert.ok(Date.parse(expiry) < Date.now() + 35 * 24 * 60 * 60 * 1000);
    assert.equal(utf8.decode(find(account.get("product-expiry").values, 4).value), expiry);
    let parent = pb.decode(ctx.body);
    for (const field of path) {
      assert.equal(parent.find(item => item.field === 80).value, 123n);
      assert.equal(utf8.decode(find(parent, 81).value), "preserve");
      parent = pb.decode(find(parent, field).value);
    }
    assert.equal(result.find(item => item.field === 80).value, 123n);
    assert.equal(rt.calls.length, 0);
    assert.equal(rt.logs.length, 0);
  });
}

test("Spotify populates an empty successful map and a second rewrite adds no duplicate keys", async () => {
  const { body, path } = fixture(false, true);
  const ctx = response("https://spclient.wg.spotify.com/user-customization-service/v1/customize", body); ctx.method = "POST";
  const rt = runtime("spotify");
  await rt.run(ctx);
  const first = map(unwrap(ctx.body, path));
  assert.ok(first.size > 30);
  await rt.run(ctx);
  const result = unwrap(ctx.body, path);
  assert.equal(result.filter(item => item.field === 1).length, first.size);
});

test("Spotify retains malformed, error, non-POST, unrelated, request-phase, and non-success bodies", async () => {
  const url = "https://spclient.wg.spotify.com/user-customization-service/v1/customize";
  for (const overrides of [
    { body: Uint8Array.from([255]) },
    { body: pb.encode([nested(2, [str(2, "server error")])]) },
    { body: pb.encode([nested(1, [nested(4, [str(2, "account error")])])]) },
    { method: "GET" }, { phase: "request" }, { status: 304 },
    { url: url + "-extra" },
    { url: url.replace("spclient.wg.spotify.com", "api.spotify.com") },
    { url: url.replace("spclient.wg.spotify.com", "spclient.wg.spotify.com.evil.example") }
  ]) {
    const ctx = { ...response(url, fixture().body), method: "POST", ...overrides };
    const original = ctx.body;
    const rt = runtime("spotify");
    equalBytes((await rt.run(ctx)).body, original);
    assert.equal(rt.calls.length, 0);
    assert.equal(rt.logs.join().includes("server error"), false);
  }
});

test("Spotify artist and album requests switch platform and strip :443 while keeping host and query", () => {
  const rewrites = module.rules.filter(rule => Array.isArray(rule) && rule[1] === 0 && rule[3] === 0);
  const rewrite = url => {
    for (const rule of rewrites) {
      const regex = new RegExp(rule[2]);
      if (regex.test(url)) return url.replace(regex, rule[4]);
    }
    return url;
  };
  for (const scheme of ["http", "https"]) {
    for (const host of ["spclient.wg.spotify.com", "gew1-spclient.spotify.com"]) {
      for (const path of ["artistview/v1/artist/123", "album-entity-view/v2/album/123"]) {
        assert.equal(rewrite(`${scheme}://${host}:443/${path}?foo=1&platform=iphone&bar=2`), `${scheme}://${host}/${path}?foo=1&platform=ipad&bar=2`);
        assert.equal(rewrite(`${scheme}://${host}/${path}?platform=iphone`), `${scheme}://${host}/${path}?platform=ipad`);
        assert.equal(rewrite(`${scheme}://${host}:443/${path}?platform=android`), `${scheme}://${host}/${path}?platform=android`);
      }
    }
  }
  for (const url of ["https://api.spotify.com/artistview/v1/artist/123?platform=iphone", "https://spclient.wg.spotify.com/artistview/v1/artist/123?platform=iphone-extra", "https://spclient.wg.spotify.com/other?platform=iphone", "https://spclient.wg.spotify.com.evil.example/artistview/v1/artist/123?platform=iphone"]) assert.equal(rewrite(url), url);
});

test("Spotify deletes only customization cache validators and rejects only its ad paths", () => {
  const deletion = module.rules.find(rule => Array.isArray(rule) && rule[1] === 2);
  assert.equal(deletion[3], "If-None-Match");
  assert.ok(new RegExp(deletion[2]).test("https://gew1-spclient.spotify.com:443/user-customization-service/v1/customize?version=1"));
  assert.equal(new RegExp(deletion[2]).test("https://spclient.wg.spotify.com/other"), false);
  const reject = module.rules.find(rule => Array.isArray(rule) && rule[1] === 0 && rule[3] === 2);
  const regex = new RegExp(reject[2]);
  for (const path of ["ads/123", "ad-logic/123", "ads"]) assert.ok(regex.test("https://spclient.wg.spotify.com/" + path));
  for (const path of ["ads-extra/123", "bootstrap/v1/bootstrap"]) assert.equal(regex.test("https://spclient.wg.spotify.com/" + path), false);
});

test("Spotify routing helpers import as REJECT and Default and retain the original keyword policy", () => {
  const definitions = JSON.parse(readFileSync(new URL("../routing.json", import.meta.url)));
  assert.equal(definitions.find(item => item.id === "spotify-reject").routing, 2);
  const network = definitions.find(item => item.id === "spotify-network");
  assert.equal(network.routing, 0);
  // A spotify.com suffix would outrank ad-domain keywords in the same tier.
  assert.equal(network.rules.some(([type, value]) => type === 2 && value === "spotify.com"), false);
  assert.ok(network.rules.some(([type, value]) => type === 3 && value === "spotify"));
  for (const definition of definitions) {
    const file = readFileSync(new URL("../routing/" + definition.id + ".arrs", import.meta.url), "utf8");
    for (const [type, value] of definition.rules) assert.ok(file.includes(type + "," + value + "\n"));
  }
});
