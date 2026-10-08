function process(ctx) {
  if (ctx.phase !== "request" || (Anywhere.params.get("applyRewrites") || "true") !== "true") return;
  const match = /^https:\/\/(spclient\.wg\.spotify\.com|[\w.-]+-spclient\.spotify\.com)(?::443)?\/(.*)$/.exec(ctx.url || "");
  if (!match) return;
  const [, host, path] = match;
  if (/^gabo-receiver-service(?:[/?]|$)/.test(path)) {
    Anywhere.respond({ status: 200, headers: [["Cache-Control", "no-cache"]], body: "" });
    return;
  }
  if (/^pendragon(?:[/?]|$)/.test(path) ||
      host !== "spclient.wg.spotify.com" && /^pam-view-service(?:[/?]|$)/.test(path) ||
      path.includes("37i9dQZF1EYkqdzj48dyYq")) {
    Anywhere.respond({ status: 403, headers: [["Content-Type", "text/plain; charset=utf-8"]], body: "Blocked" });
    return;
  }
}
