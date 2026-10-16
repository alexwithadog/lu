# Lu phase 1 verification

Source milestone: 0.2.0, October 15, 2026. The earlier portable build has not yet been rebuilt with the agent bridge.

## Working and checked

- The Windows portable app launches with an original Lu icon and transparent outer corners.
- The actual Windows island was expanded, minimized, and reopened through the Computer Use skill. Its full workspace was opened and inspected. The earlier faded-window failure was traced to the collapse animation sharing the inactivity timer; those timers are separate now.
- Isolated frontend checks pass for navigation, note editing and persistence after reload, pinning, focus countdown and pause, custom durations, dictionary entries, snippets, styles, themes, the command palette, quick notes, and repeated island transitions. Screenshots under `docs/screenshots/` come from this isolated browser, with test data.
- Unit tests cover malformed backup recovery, safe note identifiers, history retention, dictionary boundaries and Unicode, note ordering, focus date accounting, native IPC coverage and origin checks, separate credential persistence, endpoint validation, and streamed responses split across byte boundaries.
- Native IPC unit tests use a simulated encryption boundary. A separate windowless Electron runtime check also passed with real Windows encryption: a generated test value was encrypted, written, read, decrypted, and removed. No user or provider keys were accessed.
- The island's anchor is kept separately from the larger workspace. A tested left or right placement survives expansion even when the larger window is clamped to the screen. Restart and quit request a final save from the interface.
- All 21 model, provider, native boundary, and agent tests passed. Agent checks include authenticated loopback requests, origin rejection, explicit one-time decisions, replay rejection, complete question answers, delayed acceptance, fallback, timeout, disconnection, settings merge and backup, and a real compiled Windows relay round trip. These use simulated requests and temporary settings, not the user's agent configuration.
- Isolated UI checks also passed for Statistics, an empty agent inbox, permission and question fixtures, safe request rendering, response controls, and connection preview before an explicit simulated installation. The compact request footer was subsequently refined and the production build passed; that final layout refinement awaits another UI run.
- Production frontend has no framework or runtime package dependencies. The latest build is about 93 KB of JavaScript and 65 KB of CSS before compression (31 KB and 13 KB compressed).

## Setup or future work

- Real hosted chat, transcription, quotas, and model availability require a configured provider. Streaming protocol tests use simulated responses; no hosted AI request was charged or claimed as verified.
- No compatible legacy Windows offline speech recognizer was found on this computer. API dictation and compatible local servers have setup controls. Microphone capture was not activated during automated testing.
- Parakeet is not bundled. Coucou's Apple-silicon FluidAudio integration cannot be assumed to run on Windows.
- System audio, speaker separation, insertion into other apps, a Lu-managed agent runtime, phone linking, and cloud sync are future work.
- Claude Code and Codex hooks are implemented with setup controls. A user-connected live session still needs verification. Codex question replies beyond supported hooks remain in Codex; this is not a full transcript connection.
- Packaging now leaves helpers as physical files instead of inside an ASAR archive. The updated portable package and its native startup still need verification.
- No external coding-agent settings were changed. No credentials were harvested from other apps.

## Reference

The Coucou checkout began at `1456bd3c87f91d6e267516203c84b0148b587120`. Upstream was fetched again and inspected at `f09ac0b451128781b88b0f8a77f69bab622b9f24`, including the current FlowHub implementation and screenshot. The reference checkout's working files are retained; the newer reference is available through `origin/main`. Lu's adapted navigation and design tokens retain the upstream MIT notice in `THIRD_PARTY_NOTICES.md`.
