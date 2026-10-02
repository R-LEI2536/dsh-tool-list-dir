# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.7] - 2026-10-02

### Changed
- Bumped the three `@deepseek-ai/dsh-*` peer+dev ranges from `^0.1.7-rc.1` to `^0.2.0-rc.1` so the plugin passes the DSH 0.2.0-rc.2 plugin compatibility gate (`packages/boot/app-boot/src/plugin-compatibility.ts`: it evaluates `peerDependencies` only, with `includePrerelease`, so `^0.1.7-rc.1` = `>=0.1.7-rc.1 <0.2.0-0` is rejected by a `0.2.0-rc.2` runtime and the row would be disabled). The new range admits `0.2.0-rc.1`/`rc.2`/`rc.3` and `0.2.x` stable, and still rejects `0.3.0`.
- `@deepseek-ai/cordis` (`~4.0.4`) and `@deepseek-ai/schemastery` (`~3.18.4`) are unchanged: the gate skips non-`dsh-*` names, and both are byte-identical between 0.1.7-rc.2 and 0.2.0-rc.2.
- `src/` is unchanged; typecheck against the `0.2.0-rc.2` type surface passes and `lib/` output stays byte-identical. All consumed APIs (`ctx.systemPrompt.section`, `ctx.tools.register`/`defineTool`, `ctx.fs.resolve`/`listDir`, `exec.agent?.session.header.cwd`) are unchanged in 0.2.0-rc.2, and `SECTION_ORDERS` still places `TOOL_EDIT` / `TOOL_GLOB` at 1300 / 1400, so the default `order: 1350` slot is unchanged.
- Refreshed `pnpm-lock.yaml` from the `0.1.7-rc.2` to the `0.2.0-rc.2` cohort.

## [0.2.6] - 2026-09-29

### Changed
- Bumped peer/dev dependencies to support DSH `0.1.7-rc.1+`: `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-fs`, `@deepseek-ai/dsh-system-prompt` from `^0.1.5-rc.1` to `^0.1.7-rc.1` (admits `0.1.7-rc.2` and future stable; `^0.1.7`/`~0.1.7`/`>=0.1.7` would reject prereleases under semver 7.8.5 + `includePrerelease`).
- Corrected `@deepseek-ai/cordis` to `~4.0.4` and `@deepseek-ai/schemastery` to `~3.18.4` — the previous `^0.1.5-rc.1` was never satisfiable (those packages publish only `4.0.x` / `3.18.x`; the DSH 0.1.7-rc.2 host and all first-party packages use `~4.0.4` / `~3.18.4`).
- `src/` is unchanged: typecheck against the `0.1.7-rc.2` type surface passes and `lib/` output is byte-identical, confirming all consumed APIs (`ctx.systemPrompt.section`, `ctx.tools.register`/`defineTool`, `ctx.fs.resolve`/`listDir`, `exec.agent?.session.header.cwd`) are compatible with DSH 0.1.7-rc.2.

## [0.2.5] - 2026-09-11

### Changed
- Bumped all `@deepseek-ai/*` peer and dev dependencies from `*` to `^0.1.5-rc.1` so the plugin actually resolves against DSH 0.1.5 (the prior `*` could not resolve to a prerelease tag like `0.1.5-rc.1` under default node-semver semantics).
- Updated wording that referenced "DSH 0.1.2's tool description band" to 0.1.5 in `src/index.ts`, `README.md`, and `README.zh.md`. The 1000-2900 tool band and the default `order: 1350` slot are unchanged in 0.1.5.

## [0.2.4] - 2026-09-04

### Fixed
- Bumped `tool:list_directory` prompt section order default from `100` to `1350` so the section renders inside DSH 0.1.2's tool description band (1000-2900), between `TOOL_EDIT` (1300) and `TOOL_GLOB` (1400), alongside other filesystem tools. The previous `100` placed the section in the SDK/cross-tool guidance band (100-199), where it collided with `tools:sdk` and friends. The same band convention is documented in `dsh-more-agentpresets` 1.3.0/1.3.1, which bumped preset section orders out of the 1000-2900 tool band for the same DSH 0.1.2 release.

## [0.2.0] - 2026-08-20

### Changed
- Changed package name to scoped package `@rh854lkjd/dsh-tool-list-dir` for npm publishing
- Updated README with npm installation instructions
- Simplified configuration examples in documentation
- Added package.json metadata (keywords, repository, bugs, homepage, author)

### Fixed
- Fixed `cordis.patch.yml` inclusion in npm package

## [0.1.0] - 2026-08-15

### Added
- Initial release
- `list_directory` tool with smart sorting (directories first, then files)
- Statistics display (total count, files, directories)
- Configurable truncation limit (default: 100 entries)
- Type and size information for entries
- System prompt guidance for the model
- Plugin configuration support (`order`, `guidance`, `maxEntries`)
- MIT License
- README in English and Chinese

[0.2.7]: https://github.com/R-LEI2536/dsh-tool-list-dir/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/R-LEI2536/dsh-tool-list-dir/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/R-LEI2536/dsh-tool-list-dir/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/R-LEI2536/dsh-tool-list-dir/compare/v0.2.0...v0.2.4
[0.2.0]: https://github.com/R-LEI2536/dsh-tool-list-dir/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/R-LEI2536/dsh-tool-list-dir/releases/tag/v0.1.0
