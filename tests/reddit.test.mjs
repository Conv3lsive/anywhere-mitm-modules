import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { response, runtime, utf8 } from "./runtime.mjs";

const module = JSON.parse(readFileSync(new URL("../modules.json", import.meta.url))).find(item => item.id === "reddit");
const url = "https://gql.reddit.com/";
const encode = value => utf8.encode(JSON.stringify(value));
const bytes = value => Buffer.from(value);

test("Reddit removes nested feed, comment and object ads while retaining ordinary content", async () => {
  const original = {
    data: {
      feed: { edges: [
        { id: "keep", node: { cells: [{ __typename: "PostCell", title: "Normal post" }] } },
        { id: "metadata-ad", node: { cells: [{ __typename: "AdMetadataCell" }] } },
        { id: "flagged-ad", node: { cells: [{ __typename: "PostCell", isAdPost: true }] } },
        { id: "payload-ad", node: { adPayload: { placement: "feed" } } },
        { __typename: "AdPost", id: "direct-ad" }
      ] },
      comments: { commentsPageAds: [{ __typename: "CommentAd", text: "sponsored" }], content: "Keep this comment" },
      slot: { __typename: "AdPost" },
      unrelated: { value: 7, text: "AdPost is just a word here" }
    }
  };
  const rt = runtime("reddit");
  const ctx = await rt.run(response(url, encode(original), "application/json"));
  const result = JSON.parse(utf8.decode(ctx.body));
  assert.deepEqual(result.data.feed.edges, [original.data.feed.edges[0]]);
  assert.deepEqual(result.data.comments, { commentsPageAds: [], content: "Keep this comment" });
  assert.equal(Object.hasOwn(result.data, "slot"), false);
  assert.deepEqual(result.data.unrelated, original.data.unrelated);
  assert.equal(rt.calls.length, 0);
  assert.equal(rt.logs.length, 0);
  assert.deepEqual(rt.directives, ["done"]);
});

test("Reddit NSFW setting is optional and independent of ad removal", async () => {
  const input = { data: { post: { isNsfw: true, isNsfwMediaBlocked: true, isNsfwContentShown: false }, ad: { __typename: "AdPost" } } };
  const enabled = await runtime("reddit").run(response(url, encode(input), "application/json"));
  const result = JSON.parse(utf8.decode(enabled.body));
  assert.deepEqual(result.data.post, { isNsfw: false, isNsfwMediaBlocked: false, isNsfwContentShown: true });
  for (const value of ["false", "FALSE", "0", "off", false, 0]) {
    const rt = runtime("reddit", { disable_nsfw_prompt: value });
    const ctx = await rt.run(response(url, encode(input), "application/json"));
    const output = JSON.parse(utf8.decode(ctx.body));
    assert.deepEqual(output.data.post, input.data.post);
    assert.equal(Object.hasOwn(output.data, "ad"), false);
    assert.equal(rt.calls.length, 0);
  }
});

test("Reddit preserves malformed, unrelated, unchanged, request-phase and excessively nested bodies", async () => {
  let deep = { __typename: "AdPost" };
  for (let i = 0; i < 300; i++) deep = { nested: deep };
  const cases = [
    response(url, utf8.encode("not-json AdPost"), "application/json"),
    response(url, utf8.encode('{"broken":"isNsfw"'), "application/json"),
    response(url, utf8.encode('{ "text": "AdPost is a word", "ordinary": 1 }'), "application/json"),
    response(url, utf8.encode('{ "commentsPageAds": [] }'), "application/json"),
    response(url, encode(deep), "application/json"),
    { ...response(url, encode({ __typename: "AdPost" }), "application/json"), phase: "request" }
  ];
  for (const ctx of cases) {
    const original = bytes(ctx.body), rt = runtime("reddit");
    await rt.run(ctx);
    assert.deepEqual(bytes(ctx.body), original);
    assert.equal(rt.calls.length, 0);
    assert.deepEqual(rt.directives, []);
  }
});

test("Reddit replaces a dropped root with a valid empty object", async () => {
  const rt = runtime("reddit");
  const ctx = await rt.run(response(url, encode({ __typename: "AdPost" }), "application/json"));
  assert.deepEqual(JSON.parse(utf8.decode(ctx.body)), {});
  assert.equal(rt.directives.length, 1);
});

test("Reddit scopes interception to its GraphQL hosts and contains no translation header rules", () => {
  assert.deepEqual(module.hostnames, ["gql.reddit.com", "gql-fed.reddit.com"]);
  assert.equal(module.rules.length, 1);
  assert.equal(module.rules[0].phase, 1);
  const pattern = new RegExp(module.rules[0].pattern);
  for (const matching of ["https://gql.reddit.com/", "https://gql-fed.reddit.com/graphql?operation=test", "https://gql.reddit.com:443/"]) assert.ok(pattern.test(matching));
  for (const unrelated of ["https://www.reddit.com/", "https://gql.reddit.com.evil.example/", "https://api.gql.reddit.com/", "https://gql-fed.reddit.com-extra/"]) assert.equal(pattern.test(unrelated), false);
  assert.equal(module.parameters[0][2], "disable_nsfw_prompt");
  assert.equal(module.parameters[0][5], "true");
  const text = readFileSync(new URL("../modules/reddit.amrs", import.meta.url), "utf8");
  assert.equal(text.includes("x-reddit-translations"), false);
  const script = text.split("\n").find(line => line.startsWith("1,100,"));
  assert.deepEqual(Buffer.from(script.slice(script.lastIndexOf(",") + 1), "base64"), readFileSync(new URL("../scripts/reddit.js", import.meta.url)));
  const icon = text.split("\n").find(line => line.startsWith("icon-light = "));
  assert.deepEqual(Buffer.from(icon.slice("icon-light = ".length), "base64"), readFileSync(new URL("../assets/reddit.png", import.meta.url)));
});
