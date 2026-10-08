// Independent native implementation of the reviewed Spotify_remove_ads behavior.
// Reference: 001ProMax / kelee.one; see THIRD_PARTY_NOTICES.md and provenance.json.
function process(ctx) {
  if (ctx.phase !== "response" || ctx.status !== 200 || ctx.method !== "POST") return;
  const match = /^https:\/\/(?:spclient\.wg\.spotify\.com|[\w.-]+-spclient\.spotify\.com)(?::443)?\/(bootstrap\/v1\/bootstrap|user-customization-service\/v1\/customize)(?:\?|$)/.exec(ctx.url || "");
  if (!match || !ctx.body.length) return;
  const pb = Anywhere.codec.protobuf, utf8 = Anywhere.codec.utf8;
  const string = (field, value) => ({ field, wire: 2, value: utf8.encode(value) });
  const nested = (field, entries) => ({ field, wire: 2, value: pb.encode(entries) });
  const find = (entries, field) => entries.find(item => item.field === field && item.wire === 2);
  const flag = (name, fallback) => (Anywhere.params.get(name) || fallback) === "true";
  // Rebuild only known wrappers; untouched bytes and unknown fields survive.
  function updateAt(fields, path, transform) {
    if (!path.length) { transform(fields); return true; }
    const entry = find(fields, path[0]);
    if (!entry) return false;
    const child = pb.decode(entry.value);
    if (!updateAt(child, path.slice(1), transform)) return false;
    entry.value = pb.encode(child);
    return true;
  }
  function replaceValue(fields, valueField) {
    const retained = fields.filter(item => !(
      (item.field === 2 || item.field === 3) && item.wire === 0 || item.field === 4 && item.wire === 2
    ));
    return pb.encode([...retained, valueField]);
  }
  try {
    const attributes = {
      ads: false,
      "com.spotify.madprops.use.ucs.product.state": true,
      "nft-disabled": "1",
      offline: true,
      "player-license": "premium",
      "streaming-rules": "",
      type: "premium",
      "publish-playlist": false,
      name: "Spotify Premium",
      "financial-product": "pr:premium,tc:0"
    };
    const value = item => typeof item === "boolean"
      ? { field: 2, wire: 0, value: item ? 1n : 0n } : string(4, item);
    const top = pb.decode(ctx.body);
    const success = match[1] === "bootstrap/v1/bootstrap" ? [2, 1, 1, 1] : [1];
    if (!updateAt(top, [...success, 3], fields => {
      const seen = new Set();
      for (const entry of fields) {
        if (entry.field !== 1 || entry.wire !== 2) continue;
        const map = pb.decode(entry.value), key = find(map, 1);
        if (!key) continue;
        const name = utf8.decode(key.value);
        if (!Object.prototype.hasOwnProperty.call(attributes, name)) continue;
        const current = find(map, 2);
        const bytes = replaceValue(current ? pb.decode(current.value) : [], value(attributes[name]));
        if (current) current.value = bytes;
        else map.push({ field: 2, wire: 2, value: bytes });
        entry.value = pb.encode(map);
        seen.add(name);
      }
      for (const [name, item] of Object.entries(attributes)) {
        if (!seen.has(name)) fields.push(nested(1, [string(1, name), nested(2, [value(item)])]));
      }
    })) return;
    // Optional UI configuration is edited only when the existing fields exist.
    updateAt(top, [...success, 1, 1], configuration => {
      for (const assigned of configuration) {
        if (assigned.field !== 3 || assigned.wire !== 2) continue;
        const fields = pb.decode(assigned.value), property = find(fields, 1);
        if (!property) continue;
        const keys = pb.decode(property.value), scope = find(keys, 1), name = find(keys, 2);
        if (!scope || !name) continue;
        const s = utf8.decode(scope.value), n = utf8.decode(name.value);
        let field;
        if (s === "ios-system-your-plan-sidedrawer" && n === "is_row_enabled" ||
            s === "ios-feature-share" && n === "is_useractivity_sharing_enabled" && !flag("useractivity", "true")) {
          field = find(fields, 3);
          if (field) {
            const inner = pb.decode(field.value), existing = inner.find(item => item.field === 1 && item.wire === 0);
            if (existing) { existing.value = 0n; field.value = pb.encode(inner); }
          }
        } else if (s === "ios-feature-navigation" && n === "tab_configuration" && flag("tab", "false")) {
          field = find(fields, 5);
          if (field) {
            const inner = pb.decode(field.value), existing = find(inner, 1);
            if (existing) { existing.value = utf8.encode(""); field.value = pb.encode(inner); }
          }
        }
        if (field) assigned.value = pb.encode(fields);
      }
    });
    ctx.body = pb.encode(top);
  } catch (_) {
    Anywhere.log.warning("Spotify Ad Block Trial: unsupported response; original body retained.");
  }
}
