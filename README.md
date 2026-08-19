# dsh-tool-list-dir

**Version 0.2.0**

[中文](./README.zh.md)

A lightweight, read-only directory listing tool for [dsh-user-approval](https://github.com/R-LEI2536/dsh-user-approval).

一个轻量级、只读的目录列表工具，专为 [dsh-user-approval](https://github.com/R-LEI2536/dsh-user-approval) 设计。

## Features

- **Smart Sorting**: Directories first, then files, alphabetically within each group
- **Statistics**: Shows total count, files, and directories
- **Truncation**: Limits output to 100 entries by default (configurable)
- **Type & Size Info**: Displays entry type (DIR/FILE) and file sizes
- **System Prompt Guidance**: Includes usage guidance for the model

## Installation

### From GitHub

```bash
dsh plugin --profile web add github:your-org/dsh-tool-list-dir
```


## Configuration

### Basic Usage (with all defaults)

```yaml
- id: tool-list-dir
  name: dsh-tool-list-dir
```

This uses default values:
- `order`: 100
- `guidance`: Standard guidance text (see below)
- `maxEntries`: 100

### Custom Configuration

You can customize the tool behavior in your agent preset:

```yaml
- id: tool-list-dir
  name: dsh-tool-list-dir
  config:
    # Custom system prompt guidance order (default: 100)
    order: 150
    
    # Custom guidance text for the model
    guidance: |
      Use list_directory to browse project structures.
      Results show file sizes and types.
      Sorted by type and name.
    
    # Maximum entries before truncation (1-1000, default: 100)
    maxEntries: 200
```

### Disable the Tool

```yaml
- id: tool-list-dir
  disabled: true
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `order` | number | `100` | Order of the system prompt guidance section. Higher values appear later in the prompt. |
| `guidance` | string | *(see default)* | Custom guidance text shown to the model. Use this to provide context-specific instructions. |
| `maxEntries` | number | `100` | Maximum number of entries to return. Range: 1-1000. Larger directories are truncated. |

### Default Guidance Text

```
Use the list_directory tool — not shell commands like ls — to browse directory structures. When truncated use glob to find files by name pattern, or grep to search file contents. Use this for understanding project layouts.
```

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
  "entries": [ /* first 100 entries */ ],
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

### Rendered Output (user-visible)

**Small directory**:

```
Listed 3 items in /home/user/project:
──────────────────────────────────────────────────
DIR            -  src/
DIR            -  tests/
FILE    1234 B  package.json
──────────────────────────────────────────────────
Total: 3 entries (2 directories, 1 file)
```

**Large directory (truncated)**:

```
Listed 150 items in /home/user/large-project:
──────────────────────────────────────────────────
DIR            -  src/
DIR            -  tests/
... (first 100 entries)
──────────────────────────────────────────────────
[50 items truncated, showing first 100 of 150 total]

Total: 150 entries (30 directories, 120 files)
```

## Dependencies

- `@deepseek-ai/cordis`: Plugin framework
- `@deepseek-ai/dsh-tools`: Tool definition utilities
- `@deepseek-ai/dsh-fs`: Filesystem service
- `@deepseek-ai/dsh-system-prompt`: System prompt utilities
- `@deepseek-ai/schemastery`: Configuration schema validation

## License

MIT
