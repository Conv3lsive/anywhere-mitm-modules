# Third-party notices

The original code in this repository is covered by [LICENSE](LICENSE). The
following third-party material retains its own license and attribution.

## YouTube response core

- Author: Maasea, [Maasea/sgmodule](https://github.com/Maasea/sgmodule).
- Source: `Script/Youtube/youtube.response.js`, snapshot
  `65075cdb388fc5e3094afd7e7314c67b243f3525`, build `2026/7/19 16:16:39`.
- Retained in `scripts/vendor/youtube-core.js` under
  [Apache License 2.0](licenses/Maasea-Apache-2.0.txt).
- Changes: removed the client adapters, original entry point, and text-codec
  polyfill; use Anywhere's UTF-8 codec and expose `youtubeTransform(input)`.
- The bundled protobuf runtime is from Tim Ostamm's
  [protobuf-ts](https://github.com/timostamm/protobuf-ts), also under
  [Apache License 2.0](licenses/protobuf-ts-Apache-2.0.txt).

## Spotify Premium behavior reference

- Author: app2smile, [app2smile/rules](https://github.com/app2smile/rules).
- References: `js/spotify-proto.js`, `js/spotify-json.js`, and
  `js/spotify-qx-header.js`, snapshot
  `df6366a7024e0b3f0aa3510c5b791eea6f3cba89`.
- [MIT License](licenses/app2smile-MIT.txt), copyright (c) 2023 app2smile.
- `scripts/spotify-premium.js` implements the account-attribute rewrites using
  Anywhere's protobuf API, preserving unrecognized wire fields. URL and header
  changes use declarative Anywhere rules. The reference's bundled protobuf.js
  runtime and original client entry points are not included.

## SoundCloud configuration behavior reference

- Reference: [Marol62926/MarScrpt](https://github.com/Marol62926/MarScrpt),
  `soundcloud.js`, snapshot `3ac7413fbcf58e2ca3e4a2b9353bccc9e4df6cce`.
- `scripts/soundcloud.js` implements the observed configuration values with a
  native Anywhere entry point. No original standalone script is vendored.

## Spotify Ad Block Trial behavior reference

- The user-provided `spotify.stoverride` attributes its behavior to
  [001ProMax](https://github.com/001ProMax) and references
  `https://kelee.one/Resource/JavaScript/Spotify/Spotify_remove_ads.js`.
- `scripts/spotify-adblock.js` and `scripts/spotify-adblock-services.js` are
  independent implementations using Anywhere's native API. The downloaded
  provider's codec and client entry points are not included or redistributed.
- Reference fingerprints and review date are recorded in `provenance.json`.

## Spotify Snapshot Trial behavior reference

- Reference: [Amlabort/MY_clash](https://github.com/Amlabort/MY_clash), snapshot
  `f34e210c0cb092690296925ba08825dc6d2fb846`, `files/surge/spot-NoAd.module`
  and its five JavaScript providers.
- The account provider is based on app2smile behavior and includes a
  protobuf.js runtime. Neither that provider nor its bundled runtime is
  redistributed here. The three native scripts are independent implementations.
- `data/spotify-amlabort-config.json` contains extracted static configuration
  values and exclusion keys, with the source commit recorded in the file.
- Local adaptations: narrow endpoint boundaries, preserve unrelated wire
  fields, use explicit synthetic HTTP responses, omit fabricated Gabo headers,
  and replace byte-level feed patches with optional structural field removal.
- Source URLs and downloaded hashes are recorded in `provenance.json`.
