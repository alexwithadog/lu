# Desktop companion research — paused 2026-10-14

Update: the user subsequently requested continuation. The research synthesis is now complete; see START_HERE.md and the expanded FINDINGS.md. The checkpoint below records the earlier pause and is retained for provenance.

The user requested a clone and detailed study of Coucou, CC Switch, Anil-matcha/open-dots, Open Interpreter, Tauri, and similar desktop assistants, as the foundation for a future app personalized by the user. The user subsequently said to skip MacPy. Research is paused at the user's request; do not resume automatically.

Coucou was successfully cloned to `../coucou`. Its inspected revision is `1456bd3c87f91d6e267516203c84b0148b587120`, dated October 14, 2026. The checkout was clean when checked after cloning. No upstream source was edited, no native assistant was installed, and no agent hooks or credentials were configured.

Read `FINDINGS.md` for the saved synthesis. This is an interim research report, not a completed implementation plan or a claim that every app has been tested.

## Evidence already collected

- Coucou: README, Windows README, CLAUDE.md, docs/AGENTS.md, relevant portions of SPEC.md and INTEGRATIONS.md, package/Cargo/Tauri configuration, island state machine, native Windows overlay handling, hook relay, pipe server, supported-agent approval routing, chat, dropped-file handling, secret storage, and Mac window-context capture. Visually inspected the upstream Claude Code and chat screenshots in docs/media.
- CC Switch: primary repository, official website demo, actual published desktop screenshot, package.json, Tauri configuration, interface manual, sessions manual, and local routing manual. Repository tree revision: `51ac86f1c59abfefabadebd05ec5a5415b8ad72c`.
- Open Dots: current README, package manifests, repository tree, architecture/decision documentation, frontend page, permission service, Git command classifier, and local access policy. Repository tree revision: `9f2b473599865c0e42050ee681018f9134b26c7e`.
- Open Interpreter: current README and repository tree at `ac1fcc8fe57aba51fcc3c79afd57a0883237fe87`; official terminal documentation; legacy Python community fork; Interpreter Workstation README and package.json.
- Related references: Notchi, notch-911, Boring Notch, CatDesk, BongoCat, Pot, Pake, and Raycast AI, using primary repositories or official product documentation. Depth varies; see findings.
- Framework sources: Tauri architecture, configuration, capabilities, and Electron security documentation.

## Practical limits

Cargo and npm were not found by the initial PATH command lookup; Node and Git were available. No native build was attempted. Public screenshots and a CC Switch website simulation were observed, not installed-app behavior. A read-only localhost server for the original Coucou HTML prototype was started on port 4178, but the browser could not reach it; therefore the interactive prototype was NOT verified. The server was asked to stop before this checkpoint was saved. `serve-coucou-prototype.mjs` is retained as an optional preview helper.

Cached web pages sometimes describe older versions. Prefer the pinned source snapshots over search snippets. Coucou's docs/AGENTS.md contains outdated statements about Codex/third-party approvals; the current Windows agents.rs and hook reply.rs provide stronger evidence. Open Dots explicitly separates implemented behavior from future architecture, and its README's test-coverage statement appears behind the current tree, which includes router and scheduling tests. BongoCat's repository topics still mention Tauri, but the inspected current Cargo workspace uses native Rust modules and GPUI-related dependencies. Do not call its current version a Tauri app without further verification.

## Resume from here

1. Confirm the user has asked to continue, then finish a focused comparison of the closest floating UI references. Do not repeat broad discovery or reclone Coucou.
2. If interactive observation is useful, resolve local preview connectivity or use official published demos. Clearly separate simulations, documented features, inspected code, and measured native behavior.
3. Inspect remaining implementation details only as needed: accessibility, cancellation/recovery, context capture on Windows, permission scope, native overlay packaging and updates, and licenses of any code proposed for reuse.
4. Prepare the final comparative report with a recommended architecture and staged implementation options. Keep personalization choices open: OS targets, placement, character/style, top workflows, providers, privacy, and degree of autonomy.
5. The task is research and reporting. Building the personalized app has not yet been requested in this session.
