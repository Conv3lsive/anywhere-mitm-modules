import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const html = readFileSync(new URL("../docs/import.html", import.meta.url), "utf8");
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const sha = "a".repeat(40);

function page(search) {
  const element = () => ({ hidden: true, children: [], append(...items) { this.children.push(...items); } });
  const elements = Object.fromEntries(["open", "title", "message", "urls"].map(id => [id, element()]));
  vm.runInNewContext(source, {
    URLSearchParams,
    location: { search },
    document: { getElementById: id => elements[id], createElement: element }
  }, { timeout: 1000 });
  return elements;
}

test("quick add creates the documented Anywhere deep link for a pinned module", () => {
  const elements = page("?module=spotify&ref=" + sha);
  const link = new URL(elements.open.href);
  assert.equal(link.protocol, "anywhere:");
  assert.equal(link.hostname, "add-rule-set");
  assert.deepEqual(link.searchParams.getAll("link"), ["modules/spotify.amrs", "routing/spotify-reject.arrs", "routing/spotify-network.arrs"].map(path => "https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/" + sha + "/" + path));
  assert.equal(elements.open.hidden, false);
  assert.equal(elements.urls.children.length, 3);
  assert.match(elements.message.textContent, /select your proxy/);
});

test("add all carries three MITM modules and two Spotify routing helpers", () => {
  const elements = page("?module=all&ref=" + sha);
  const links = new URL(elements.open.href).searchParams.getAll("link");
  assert.equal(links.length, 5);
  assert.equal(elements.urls.children.length, 5);
  for (const link of links) {
    assert.match(link, new RegExp("^https://raw\\.githubusercontent\\.com/Conv3lsive/anywhere-mitm-modules/" + sha + "/(?:modules/(?:youtube|spotify|soundcloud)\\.amrs|routing/spotify-(?:reject|network)\\.arrs)$"));
  }
});

test("the Spotify trial imports separately with only its network routing helper", () => {
  const elements = page("?module=spotify-adblock&ref=" + sha);
  const links = new URL(elements.open.href).searchParams.getAll("link");
  assert.deepEqual(links, ["modules/spotify-adblock.amrs", "routing/spotify-network.arrs"].map(path => "https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/" + sha + "/" + path));
  assert.match(elements.message.textContent, /Disable Spotify Premium/);
  const defaultLinks = new URL(page("?module=spotify-adblock").open.href).searchParams.getAll("link");
  assert.ok(defaultLinks.every(link => link.includes("/9dc12435a05ea2b4d2d9d28fe435a2304638aa15/")));
});

test("the Spotify snapshot trial imports separately with its own ad and network sets", () => {
  const elements = page("?module=spotify-snapshot&ref=" + sha);
  const links = new URL(elements.open.href).searchParams.getAll("link");
  assert.deepEqual(links, ["modules/spotify-snapshot.amrs", "routing/spotify-snapshot-ads.arrs", "routing/spotify-network.arrs"].map(path => "https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/" + sha + "/" + path));
  assert.match(elements.message.textContent, /Disable other Spotify/);
  assert.match(elements.message.textContent, /unverified/);
});

test("earlier pinned links keep importing the original three modules", () => {
  const old = "ffa77ba7eb57701a16b79beb1d6c4393610ae7fe";
  const links = new URL(page("?module=all&ref=" + old).open.href).searchParams.getAll("link");
  assert.equal(links.length, 3);
  assert.ok(links.some(link => link.endsWith("/modules/spotify-lyrics.amrs")));
  assert.equal(new URL(page("?module=spotify-lyrics&ref=" + old).open.href).searchParams.getAll("link").length, 1);
});

test("the import page rejects unknown modules, mutable refs, and injected URLs", () => {
  for (const query of ["?module=__proto__&ref=" + sha, "?module=https://evil.example&ref=" + sha, "?module=youtube&ref=main", "?module=youtube&ref=https://evil.example"]) {
    const elements = page(query);
    assert.equal(elements.open.href, undefined);
    assert.equal(elements.open.hidden, true);
    assert.match(elements.message.textContent, /Invalid/);
  }
});
