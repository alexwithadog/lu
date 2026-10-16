# Continuing Lu

The user's direction is **a customizable Coucou**, using its source as the main reference. Keep the Flow / Notch layout and small overview/chat island. Preserve the working local features and the user's Lu data.

Phase 1 has the desktop shell, core screens, notes, focus, dictionaries, snippets, styles, optional provider chat/transcription, original animated Lu assets, and encrypted keys. See `VERIFICATION.md` for the testing boundary.

The user selected all three next directions, with **live coding-agent sessions first**, followed by live dictation/transcripts and companion interaction. The local agent inbox, relay, and setup are now implemented in source.

The next substantial parity work is:

1. Finish the compact request layout check, rebuild the portable package with physical native helpers, and verify the updated application. Computer Use was stopped because the user needed their computer; do not resume it until requested. Preserve notes and preferences.
2. Verify a deliberately connected live Claude Code or Codex session. The isolated bridge and helper tests pass; no real agent settings or hook trust records were changed during development. Preserve the user's explicit control of approvals.
3. A reliable local speech engine on Windows, followed by hold-to-dictate and explicit insertion into the intended app. Coucou's current Windows Flow code is in `origin/main:windows/src-tauri/src/flow/`; its Apple-silicon FluidAudio path is not portable as-is. Add Notetaker system-audio capture, speaker separation, and an integrated summary flow after the capture path works.
4. Service pills with real connections, then optional sync. Avoid collecting a service key until the integration can use it.
5. Detached desktop Lu and further character reactions, while keeping idle work small.

Before updating a running Lu build, preserve its data and finish an atomic save. The portable application is `release/Lu-win32-x64/Lu.exe`; `Start Lu.cmd` opens it. Development uses `.lu-data`, packaged runs use the Lu application-data folder, and test workspaces are separate. Do not delete or reset those data folders during development.

The source repository is https://github.com/alexwithadog/lu. Commit and push at meaningful, validated milestones as requested by the user; do not wait for another instruction for each milestone.
