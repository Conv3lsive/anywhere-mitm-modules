// Local synthetic responses for the trial module's selected service endpoints.
function process(ctx) {
  if (ctx.phase !== "request" || (Anywhere.params.get("blockServices") || "true") !== "true") return;
  const match = /^https:\/\/(spclient\.wg\.spotify\.com|[\w.-]+-spclient\.spotify\.com)(?::443)?\/(pendragon|pushka-tokens|gabo-receiver-service|ad(?:s|-logic)?|offline)(?:[/?]|$)/.exec(ctx.url || "");
  if (!match) return;
  const [, host, service] = match;
  if ((service === "pushka-tokens" || service.startsWith("ad")) && host !== "spclient.wg.spotify.com") return;
  const empty = service === "pushka-tokens" || service === "gabo-receiver-service" && host !== "spclient.wg.spotify.com";
  Anywhere.respond({ status: 200, headers: [["Content-Type", empty ? "text/plain; charset=utf-8" : "application/json"]], body: empty ? "" : "{}" });
  return;
}
