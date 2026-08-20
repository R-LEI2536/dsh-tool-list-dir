# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.2.0]: https://github.com/R-LEI2536/dsh-tool-list-dir/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/R-LEI2536/dsh-tool-list-dir/releases/tag/v0.1.0
