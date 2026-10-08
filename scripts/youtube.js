// Anywhere response script. The build embeds vendor/youtube-core.js before this file.
function process(ctx) {
  if (ctx.phase !== "response" || ctx.status !== 200 || !ctx.body.length) return;
  if (!/^https:\/\/youtubei\.googleapis\.com\/youtubei\/v1\/(?:browse|next|player|search|reel\/reel_watch_sequence|guide|account\/get_setting|get_watch)(?:\?|$)/.test(ctx.url || "")) return;

  try {
    let cache;
    try {
      cache = JSON.parse(Anywhere.store.getString("youtube-ad-cache-v1") || "null");
    } catch (_) {}
    const keys = ["whiteNo", "blackNo", "whiteEml", "blackEml"];
    if (!cache || !keys.every(key => Array.isArray(cache[key]))) {
      cache = { whiteNo: [], blackNo: [], whiteEml: [], blackEml: ["inline_injection_entrypoint_layout.eml"] };
    }
    cache.dirty = false;
    const flag = (name, fallback) => (Anywhere.params.get(name) || fallback) === "true";
    const result = youtubeTransform({
      url: ctx.url,
      bodyBytes: ctx.body,
      state: { adCache: cache, config: {} },
      params: {
        captionLang: "off",
        blockUpload: flag("blockUpload", "true"),
        blockImmersive: flag("blockImmersive", "true"),
        blockShorts: flag("blockShorts", "false")
      },
      platformKey: "youtube"
    });
    if (result && result.action === "body" && result.bodyBytes) ctx.body = result.bodyBytes;
    if (result && result.changed) {
      const bounded = {};
      for (const key of keys) bounded[key] = cache[key].slice(-512);
      try { Anywhere.store.set("youtube-ad-cache-v1", JSON.stringify(bounded)); } catch (_) {}
    }
  } catch (_) {
    Anywhere.log.warning("YouTube: unsupported response; original body retained.");
  }
}
