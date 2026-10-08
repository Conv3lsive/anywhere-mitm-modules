// Local configuration changes for SoundCloud's iOS API.
function process(ctx) {
  if (ctx.phase !== "response" || ctx.status !== 200) return;
  if (!/^https:\/\/api-mobile\.soundcloud\.com\/configuration\/ios(?:\?|$)/.test(ctx.url || "")) return;
  try {
    const data = JSON.parse(Anywhere.codec.utf8.decode(ctx.body));
    if (!data || typeof data !== "object" || Array.isArray(data)) return;
    data.plan = {
      vendor: "apple", id: "high_tier", manageable: true, plan_upsells: [],
      plan_id: "go-plus", upsells: [], plan_name: "SoundCloud Go+"
    };
    data.features = [
      { name: "offline_sync", enabled: true, plans: ["mid_tier", "high_tier"] },
      { name: "no_audio_ads", enabled: true, plans: ["mid_tier", "high_tier"] },
      { name: "hq_audio", enabled: true, plans: ["high_tier"] },
      { name: "system_playlist_in_library", enabled: true, plans: [] },
      { name: "ads_krux", enabled: false, plans: [] },
      { name: "new_home", enabled: true, plans: [] },
      { name: "spotlight", enabled: false, plans: [] }
    ];
    ctx.body = Anywhere.codec.utf8.encode(JSON.stringify(data));
  } catch (_) {
    Anywhere.log.warning("SoundCloud: unsupported response; original body retained.");
  }
}
