import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { nested, protobuf as pb, response, runtime, str, utf8 } from "./runtime.mjs";

const spotifyURL = "https://spclient.wg.spotify.com/color-lyrics/v2/track/123?format=protobuf";
const credentials = { translationEnabled: "true", appid: "123456", securityKey: "private-signing-key", targetLanguage: "ru" };
const baidu = result => ({ status: 200, body: utf8.encode(JSON.stringify({ trans_result: result })) });
const find = (entries, field) => entries.find(entry => entry.field === field);
const equalBytes = (a, b) => assert.deepEqual(Buffer.from(a), Buffer.from(b));

function lyricsFixture(language = "en") {
  return pb.encode([
    nested(1, [
      nested(2, [str(1, "1000"), str(2, "Hello"), { field: 3, wire: 0, value: 17n }]),
      nested(2, [str(1, "2000"), str(2, "♪")]),
      nested(2, [str(1, "3000"), str(2, "Hello")]),
      nested(9, [str(1, "es"), str(2, "Hola")]),
      str(10, language), { field: 99, wire: 0, value: 42n }
    ]),
    { field: 22, wire: 5, value: Uint8Array.from([1, 2, 3, 4]) }
  ]);
}

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

test("Spotify protobuf translation preserves timing and unknown fields and sends only the documented payload", async () => {
  const original = lyricsFixture();
  const rt = runtime("spotify-lyrics", credentials, () => baidu([{ src: "Hello", dst: "Привет" }]));
  const ctx = response(spotifyURL, original);
  ctx.headers.push(["Authorization", "Bearer spotify-secret"], ["Cookie", "secret-cookie"]);
  await rt.run(ctx);
  assert.equal(rt.calls.length, 1);
  const { url, options } = rt.calls[0];
  assert.equal(url, "https://fanyi-api.baidu.com/api/trans/vip/translate");
  assert.equal(options.redirect, "manual"); assert.equal(options.insecure, false);
  assert.equal(Object.keys(options.headers).join(), "Content-Type");
  const form = new URLSearchParams(options.body);
  assert.equal(form.get("q"), "Hello"); assert.equal(form.get("to"), "ru");
  assert.match(form.get("sign"), /^[a-f0-9]{32}$/);
  for (const secret of [credentials.securityKey, "spotify-secret", "secret-cookie"]) assert.equal(options.body.includes(secret), false);
  const top = pb.decode(ctx.body), lyrics = pb.decode(find(top, 1).value);
  equalBytes(find(top, 22).value, Uint8Array.from([1, 2, 3, 4]));
  assert.equal(find(lyrics, 99).value, 42n);
  const before = pb.decode(find(pb.decode(original), 1).value).filter(item => item.field === 2);
  const after = lyrics.filter(item => item.field === 2);
  before.forEach((entry, i) => equalBytes(entry.value, after[i].value));
  const alternatives = lyrics.filter(item => item.field === 9).map(item => pb.decode(item.value));
  assert.equal(utf8.decode(find(alternatives[0], 1).value), "es");
  assert.equal(utf8.decode(find(alternatives[1], 1).value), "ru");
  assert.deepEqual(alternatives[1].filter(item => item.field === 2).map(item => utf8.decode(item.value)), ["Привет", "♪", "Привет"]);
  assert.equal(rt.logs.length, 0);
});

test("Spotify JSON translation replaces only its target alternative and keeps original timing", async () => {
  const source = { lyrics: { language: "en", lines: [{ startTimeMs: "1000", words: "Hello" }], alternatives: [{ language: "ru", lines: ["Old"] }, { language: "de", lines: ["Hallo"] }], extra: true }, metadata: { keep: 1 } };
  const rt = runtime("spotify-lyrics", credentials, () => baidu([{ src: "Hello", dst: "Привет" }]));
  const ctx = await rt.run(response(spotifyURL, utf8.encode(JSON.stringify(source)), "application/json"));
  const result = JSON.parse(utf8.decode(ctx.body));
  assert.deepEqual(result.lyrics.lines, source.lyrics.lines);
  assert.deepEqual(result.metadata, source.metadata);
  assert.deepEqual(result.lyrics.alternatives, [{ language: "de", lines: ["Hallo"] }, { language: "ru", lines: ["Привет"] }]);
});

test("Spotify makes no network request before opt-in, without keys, for same-language lyrics, or for unrelated traffic", async () => {
  for (const [params, url, body] of [
    [{}, spotifyURL, lyricsFixture()],
    [{ ...credentials, translationEnabled: "false" }, spotifyURL, lyricsFixture()],
    [{ ...credentials, securityKey: "" }, spotifyURL, lyricsFixture()],
    [credentials, spotifyURL, lyricsFixture("ru")],
    [credentials, "https://spclient.wg.spotify.com/account", lyricsFixture()],
    [credentials, spotifyURL, Uint8Array.from([255])]
  ]) {
    const rt = runtime("spotify-lyrics", params);
    equalBytes((await rt.run(response(url, body))).body, body);
    assert.equal(rt.calls.length, 0);
  }
});

test("Spotify leaves original bytes on transport, quota, JSON, and redirect errors without logging secrets", async () => {
  for (const handler of [
    () => { throw Error("private-signing-key"); },
    () => ({ status: 302, body: utf8.encode("redirect") }),
    () => ({ status: 200, body: utf8.encode("not-json") }),
    () => ({ status: 200, body: utf8.encode('{"error_code":"54003"}') })
  ]) {
    const original = lyricsFixture();
    const rt = runtime("spotify-lyrics", credentials, handler);
    equalBytes((await rt.run(response(spotifyURL, original))).body, original);
    assert.equal(rt.logs.join().includes(credentials.securityKey), false);
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
