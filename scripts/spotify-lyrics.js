// Spotify Color Lyrics → Baidu Translate. Credentials stay in Anywhere parameters.
async function process(ctx) {
  if (ctx.phase !== "response" || ctx.status !== 200) return;
  if (!/^https:\/\/spclient\.wg\.spotify\.com\/color-lyrics\/v2\/track\/[^/?]+(?:\?|$)/.test(ctx.url || "")) return;
  if (Anywhere.params.get("translationEnabled") !== "true") return;
  const appid = (Anywhere.params.get("appid") || "").trim();
  const securityKey = (Anywhere.params.get("securityKey") || "").trim();
  const target = Anywhere.params.get("targetLanguage") || "zh";
  if (!/^\d+$/.test(appid) || !securityKey || !["zh", "en", "ru", "de", "fr", "spa", "jp", "kor"].includes(target)) return;

  const pb = Anywhere.codec.protobuf;
  const utf8 = Anywhere.codec.utf8;
  const field = (items, no) => items.find(item => item.field === no && item.wire === 2);
  const text = (items, no) => { const item = field(items, no); return item ? utf8.decode(item.value) : ""; };
  const stringField = (no, value) => ({ field: no, wire: 2, value: utf8.encode(value) });
  try {
    const contentType = (ctx.headers || []).find(([name]) => name.toLowerCase() === "content-type");
    const isJSON = Boolean(contentType && /json/i.test(contentType[1]));
    let data, top, lyricsField, lyrics, lines, language;
    if (isJSON) {
      data = JSON.parse(utf8.decode(ctx.body));
      if (!data || !data.lyrics || !Array.isArray(data.lyrics.lines)) return;
      lines = data.lyrics.lines.map(line => typeof line.words === "string" ? line.words : "");
      language = data.lyrics.language;
    } else {
      top = pb.decode(ctx.body);
      lyricsField = field(top, 1);
      if (!lyricsField) return;
      lyrics = pb.decode(lyricsField.value);
      language = text(lyrics, 10);
      lines = lyrics.filter(item => item.field === 2 && item.wire === 2)
        .map(item => text(pb.decode(item.value), 2));
    }
    if (!language || typeof language !== "string") return;
    const equivalent = { z1: "zh", "zh-Hans": "zh", "zh-Hant": "zh", es: "spa", ja: "jp", ko: "kor" };
    if ((equivalent[language] || language) === target) return;
    const query = Array.from(new Set(lines.filter(line => line.trim() && line.trim() !== "♪"))).join("\n");
    // Bound the request and all local work; API plan limits may be lower.
    if (!query || utf8.encode(query).length > 5000 || lines.length > 1000) return;
    const salt = Anywhere.codec.hex.encode(Anywhere.crypto.randomBytes(16));
    const sign = Anywhere.codec.hex.encode(Anywhere.crypto.md5(appid + query + salt + securityKey));
    const values = { q: query, from: "auto", to: target, appid, salt, sign };
    const body = Object.entries(values).map(([key, value]) => key + "=" + encodeURIComponent(value)).join("&");
    const response = await Anywhere.http.post("https://fanyi-api.baidu.com/api/trans/vip/translate", {
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body, timeout: 10000, redirect: "manual", insecure: false
    });
    if (response.status !== 200) {
      Anywhere.log.warning("Spotify Lyrics: translation service returned HTTP " + response.status + ".");
      return;
    }
    const translated = JSON.parse(utf8.decode(response.body));
    if ((translated.error_code && String(translated.error_code) !== "52000") || !Array.isArray(translated.trans_result)) {
      Anywhere.log.warning("Spotify Lyrics: translation unavailable; check API settings and quota.");
      return;
    }
    const mapping = new Map(translated.trans_result.filter(item => typeof item.src === "string" && typeof item.dst === "string")
      .map(item => [item.src, item.dst]));
    if (!mapping.size) return;
    const translatedLines = lines.map(line => mapping.get(line) || line || "");
    const alternativeLanguage = { zh: "z1", spa: "es", jp: "ja", kor: "ko" }[target] || target;
    if (isJSON) {
      const alternatives = Array.isArray(data.lyrics.alternatives) ? data.lyrics.alternatives : [];
      data.lyrics.alternatives = alternatives.filter(item => item.language !== alternativeLanguage);
      data.lyrics.alternatives.push({ language: alternativeLanguage, lines: translatedLines });
      ctx.body = utf8.encode(JSON.stringify(data));
    } else {
      const alternative = pb.encode([stringField(1, alternativeLanguage), ...translatedLines.map(line => stringField(2, line))]);
      const updated = lyrics.filter(item => item.field !== 9 || item.wire !== 2 || text(pb.decode(item.value), 1) !== alternativeLanguage);
      updated.push({ field: 9, wire: 2, value: alternative });
      // Preserve the original lines, timing, and every unknown protobuf field.
      lyricsField.value = pb.encode(updated);
      ctx.body = pb.encode(top);
    }
  } catch (_) {
    Anywhere.log.warning("Spotify Lyrics: translation failed; original body retained.");
  }
}
