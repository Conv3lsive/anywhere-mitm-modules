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
  assert.match(elements.message.textContent, /Playback confirmed by a user/);
  const defaults = new URL(page("?module=spotify").open.href).searchParams.getAll("link");
  assert.deepEqual(defaults, ["modules/spotify.amrs", "routing/spotify-reject.arrs", "routing/spotify-network.arrs"].map(path => "https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/85dc221246a0ba7bd9e41c807102b2b9afa29f48/" + path));
});

test("add all carries four MITM modules and two Spotify routing helpers", () => {
  const elements = page("?module=all&ref=" + sha);
  const links = new URL(elements.open.href).searchParams.getAll("link");
  assert.equal(links.length, 6);
  assert.equal(elements.urls.children.length, 6);
  assert.equal(elements.title.textContent, "Add All Four Modules");
  for (const link of links) {
    assert.match(link, new RegExp("^https://raw\\.githubusercontent\\.com/Conv3lsive/anywhere-mitm-modules/" + sha + "/(?:modules/(?:youtube|spotify|soundcloud|reddit)\\.amrs|routing/spotify-(?:reject|network)\\.arrs)$"));
  }
});

test("Reddit imports alone and describes its optional sensitive-content setting", () => {
  const elements = page("?module=reddit&ref=" + sha);
  const links = new URL(elements.open.href).searchParams.getAll("link");
  assert.deepEqual(links, ["https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/" + sha + "/modules/reddit.amrs"]);
  assert.match(elements.message.textContent, /NSFW prompts is on by default/);
  assert.match(elements.message.textContent, /No forced translation/);
  const defaults = new URL(page("?module=reddit").open.href).searchParams.getAll("link");
  assert.deepEqual(defaults, ["https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/85dc221246a0ba7bd9e41c807102b2b9afa29f48/modules/reddit.amrs"]);
});

test("older pinned add-all links keep their three original modules", () => {
  const old = "3c51a7ec2d58d35a6ab1909750e2a4bb39801cd4";
  const elements = page("?module=all&ref=" + old);
  const links = new URL(elements.open.href).searchParams.getAll("link");
  assert.equal(links.length, 5);
  assert.equal(links.some(link => link.endsWith("/modules/reddit.amrs")), false);
  assert.equal(elements.title.textContent, "Add All Three Modules");
});

test("the earlier working snapshot link remains available at its fixed commit", () => {
  const old = "d3fc27488eaa48e91a7ef39a6cf464c142ab72d6";
  const links = new URL(page("?module=spotify-snapshot&ref=" + old).open.href).searchParams.getAll("link");
  assert.equal(links.length, 3);
  assert.deepEqual(links, ["modules/spotify-snapshot.amrs", "routing/spotify-snapshot-ads.arrs", "routing/spotify-network.arrs"].map(path => "https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/" + old + "/" + path));
  assert.equal(page("?module=spotify-snapshot&ref=" + old).title.textContent, "Spotify Premium");
});

test("the import page rejects unknown modules, mutable refs, and injected URLs", () => {
  for (const query of ["?module=spotify-adblock&ref=" + sha, "?module=spotify-lyrics&ref=" + sha, "?module=__proto__&ref=" + sha, "?module=https://evil.example&ref=" + sha, "?module=youtube&ref=main", "?module=youtube&ref=https://evil.example"]) {
    const elements = page(query);
    assert.equal(elements.open.href, undefined);
    assert.equal(elements.open.hidden, true);
    assert.match(elements.message.textContent, /Invalid/);
  }
});
