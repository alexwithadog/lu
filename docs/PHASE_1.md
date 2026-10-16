# Lu — phase 1

The user authorized building Lu as an always-on-top desktop AI companion, with a small island (buddy left, clock center, pills right), an expanded interface and settings for general behavior, agents, chat, dictation, notetaking, integrations and API credentials. They asked for autonomous iteration while away, smooth animation and simple, efficient code.

Implementation choice: this Windows machine has no Rust/MSVC toolchain. Phase 1 uses Electron with an isolated vanilla TypeScript renderer to deliver a runnable native app without installing a full native compilation toolchain. The frontend has no UI framework or runtime dependencies and can later be hosted in Tauri. Do not claim Tauri is the current shell.

Use an original Lu character and assets. Coucou remains an unchanged local reference; its source is MIT but its named character, icon, sounds and media have separate restrictions. Do not ship those assets as Lu.

Core commitments: functional local notes and focus tools; provider setup and encrypted native credential storage; clear setup states for unavailable integrations; no fake running agents or fake successful connections. Microphone only on explicit user action. No account required for local features. Cloud APIs and hosted free tiers depend on their providers.

Status: implementation started October 15, 2026. See the final README and implementation notes for verified behavior and limitations.

User steering during development: prioritize Coucou fidelity. Lu should feel like a customizable Coucou. Rechecked upstream `f09ac0b` (FETCH_HEAD), including `FlowHub.swift`, `FlowHubHome.swift`, `FlowHubWords.swift`, `FlowHubSettings.swift`, and the hub screenshot. Adopt its Flow / Notch navigation, OLED palette, roomy right-hand card, and a smaller island overview/chat. Preserve original Lu assets and the working local features. Keep upstream MIT attribution when adapting source design tokens and structure.
