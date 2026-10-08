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
  const elements = page("?module=spotify-lyrics&ref=" + sha);
  const link = new URL(elements.open.href);
  assert.equal(link.protocol, "anywhere:");
  assert.equal(link.hostname, "add-rule-set");
  assert.deepEqual(link.searchParams.getAll("link"), ["https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/" + sha + "/modules/spotify-lyrics.amrs"]);
  assert.equal(elements.open.hidden, false);
  assert.equal(elements.urls.children.length, 1);
});

test("add all carries three independently importable rule-set URLs", () => {
  const elements = page("?module=all&ref=" + sha);
  const links = new URL(elements.open.href).searchParams.getAll("link");
  assert.equal(links.length, 3);
  assert.equal(elements.urls.children.length, 3);
  for (const link of links) {
    assert.match(link, new RegExp("^https://raw\\.githubusercontent\\.com/Conv3lsive/anywhere-mitm-modules/" + sha + "/modules/(youtube|spotify-lyrics|soundcloud)\\.amrs$"));
  }
});

test("the import page rejects unknown modules, mutable refs, and injected URLs", () => {
  for (const query of ["?module=__proto__&ref=" + sha, "?module=https://evil.example&ref=" + sha, "?module=youtube&ref=main", "?module=youtube&ref=https://evil.example"]) {
    const elements = page(query);
    assert.equal(elements.open.href, undefined);
    assert.equal(elements.open.hidden, true);
    assert.match(elements.message.textContent, /Invalid/);
  }
});
