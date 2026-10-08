# Code review and data flows

Reviewed on **2026-10-08**. This is a static review with synthetic response
tests, not a guarantee of safety or a live compatibility test of the target apps.

## Published modules

| Module | Extra network requests | Data stored by its script |
| --- | --- | --- |
| YouTube | None. A matching CDN request may receive a redirect within `googlevideo.com`. | Bounded ad-classification identifiers in Anywhere's in-memory store. |
| Spotify Premium | None. Artist/album request URLs may be rewritten within the same Spotify API host. | None. |
| SoundCloud | None. | None. |

All current scripts process responses locally. They do not send intercepted
tokens, cookies, lyrics, or response bodies to another service, and do not log
response contents. Spotify Premium needs no API credentials and makes no Baidu
requests. The earlier lyrics module remains available in its older pinned
release; its data flows are documented in that release's security notes.

The native scripts do not use `eval`, dynamic code downloads, telemetry, or
general-purpose network helpers. The YouTube dependency is a bundled protobuf
parser and response-transform core; its original client and HTTP adapters have
been removed.

## Source review

The YouTube and SoundCloud input definitions were obtained from:

- `https://yfamilys.com/stoverride/YouTubeAd.stoverride`
- `https://yfamilys.com/stoverride/soundcloud.stoverride`

Their JavaScript providers were reviewed separately. No active credential
exfiltration was found in the downloaded YouTube or SoundCloud code.

Spotify Premium follows the user-provided `Spotify Premium.module.module`.
Its three JavaScript providers are `spotify-proto.js`, `spotify-json.js`, and
`spotify-qx-header.js` from `app2smile/rules`. The downloaded providers modify
Spotify account attributes, request URLs, or a cache-validator header. No
active credential exfiltration or extra HTTP requests were found in these
scripts. The protobuf.js runtime has dynamic-code machinery; this repository
uses Anywhere's native protobuf codec instead of including that runtime.

Original provider URLs follow mutable branches. A source owner or compromised
account could replace that code after a review. This repository does not fetch
provider code at runtime or during a normal build. Quick-add subscriptions use
a full commit SHA; the optional `main` subscriptions remain mutable.

Snapshot URLs, downloaded SHA-256 hashes, and the local module's fingerprint
are recorded in [`provenance.json`](provenance.json). File hashes detect differences when checked
against a trusted copy; they do not independently authenticate a compromised
hosting service.

## Practical limits

MITM scripts can inspect decrypted data for every intercepted host, including
authenticated requests. HTTPS interception requires trusting Anywhere's root
certificate. Keep modules scoped to the hosts you intend to intercept.

Anywhere's hostname entries are suffixes without wildcard exclusions. The
YouTube `googlevideo.com` entry therefore includes redirector hosts, although
its CDN rules exclude them. Spotify includes `spotify.com` to cover regional
`*-spclient.spotify.com` hosts. It rewrites only the selected API/ad paths;
other intercepted requests are forwarded unchanged.

Spotify's routing helpers reject ad/diagnostic hosts and send matching Spotify
hosts through the proxy selected by the user. The `spotify`, `-ad-logic`, and
`ads-ak-ent` keyword rules match those substrings in any hostname. REJECT is
seeded only on first import; subscription refreshes preserve local assignments.
The routing helpers apply in Rule mode and obey Anywhere's normal tier priority.
An explicitly assigned built-in Spotify set can take precedence over them.

`.arrs` cannot express a protocol-specific Spotify UDP rejection or create the
input module's proxy group. Select an existing proxy for Spotify Network in
the app; use Anywhere's QUIC blocking if needed for MITM.

Certificate pinning and app updates may prevent a module from working. If a
module breaks playback, disable it and restart the app. Remove or disable the
earlier Spotify Lyrics Translation set when importing Premium so its hostname
does not take precedence.

The scripts keep the original response body on unsupported data or failures.
Spotify Premium and SoundCloud plan attributes are client-side configuration
changes. They do not grant paid server-side entitlements; offline downloads,
high-quality audio, paid content, or audiobooks may remain unavailable.
