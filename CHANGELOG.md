# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.2.4]: https://github.com/R-LEI2536/dsh-tool-list-dir/compare/v0.2.0...v0.2.4
[0.2.0]: https://github.com/R-LEI2536/dsh-tool-list-dir/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/R-LEI2536/dsh-tool-list-dir/releases/tag/v0.1.0
