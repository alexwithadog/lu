# Working on Lu

Lu is a Windows desktop companion personalized from Coucou's island and Flow / Notch workflow. Preserve that direction, the original Lu character, and the user's local data. The current shell is Electron with vanilla TypeScript, not Tauri.

Repository: https://github.com/alexwithadog/lu. The user requests commits and pushes at meaningful milestones. Validate the affected behavior before each milestone, write a clear commit message, and push without rewriting shared history. Keep documentation honest about tested behavior and features that still need setup.

Use `pnpm build`, `pnpm check`, and `pnpm test` for the normal checks. Agent relay tests use isolated localhost connections and temporary test workspaces. Optional headless UI checks are in `tests/ui.cjs`; they never attach to the user's browser. Do not use Computer Use while the user is using their computer unless they ask to resume it.

Keep credentials, notes, conversations, runtime connection tokens, test data, build outputs, dependency caches, and the separate `coucou/` checkout out of Git. Include original source, assets, research notes, tests, and required upstream attribution. Never change unrelated computer files or silently install or trust agent hooks.

See `docs/VERIFICATION.md` for the current verification boundary and `docs/NEXT.md` for priorities. When packaging, retain the physical native helper files and do not overwrite an application that is still running.
