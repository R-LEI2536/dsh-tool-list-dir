# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-10-18

### Changed
- Moved the peer and dev ranges to the DSH `0.2.1` cohort: `@deepseek-ai/dsh-tools` / `@deepseek-ai/dsh-fs` / `@deepseek-ai/dsh-system-prompt` from `^0.2.0-rc.1` to `^0.2.1-rc.1`, `@deepseek-ai/cordis` from `~4.0.4` to `~4.0.5`, `@deepseek-ai/schemastery` from `~3.18.4` to `~3.18.5`. The single range `^0.2.1-rc.1` admits both the `0.2.1-rc.1` and `0.2.1-rc.2` runtimes; verified with the repository's own semver 7.8.5 under the gate's rule (`semver.satisfies(runtime, range, { includePrerelease: true })` over `@deepseek-ai/dsh*` peer entries only): `0.2.1-rc.1`/`rc.2` pass, `0.2.0-rc.2` is rejected.
- Relative `path` now resolves against the Session's **current** working directory through `ctx.workingDirectory.ensure(exec.agent, exec.signal)` instead of `exec.agent?.session.header.cwd`. As of DSH 0.2.1 `Session.header.cwd` is only the original project identity / permission root, so the old source went stale after `working_directory({ cd })`; the new source is the one `@deepseek-ai/dsh-tool-fs` uses (`packages/fs/tool-fs/src/session-cwd.ts`). Non-agent calls still omit `cwd` and leave the directory to the filesystem backend.
- `inject` now includes `workingDirectory`. The prompt-section comment no longer cites DSH 0.1.5; the tool band itself is unchanged (`TOOL_EDIT` 1300 / `TOOL_GLOB` 1400 in `SECTION_ORDERS`, band 1000–2900), so the default `order: 1350` still sits between them.
- Dev dependencies resolved to the `0.2.1-rc.1` cohort rather than `rc.2`: pnpm's registry release-age policy holds back the newer prerelease. The shipped **range** admits `rc.2`, and `dsh-tools` / `dsh-fs` / `dsh-system-prompt` / `dsh-working-directory` carry no breaking type change between the two prereleases (their declarations consumed here were compared one by one).

### Added
- `@deepseek-ai/dsh-working-directory` as a peer and dev dependency. It is new in 0.2.1; `@deepseek-ai/dsh-base` mounts its row, so any profile built on the base bundle provides the service.
- `test/smoke.test.mjs` plus `test` / `pretest` scripts: a zero-dependency `node:test` suite that runs against the built `lib/` and asserts the tool contract (name, parameters, prompt section, `presentCall`), working-directory resolution for agent and non-agent calls, sort-before-truncation, `ignore`/`ignored`, and the empty-versus-filtered wording.

### Removed
- The stale npm `package-lock.json` (version `0.2.3`, still pinned to the `0.1.0-rc.7` cohort). The repository is pnpm-managed; `package-lock.json` is now git-ignored so a stray `npm install` cannot land a second lockfile.

### Compatibility
- **The plugin is disabled on a 0.2.0-rc.2 host.** `^0.2.1-rc.1` does not satisfy that runtime, so app-boot rewrites the profile row to `disabled` (a bundle row would skip the whole package). Upgrade the host to `0.2.1-rc.1`/`rc.2` before installing 0.4.0 — host first, plugin second.
- No other contract changed within the corpus covered by the 0.2.1-rc.2 upgrade guide: `defineTool`, `ctx.tools.register`, `ctx.fs.resolve`/`listDir`, `ctx.systemPrompt.section`, the `presentCall` shape, and `SECTION_ORDERS` are all unchanged. This plugin has no `./invariant` import, no `mode: both` / `backgroundMode` / `{{cwd}}` / `dshHome` / `webRuntime` configuration, and no web-client surface.

## [0.3.3] - 2026-10-03

### Changed
- Every model- and user-facing string now calls a listed thing an **item**. The rendered block previously used two nouns for one thing: the truncation line said `items` while the `Total:` line said `entries`. The three remaining render sites (`Total:`, `[N items hidden by ignore patterns]`, and the filtered-empty sentence), the tool `description`, and the `ignore` parameter description were all aligned on `item`/`items`.
- The `plural()` doc example moved from `entry`/`entries` to `directory`/`directories`, a plural still exercised in the output.
- The `entries` JSON field name and the internal identifiers are **unchanged**. Renaming the field would break the tool's output contract for a wording cleanup.

## [0.3.2] - 2026-10-03

### Fixed
- Rendered counts used the plural noun for a count of one: `Total: 3 entries (1 directories, 2 files)`. Every counted noun now agrees with its number. The fix covers all seven sites, not only the `Total:` line: `Listed <N> items`, `[<N> items truncated]`, `[<N> entries hidden]`, and the `entries` / `directories` / `files` / `others` clauses.
- The `plural(count, singular, plural)` helper requires both forms explicitly. A default of `singular + "s"` silently produced `entrys`, which the verification caught.

### Changed
- The filtered-empty sentence is now `Directory <path> is not empty. The ignore patterns hid <N> entries.` (was `All <N> entries were hidden by ignore patterns.`). The past-tense `hid` does not change form with the count, so one helper covers every number; the previous wording needed `was`/`were` agreement and produced the awkward `All 1 entry was hidden`.

## [0.3.1] - 2026-10-03

### Fixed
- An empty listing rendered as two adjacent separator rules with no body between them, plus a `Total: 0 entries (0 directories, 0 files)` line. It now renders one plain sentence: `Directory <path> is empty.`

### Changed
- An empty result caused by `ignore` no longer reads as an empty directory. When `ignore` hid every entry, the output is `Directory <path> is not empty. All <N> entries were hidden by ignore patterns.` instead of the empty-directory sentence. Reporting "empty" there would contradict the `ignored` field added in 0.3.0 and lead the model to conclude the directory holds nothing. `All <N>` is exact in this branch: `total === 0` with `ignored === N` implies the pre-filter listing held exactly N entries.
- Non-empty listings are byte-identical to 0.3.0 (verified against the committed build).

## [0.3.0] - 2026-10-03

### Added
- `ignore` parameter on `list_directory`: an array of glob patterns matched against **entry basenames** (`*` and `?` are the only wildcards, every other character is literal), mirroring qwen-code's `list_directory` semantics so a pattern means the same thing in both harnesses. Matching entries are omitted from the listing. Patterns are compiled once per call, not once per entry.
- `ignored` field in the tool output (optional, present only when `> 0`): the number of entries hidden by `ignore`. Without it the model cannot tell "entry does not exist" from "entry was filtered out". The rendered output gains a matching `[N entries hidden by ignore patterns]` line.

### Fixed
- Sort now happens **before** truncation. Previously `execute` sliced `ctx.fs.listDir`'s raw order to `maxEntries` and only sorted inside `render`, so any directory with more than `maxEntries` entries showed an arbitrary slice with directories and files interleaved — defeating the advertised directories-first ordering. The comparator moved into `execute` (single source of truth) and `render` no longer re-sorts.
- `stats` now counts the **listed** (post-filter) set, so `stats.total` always equals the number of entries actually returned.

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

[0.4.0]: https://github.com/R-LEI2536/dsh-tool-list-dir/compare/v0.3.3...v0.4.0
[0.3.3]: https://github.com/R-LEI2536/dsh-tool-list-dir/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/R-LEI2536/dsh-tool-list-dir/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/R-LEI2536/dsh-tool-list-dir/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/R-LEI2536/dsh-tool-list-dir/compare/v0.2.7...v0.3.0
[0.2.7]: https://github.com/R-LEI2536/dsh-tool-list-dir/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/R-LEI2536/dsh-tool-list-dir/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/R-LEI2536/dsh-tool-list-dir/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/R-LEI2536/dsh-tool-list-dir/compare/v0.2.0...v0.2.4
[0.2.0]: https://github.com/R-LEI2536/dsh-tool-list-dir/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/R-LEI2536/dsh-tool-list-dir/releases/tag/v0.1.0
