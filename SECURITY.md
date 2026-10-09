# Code review and data flows

Core modules reviewed on **2026-10-08**; Reddit reviewed on **2026-10-09**.
Static review and synthetic response tests are
supplemented by one user report of normal Spotify playback on 9.1.88.2209 in
Anywhere. This does not establish compatibility across all devices or versions.

## Published modules

| Module | Extra network requests | Data stored by its script |
| --- | --- | --- |
| YouTube | None. A matching CDN request may receive a redirect within `googlevideo.com`. | Bounded ad-classification identifiers in Anywhere's in-memory store. |
| Spotify Premium | None. Selected service requests receive local 200/403 responses. | None. |
| SoundCloud | None. | None. |
| Reddit Ad Block | None. | None. |

Current scripts process responses locally. They do not send intercepted tokens,
cookies, lyrics, or response bodies to another service, and do not log response
contents. The native scripts do not use `eval`, dynamic code downloads,
telemetry, or general-purpose network helpers. The YouTube dependency is a
bundled protobuf parser and transform core with its original HTTP/client
adapters removed.

## Source review

YouTube and SoundCloud input definitions came from:

- `https://yfamilys.com/stoverride/YouTubeAd.stoverride`
- `https://yfamilys.com/stoverride/soundcloud.stoverride`

Their JavaScript providers were reviewed separately. No active credential
exfiltration was found in the downloaded code.

Spotify Premium references six Amlabort files pinned to commit
`f34e210c0cb092690296925ba08825dc6d2fb846`. The account provider, Gabo responder,
and three feed providers were inspected. No active extra HTTP requests or
credential exfiltration were found. The account provider's bundled protobuf.js
runtime contains code-generation/fetch helpers, but its active transformation
path does not use outbound fetches. That runtime and the original provider
code are not included in the published module.

The independent native implementation embeds static configuration data at
build time. This consists of feature scopes/names, scalar values, and
experiment-policy metadata; it contains no account authorization tokens.
Its default snapshot replaces all live assignments with 875 retained records.
This changes behavior beyond playback, with a switch to retain live assignments.
Unrelated wire fields are preserved, and unsupported responses retain their
original body.

Original home/scroll scripts retag byte patterns to invalid protobuf wire type
7; the search script scans arbitrary byte offsets. The optional native feed
filter instead removes the first matching top-level length-delimited field
within the reviewed prefix. It does not scan inside payloads or emit invalid
tags. New/nested layouts may retain ads. Feed filtering is off by default.
Local Gabo responses omit fabricated server/timing headers and the original
HTTP/3 advertisement.

Reddit's source module is pinned to `chikacya/anywhere-rules` commit
`15365b2c003aa55c5ce31bbd7311d37b8b2efae4`. Its 2,926-byte embedded JavaScript
is copied byte-for-byte to `scripts/reddit.js` and embedded in this repository's
subscription. The source credits QingRex/LoonKissSurge for upstream behavior.
Static inspection found no outbound HTTP calls, token/cookie extraction,
storage writes, dynamic-code execution, or response logging. The script
recursively removes selected GraphQL ad objects and optionally changes
sensitive-content flags. The NSFW prompt setting is on by default and can be
disabled independently of ad removal.

The source's forced Chinese translation header rules were removed at the
user's request. The copied icon is an embedded 144×144 PNG; no remote image
download is needed. JSON parsing and a nesting limit guard unsupported bodies;
only changed output is serialized and committed. Reddit's live app
compatibility has not been verified in this session.

**Apply module changes** disables account, service, and feed mutations. The
MITM host list, cache-validator deletion, and separate ad routing set remain
active. Disable Spotify Ads as well when comparing interception without
script changes.

## Integrity

Provider URLs can change upstream. This repository does not fetch provider
code at runtime or during a normal build. Quick-add subscriptions use a full
commit SHA; optional `main` subscriptions remain mutable.

Snapshot URLs and downloaded hashes are recorded in
[provenance.json](provenance.json). [SHA256SUMS](SHA256SUMS) covers current
sources, configuration data, and generated rule sets. Hashes detect changes
against a trusted copy; they do not authenticate a compromised hosting service.

## Practical limits

MITM scripts can inspect decrypted data for intercepted hosts, including
authenticated requests. HTTPS interception requires trusting Anywhere's root
certificate. Keep modules scoped to the hosts you intend to intercept.

Anywhere uses hostname suffixes without wildcard exclusions. YouTube's
`googlevideo.com` entry includes redirector hosts, although its CDN rules exclude
them. Spotify's `spotify.com` entry covers regional `*-spclient.spotify.com`
hosts. Only the selected API/ad paths are changed; other requests pass through.
Reddit's hostname entries also include subdomains through suffix matching;
its URL gate limits response changes to the two exact GraphQL hosts.

Spotify Ads rejects `aet.spotify.com` and its subdomains. Spotify Network routes
matching hosts through the user's selected proxy; its `spotify` keyword matches
that substring in any hostname. REJECT is seeded only on first import, and
refreshes preserve local assignments. Routing helpers apply in Rule mode and
obey Anywhere's tier priority; an assigned built-in Spotify set can override them.
`.arrs` cannot express a protocol-specific Spotify UDP rejection rule.

Certificate pinning and app updates can prevent a module from working. If
playback breaks, disable the module and restart the app. Enable only the current
Spotify module when migrating from older installations.

Spotify Premium and SoundCloud plan attributes are local configuration changes.
They do not grant server-side entitlements; paid downloads, audio quality,
audiobooks, and other features may remain unavailable. Earlier implementations
were removed from the current release and remain only in Git history.
