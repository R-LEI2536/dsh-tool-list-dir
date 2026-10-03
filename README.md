# dsh-tool-list-dir

**Version 0.3.0**

[中文](./README.zh.md)

A lightweight, read-only directory listing tool for [dsh-user-approval](https://github.com/R-LEI2536/dsh-user-approval).

一个轻量级、只读的目录列表工具，专为 [dsh-user-approval](https://github.com/R-LEI2536/dsh-user-approval) 设计。

## Features

- **Smart Sorting**: Directories first, then files, alphabetically within each group — sorted *before* truncation, so the shown subset is always the directories-first head
- **Item Filtering**: Optional `ignore` glob patterns omit matching items, and the result reports how many were hidden
- **Statistics**: Shows total count, files, and directories
- **Truncation**: Limits output to 100 items by default (configurable)
- **Type & Size Info**: Displays item type (DIR/FILE) and file sizes
- **System Prompt Guidance**: Includes usage guidance for the model

## Installation

### From NPM (Recommended)

```bash
dsh plugin --profile web add @rh854lkjd/dsh-tool-list-dir
```

### From GitHub

```bash
dsh plugin --profile web add github:R-LEI2536/dsh-tool-list-dir
```


## Configuration

### Custom Configuration

You can customize the tool behavior in your agent preset or `cordis.patch.yml`:

```yaml
- id: tool-list-dir
  name: @rh854lkjd/dsh-tool-list-dir
  config:
    # Custom system prompt guidance order (default: 1350)
    order: 1350
    
    # Custom guidance text for the model
    guidance: |
      Use list_directory to browse project structures.
      Results show file sizes and types.
      Sorted by type and name.
    
    # Maximum items before truncation (1-1000, default: 100)
    maxEntries: 200
```

### Disable the Tool

```yaml
- id: tool-list-dir
  name: @rh854lkjd/dsh-tool-list-dir
  disabled: true
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `order` | number | `1350` | Order of the system prompt guidance section. Default `1350` sits inside DSH 0.1.5's tool description band (1000-2900), between `TOOL_EDIT` (1300) and `TOOL_GLOB` (1400). Higher values appear later in the prompt. |
| `guidance` | string | *(see default)* | Custom guidance text shown to the model. Use this to provide context-specific instructions. |
| `maxEntries` | number | `100` | Maximum number of items to return. Range: 1-1000. Larger directories are truncated. |

### Default Guidance Text

```
Use the list_directory tool — not shell commands like ls — to browse directory structures. When truncated use glob to find files by name pattern, or grep to search file contents. Use this for understanding project layouts.
```

## Tool Parameters

These are per-call arguments, not plugin configuration.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | yes | Directory to list, resolved against the session working directory. Relative paths are allowed. |
| `ignore` | string[] | no | Glob patterns matched against item **basenames**. `*` and `?` are the only wildcards; every other character is literal. Matching items are omitted. |

```json
{ "path": "src", "ignore": ["*.test.ts", "node_modules"] }
```

`ignore` mirrors qwen-code's `list_directory` semantics, so a pattern means the same thing in both harnesses.

## Tool Output

### JSON Structure (for the model)

```json
{
  "path": "/home/user/project",
  "entries": [
    { "name": "src", "type": "directory" },
    { "name": "package.json", "type": "file", "size": 1234 },
    { "name": "README.md", "type": "file", "size": 5678 }
  ],
  "stats": {
    "total": 3,
    "files": 2,
    "directories": 1,
    "others": 0
  }
}
```

**When truncated** (more than `maxEntries`):

```json
{
  "path": "/home/user/large-project",
  "entries": [ /* first 100 items */ ],
  "stats": {
    "total": 500,
    "files": 450,
    "directories": 50,
    "others": 0
  },
  "truncated": {
    "shown": 100,
    "total": 500,
    "remaining": 400
  }
}
```

**When items were filtered** (an `ignore` pattern matched):

```json
{
  "path": "/home/user/project",
  "entries": [
    { "name": "src", "type": "directory" },
    { "name": "package.json", "type": "file", "size": 1234 }
  ],
  "stats": {
    "total": 2,
    "files": 1,
    "directories": 1,
    "others": 0
  },
  "ignored": 3
}
```

`ignored` is absent when nothing was filtered, and `stats` always describes the entries actually returned — `stats.total` equals the length of `entries` after filtering (before truncation).

### Rendered Output (user-visible)

**Small directory**:

```
Listed 3 items in /home/user/project:
──────────────────────────────────────────────────
DIR               src/
FILE      1234 B  package.json
FILE      5678 B  README.md
──────────────────────────────────────────────────
Total: 3 items (1 directory, 2 files)
```

**With `ignore`** (3 items filtered out):

```
Listed 2 items in /home/user/project:
──────────────────────────────────────────────────
DIR               src/
FILE      1234 B  package.json
──────────────────────────────────────────────────
[3 items hidden by ignore patterns]

Total: 2 items (1 directory, 1 file)
```

**Large directory (truncated)**:

```
Listed 150 items in /home/user/large-project:
──────────────────────────────────────────────────
DIR               src/
DIR               tests/
FILE       100 B  file000.ts
FILE       101 B  file001.ts
... (first 100 items)
──────────────────────────────────────────────────
[50 items truncated, showing first 100 of 150 total]

Total: 150 items (2 directories, 148 files)
```

Note that the shown items are the **sorted head** of the listing, so directories always appear before the truncation cut.

**Empty directory** — an empty listing gets one sentence instead of a separator-framed block with no body:

```
Directory /home/user/empty is empty.
```

**Empty result, but not an empty directory** — when `ignore` hid every item, the output says so instead of claiming the directory is empty:

```
Directory /home/user/project is not empty. The ignore patterns hid 5 items.
```

These two cases are deliberately distinct. Without the second wording the model would conclude the directory holds nothing, when in fact the caller's own `ignore` patterns removed everything.

## Dependencies

- `@deepseek-ai/cordis`: Plugin framework
- `@deepseek-ai/dsh-tools`: Tool definition utilities
- `@deepseek-ai/dsh-fs`: Filesystem service
- `@deepseek-ai/dsh-system-prompt`: System prompt utilities
- `@deepseek-ai/schemastery`: Configuration schema validation

## License

MIT
