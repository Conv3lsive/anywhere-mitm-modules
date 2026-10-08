// Independent implementation of the reviewed Amlabort account/snapshot behavior.
// Static data is embedded at build time; see provenance.json and THIRD_PARTY_NOTICES.md.
function process(ctx) {
  const flag = (name, fallback) => (Anywhere.params.get(name) || fallback) === "true";
  if (ctx.phase !== "response" || ctx.status !== 200 || ctx.method !== "POST" || !flag("applyRewrites", "true")) return;
  const match = /^https:\/\/(?:spclient\.wg\.spotify\.com|[\w.-]+-spclient\.spotify\.com)(?::443)?\/(bootstrap\/v1\/bootstrap|user-customization-service\/v1\/customize)(?:\?|$)/.exec(ctx.url || "");
  if (!match || !ctx.body.length) return;
  const pb = Anywhere.codec.protobuf, utf8 = Anywhere.codec.utf8;
  const str = (field, value) => ({ field, wire: 2, value: utf8.encode(String(value)) });
  const msg = (field, fields) => ({ field, wire: 2, value: pb.encode(fields) });
  const integer = (field, value) => ({ field, wire: 0, value: BigInt.asUintN(64, BigInt(value)) });
  const find = (fields, field) => fields.find(item => item.field === field && item.wire === 2);
  function updateAt(fields, path, transform) {
    if (!path.length) { transform(fields); return true; }
    const entry = find(fields, path[0]);
    if (!entry) return false;
    const nested = pb.decode(entry.value);
    if (!updateAt(nested, path.slice(1), transform)) return false;
    entry.value = pb.encode(nested);
    return true;
  }
  function assignment(item) {
    const fields = [msg(1, [str(1, item.propertyId.scope), str(2, item.propertyId.name)])];
    if (item.metadata) {
      const metadata = [];
      if (item.metadata.policyId !== undefined) metadata.push(integer(1, item.metadata.policyId));
      if (item.metadata.externalRealm !== undefined) metadata.push(str(2, item.metadata.externalRealm));
      if (item.metadata.externalRealmId !== undefined) metadata.push(integer(3, item.metadata.externalRealmId));
      fields.push(msg(2, metadata));
    }
    for (const [name, field] of [["boolValue", 3], ["intValue", 4], ["enumValue", 5]]) {
      if (item[name] === undefined) continue;
      const value = item[name].value;
      const inner = value === undefined ? [] : [field === 5 ? str(1, value) : integer(1, field === 3 ? Number(value) : value)];
      fields.push(msg(field, inner));
    }
    return msg(3, fields);
  }
  try {
    const expiry = new Date();
    expiry.setUTCFullYear(expiry.getUTCFullYear() + 1);
    const endDate = expiry.toISOString();
    const attributes = {
      ads: false,
      "ab-ad-player-targeting": "0",
      "allow-advertising-id-transmission": false,
      "restrict-advertising-id-transmission": true,
      can_use_superbird: true,
      catalogue: "premium",
      "financial-product": "pr:premium,tc:0",
      "is-eligible-premium-unboxing": true,
      name: "Spotify Premium",
      "nft-disabled": "1",
      offline: true,
      "on-demand": true,
      "payments-initial-campaign": "default",
      "player-license": "premium",
      "player-license-v2": "premium",
      "product-expiry": endDate,
      "shuffle-eligible": true,
      "social-session": true,
      "social-session-free-tier": false,
      "streaming-rules": "",
      "subscription-enddate": endDate,
      type: "premium",
      unrestricted: true
    };
    const removals = new Set(["ad-use-adlogic", "ad-catalogues", "shuffle", "payment-state", "last-premium-activation-date", "on-demand-trial", "on-demand-trial-in-progress", "smart-shuffle", "at-signal", "feature-set-id-masked", "strider-key", "is-eligible-for-trial", "is-eligible-for-upsell", "upsell-state", "ad-session-persistence", "ad-formats-preroll-video", "is-premium-eligible"]);
    for (let i = 1; i <= 100; i++) removals.add("is-premium-eligible-v" + i);
    const value = item => typeof item === "boolean" ? integer(2, Number(item)) : str(4, item);
    let top = pb.decode(ctx.body);
    const bootstrap = match[1] === "bootstrap/v1/bootstrap";
    const success = bootstrap ? [2, 1, 1, 1] : [1];
    if (!updateAt(top, [...success, 3], fields => {
      const output = [], seen = new Set();
      for (const entry of fields) {
        if (entry.field !== 1 || entry.wire !== 2) { output.push(entry); continue; }
        const map = pb.decode(entry.value), key = find(map, 1);
        if (!key) { output.push(entry); continue; }
        const name = utf8.decode(key.value);
        if (removals.has(name)) continue;
        if (Object.prototype.hasOwnProperty.call(attributes, name)) {
          const current = find(map, 2);
          const inner = current ? pb.decode(current.value) : [];
          const kept = inner.filter(item => !((item.field === 2 || item.field === 3) && item.wire === 0 || item.field === 4 && item.wire === 2));
          const bytes = pb.encode([...kept, value(attributes[name])]);
          if (current) current.value = bytes;
          else map.push({ field: 2, wire: 2, value: bytes });
          entry.value = pb.encode(map);
          seen.add(name);
        }
        output.push(entry);
      }
      for (const [name, item] of Object.entries(attributes)) {
        if (!seen.has(name)) output.push(msg(1, [str(1, name), msg(2, [value(item)])]));
      }
      fields.splice(0, fields.length, ...output);
    })) return;
    if (flag("replaceConfiguration", "true")) {
      const blacklist = new Set(AML_CONFIG_DATA.blacklist);
      const snapshot = AML_CONFIG_DATA.assignments.filter(item => !blacklist.has(item.propertyId.scope + "::" + item.propertyId.name)).map(assignment);
      if (!updateAt(top, [...success, 1, 1], fields => {
        const otherFields = fields.filter(item => !(item.field === 3 && item.wire === 2));
        fields.splice(0, fields.length, ...otherFields, ...snapshot);
      })) return;
    }
    if (bootstrap) top = top.filter(item => !(item.field === 3 && item.wire === 2));
    ctx.body = pb.encode(top);
  } catch (_) {
    Anywhere.log.warning("Spotify Snapshot Trial: unsupported response; original body retained.");
  }
}
