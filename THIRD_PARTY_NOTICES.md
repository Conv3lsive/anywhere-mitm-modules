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

- Reference: [Amlabort/MY_clash](https://github.com/Amlabort/MY_clash), snapshot
  `f34e210c0cb092690296925ba08825dc6d2fb846`, `files/surge/spot-NoAd.module`
  and its five JavaScript providers.
- The account provider builds on [app2smile/rules](https://github.com/app2smile/rules)
  behavior ([MIT License](licenses/app2smile-MIT.txt), copyright (c) 2023 app2smile)
  and includes a protobuf.js runtime. Neither that provider nor its bundled
  runtime is redistributed here.
- `scripts/spotify-premium.js`, `scripts/spotify-services.js`, and
  `scripts/spotify-feeds.js` are independent implementations using Anywhere's
  native APIs.
- `data/spotify-amlabort-config.json` contains extracted configuration values
  and exclusion keys, with the source commit recorded in the file.
- Local changes: narrow endpoint boundaries, preserve unrelated wire fields,
  use explicit synthetic HTTP responses, omit fabricated Gabo headers, and
  replace byte-level feed patches with optional structural field removal.
- Source URLs and downloaded hashes are recorded in `provenance.json`.

## SoundCloud configuration behavior reference

- Reference: [Marol62926/MarScrpt](https://github.com/Marol62926/MarScrpt),
  `soundcloud.js`, snapshot `3ac7413fbcf58e2ca3e4a2b9353bccc9e4df6cce`.
- `scripts/soundcloud.js` implements the observed configuration values with a
  native Anywhere entry point. No original standalone script is vendored.

## Reddit Ad Block script and icon

- Source: [chikacya/anywhere-rules](https://github.com/chikacya/anywhere-rules),
  `mitm/Reddit_AD_Anywhere.amrs`, snapshot
  `15365b2c003aa55c5ce31bbd7311d37b8b2efae4`.
- The source module attributes upstream behavior to
  [QingRex/LoonKissSurge](https://github.com/QingRex/LoonKissSurge).
- Its embedded JavaScript is copied unchanged to `scripts/reddit.js`; its
  embedded icon is copied to `assets/reddit.png`. English module/parameter
  descriptions replace the original labels. The two translation header rules
  are omitted at the user's request.
- This source snapshot contains no license file. The copied script and icon
  remain third-party material; this repository's own license does not relabel
  them. Source and component hashes are recorded in `provenance.json`.
