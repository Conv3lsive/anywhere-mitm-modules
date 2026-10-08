// Spotify account-attribute rewrites using Anywhere's native protobuf codec.
// Behavior and wire schema: app2smile/rules (MIT), see THIRD_PARTY_NOTICES.md.
function process(ctx) {
  if (ctx.phase !== "response" || ctx.status !== 200 || ctx.method !== "POST") return;
  const match = /^https?:\/\/(?:spclient\.wg\.spotify\.com|[\w.-]+-spclient\.spotify\.com)(?::443)?\/(bootstrap\/v1\/bootstrap|user-customization-service\/v1\/customize)(?:\?|$)/.exec(ctx.url || "");
  if (!match || !ctx.body.length) return;

  const pb = Anywhere.codec.protobuf;
  const utf8 = Anywhere.codec.utf8;
  const stringField = (field, value) => ({ field, wire: 2, value: utf8.encode(value) });
  try {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);
    const endDate = expiry.toISOString().split(".")[0] + "Z";
    const attributes = {
      "smart-shuffle": "AVAILABLE",
      "is-euterpe": true,
      "has-audiobooks-subscription": true,
      "type": "premium",
      "payments-initial-campaign": "prepaid",
      "subscription-enddate": endDate,
      "social-session-free-tier": false,
      "can_use_superbird": true,
      "jam-social-session": "EXPANDED",
      "offline": true,
      "audio-quality": "1",
      "shuffle-algorithm": "RANDOM",
      "is-thalia": true,
      "shuffle": false,
      "is-pigeon": true,
      "nft-disabled": "1",
      "libspotify": true,
      "high-bitrate": true,
      "unrestricted": true,
      "catalogue": "premium",
      "your-library-tags": true,
      "ads": false,
      "on-demand": true,
      "name": "Spotify Premium",
      "loudness-levels": "1:-5.0,0.0,3.0:-2.0",
      "product-expiry": endDate,
      "social-session": true,
      "pick-and-shuffle": false,
      "offline-backup": "UNRESTRICTED",
      "lyrics-offline": true,
      "financial-product": "pr:premium,tc:0",
      "streaming-rules": "",
      "mixing-tools": "EDIT",
      "mobile": true,
      "player-license": "premium",
      "com.spotify.madprops.use.ucs.product.state": true,
      "com.spotify.madprops.delivered.by.ucs": true
    };
    const attributeValue = value => typeof value === "boolean"
      ? { field: 2, wire: 0, value: value ? 1n : 0n }
      : stringField(4, value);

    // Follow only known successful wrappers; do not manufacture success on errors.
    const path = match[1] === "bootstrap/v1/bootstrap" ? [2, 1, 1, 1, 3] : [1, 3];
    const top = pb.decode(ctx.body);
    let current = top;
    const parents = [];
    for (const field of path) {
      const entry = current.find(item => item.field === field && item.wire === 2);
      if (!entry) return;
      parents.push({ entry, parent: current });
      current = pb.decode(entry.value);
    }
    const seen = new Set();
    for (const entry of current) {
      if (entry.field !== 1 || entry.wire !== 2) continue;
      const mapEntry = pb.decode(entry.value);
      const key = mapEntry.find(item => item.field === 1 && item.wire === 2);
      if (!key) continue;
      const name = utf8.decode(key.value);
      if (!Object.prototype.hasOwnProperty.call(attributes, name)) continue;
      let valueEntry = mapEntry.find(item => item.field === 2 && item.wire === 2);
      const valueFields = valueEntry ? pb.decode(valueEntry.value) : [];
      // Replace the value oneof while keeping unrecognized map/value metadata.
      const preserved = valueFields.filter(item => !(
        (item.field === 2 || item.field === 3) && item.wire === 0 || item.field === 4 && item.wire === 2
      ));
      const value = pb.encode([...preserved, attributeValue(attributes[name])]);
      if (valueEntry) valueEntry.value = value;
      else mapEntry.push({ field: 2, wire: 2, value });
      entry.value = pb.encode(mapEntry);
      seen.add(name);
    }
    for (const [name, value] of Object.entries(attributes)) {
      if (seen.has(name)) continue;
      const mapEntry = pb.encode([stringField(1, name), { field: 2, wire: 2, value: pb.encode([attributeValue(value)]) }]);
      current.push({ field: 1, wire: 2, value: mapEntry });
    }
    for (let i = parents.length - 1; i >= 0; i--) {
      parents[i].entry.value = pb.encode(current);
      current = parents[i].parent;
    }
    ctx.body = pb.encode(top);
  } catch (_) {
    Anywhere.log.warning("Spotify Premium: unsupported response; original body retained.");
  }
}
