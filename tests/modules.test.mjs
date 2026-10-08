import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { nested, protobuf as pb, response, runtime, utf8 } from "./runtime.mjs";

const find = (entries, field) => entries.find(entry => entry.field === field);
const equalBytes = (a, b) => assert.deepEqual(Buffer.from(a), Buffer.from(b));

test("YouTube removes binary ad placements, enables playback flags, and preserves unknown fields", async () => {
  const original = pb.encode([
    nested(7, []), nested(68, []), nested(2, [{ field: 1, wire: 0, value: 0n }]),
    { field: 300, wire: 0, value: 88n }
  ]);
  const rt = runtime("youtube");
  const ctx = await rt.run(response("https://youtubei.googleapis.com/youtubei/v1/player?key=example", original));
  const result = pb.decode(ctx.body);
  assert.equal(find(result, 7), undefined);
  assert.equal(find(result, 68), undefined);
  assert.equal(find(result, 300).value, 88n);
  const playability = pb.decode(find(result, 2).value);
  assert.equal(find(playability, 1).value, 0n);
  assert.ok(find(playability, 11));
  assert.ok(find(playability, 21));
  assert.equal(rt.calls.length, 0);
});

test("YouTube keeps malformed, unrelated, and non-success responses unchanged", async () => {
  const rt = runtime("youtube");
  for (const [url, status] of [["https://youtubei.googleapis.com/youtubei/v1/player", 200], ["https://youtubei.googleapis.com/youtubei/v1/player_extra", 200], ["https://youtubei.googleapis.com/youtubei/v1/player", 403]]) {
    const original = Uint8Array.from([255, 255, 255]);
    const ctx = response(url, original); ctx.status = status;
    equalBytes((await rt.run(ctx)).body, original);
  }
});

test("YouTube CDN redirect retains host, path and other query values; redirectors are excluded", () => {
  const definition = JSON.parse(readFileSync(new URL("../modules.json", import.meta.url))).find(module => module.id === "youtube");
  const rule = definition.rules[0];
  const pattern = new RegExp(rule[2]);
  const url = "https://rr1---sn.example.googlevideo.com/initplayback?a=1&ctier=L&b=2,ctier,tail";
  // The input source targets single-label CDN hosts.
  assert.equal(pattern.test(url), false);
  const valid = "https://rr1---sn-abc.googlevideo.com/initplayback?a=1&ctier=L&b=2,ctier,tail";
  assert.equal(valid.replace(pattern, rule[4]), "https://rr1---sn-abc.googlevideo.com/initplayback?a=1&b=2tail");
  assert.equal(pattern.test(valid.replace("rr1---sn-abc", "redirector123")), false);
  for (const other of definition.rules.filter(Array.isArray)) {
    assert.equal(new RegExp(other[2]).test("https://api-mobile.soundcloud.com/configuration/ios"), false);
  }
});

test("SoundCloud sets configuration flags, retains other data, and does not fetch anything", async () => {
  const source = { plan: { id: "free" }, features: [], unrelated: { keep: true } };
  const rt = runtime("soundcloud");
  const ctx = await rt.run(response("https://api-mobile.soundcloud.com/configuration/ios?version=1", utf8.encode(JSON.stringify(source)), "application/json"));
  const result = JSON.parse(utf8.decode(ctx.body));
  assert.equal(result.plan.plan_id, "go-plus");
  assert.deepEqual(result.unrelated, source.unrelated);
  assert.equal(result.features.find(item => item.name === "no_audio_ads").enabled, true);
  assert.equal(result.features.find(item => item.name === "ads_krux").enabled, false);
  assert.equal(rt.calls.length, 0);
});

test("SoundCloud malformed and unrelated responses stay unchanged", async () => {
  const rt = runtime("soundcloud");
  for (const url of ["https://api-mobile.soundcloud.com/configuration/ios", "https://api-mobile.soundcloud.com/configuration/ios-extra"]) {
    const original = utf8.encode("not-json");
    equalBytes((await rt.run(response(url, original))).body, original);
  }
});
