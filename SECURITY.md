# Code review and data flows

Reviewed on **2026-10-08**. This is a static review with synthetic response
tests, not a guarantee of safety or a live compatibility test of the target apps.

## Published modules

| Module | Extra network requests | Data stored by its script |
| --- | --- | --- |
| YouTube | None. A matching CDN request may receive a redirect within `googlevideo.com`. | Bounded ad-classification identifiers in Anywhere's in-memory store. |
| Spotify lyrics | One HTTPS POST to `https://fanyi-api.baidu.com/api/trans/vip/translate`, only with translation enabled and credentials configured. Redirects are not followed and TLS verification is required. | No script cache. Credentials are module parameters managed by Anywhere. |
| SoundCloud | None. | None. |

The Spotify POST contains lyric text, App ID, a random salt, target language, and
a signature. It does not include intercepted Spotify headers, cookies, or the
raw signing key. Baidu can see the lyric text and the network address used for
the request. The module does not log lyrics, signatures, or API credentials.

The native scripts do not use `eval`, dynamic code downloads, telemetry, or
general-purpose network helpers. The YouTube dependency is a bundled protobuf
parser and response-transform core; its original client and HTTP adapters have
been removed.

## Source review

The three input definitions were obtained from:

- `https://yfamilys.com/stoverride/YouTubeAd.stoverride`
- `https://yfamilys.com/stoverride/spotify_lyric.stoverride`
- `https://yfamilys.com/stoverride/soundcloud.stoverride`

Their JavaScript providers were reviewed separately. No active credential
exfiltration was found in the downloaded YouTube or SoundCloud code. The Spotify
code intentionally sends lyrics to Baidu. Its bundled MD5 library contains
Node-only `eval(require(...))` branches, and its generic environment helper has
a remote script-evaluation method; those paths are not part of the lyric
translation call chain and none is included here.

The input Spotify provider combines a script URL and `argument` text in its URL
value. This repository uses native module parameters instead of that value.

Original provider URLs follow mutable branches. A source owner or compromised
account could replace that code after a review. This repository does not fetch
provider code at runtime or during a normal build. Quick-add subscriptions use
a full commit SHA; the optional `main` subscriptions remain mutable.

Snapshot URLs and downloaded SHA-256 hashes are recorded in
[`provenance.json`](provenance.json). File hashes detect differences when checked
against a trusted copy; they do not independently authenticate a compromised
hosting service.

## Practical limits

MITM scripts can inspect decrypted data for every intercepted host, including
authenticated requests. HTTPS interception requires trusting Anywhere's root
certificate. Keep modules scoped to the hosts you intend to intercept.

Anywhere's hostname entries are suffixes without wildcard exclusions. The
YouTube `googlevideo.com` entry therefore includes redirector hosts, although
its CDN rules exclude them. Certificate pinning and app updates may prevent a
module from working. If a module breaks playback, disable it and restart the app.

The scripts keep the original response body on unsupported data or failures.
SoundCloud plan flags only affect the local configuration response; server-side
entitlements remain controlled by SoundCloud.
