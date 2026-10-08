// Structural alternative to the reviewed provider's unbounded byte/tag scans.
function process(ctx) {
  const flag = (name, fallback) => (Anywhere.params.get(name) || fallback) === "true";
  if (ctx.phase !== "response" || ctx.status !== 200 || !flag("applyRewrites", "true") || !flag("filterFeedAds", "false")) return;
  const match = /^https:\/\/(?:spclient\.wg\.spotify\.com|[\w.-]+-spclient\.spotify\.com)(?::443)?\/(browsita\/v\d+\/browse|casita\/v\d+\/home\/default|scrollsita\/v\d+\/scroll\/spotify)(?:[/?]|$)/.exec(ctx.url || "");
  if (!match || !ctx.body.length) return;
  const pb = Anywhere.codec.protobuf;
  try {
    const fields = pb.decode(ctx.body);
    const field = match[1].startsWith("browsita/") ? 6 : match[1].startsWith("casita/") ? 21 : 30;
    let offset = 0, removed = false;
    const kept = fields.filter(item => {
      const candidate = !removed && offset < 666 && item.field === field && item.wire === 2 && (field !== 6 || item.value.length > 12000);
      offset += pb.encode([item]).length;
      if (candidate) removed = true;
      return !candidate;
    });
    if (removed) ctx.body = pb.encode(kept);
  } catch (_) {
    Anywhere.log.warning("Spotify Snapshot Trial: unsupported feed; original body retained.");
  }
}
