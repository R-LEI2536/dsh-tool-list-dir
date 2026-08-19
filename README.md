# dsh-tool-list-dir

A lightweight, read-only directory listing tool for DeepSeek Harness.

## Features

- **Smart Sorting**: Directories first, then files, alphabetically within each group
- **Statistics**: Shows total count, files, and directories
- **Truncation**: Limits output to 100 entries by default (configurable)
- **Type & Size Info**: Displays entry type (DIR/FILE) and file sizes
- **System Prompt Guidance**: Includes usage guidance for the model

## Installation

### Option 1: From npm (when published)
```bash
dsh plugin --profile web add dsh-tool-list-dir
```

### Option 2: From local directory
```bash
dsh plugin --profile web add link:/path/to/dsh-tool-list-dir
```

### Option 3: From GitHub
```bash
dsh plugin --profile web add github:your-org/dsh-tool-list-dir#main
```

## Configuration

Add to your `cordis.patch.yml`:

### Basic Usage (with defaults)

```yaml
- id: tool-list-dir
  name: dsh-tool-list-dir
```

### With Custom Configuration

```yaml
- id: tool-list-dir
  name: dsh-tool-list-dir
  config:
    order: 150                    # System prompt guidance order (default: 100)
    guidance: 'Custom guidance'   # Custom guidance text for the model
    maxEntries: 200               # Max entries before truncation (1-1000, default: 100)
```

### Disable the Tool

```yaml
- id: tool-list-dir
  disabled: true
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `order` | number | `100` | Order of the system prompt guidance section |
| `guidance` | string | *(see default below)* | Custom guidance text for the model |
| `maxEntries` | number | `100` | Maximum number of entries to return (1-1000) |

### Default Guidance Text

```
Use the list_directory tool — not shell commands like ls — to browse directory structures. 
Results are sorted (directories first, then files), include type and size information, 
and show statistics. Use this for understanding project layouts.
```

## Tool Output

### JSON Structure

The tool returns a structured JSON object to the model:

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
  }
}
```

**When truncated (more than maxEntries)**:
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

### Rendered Output (User-Visible)

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

## Development

### Build

```bash
npm run build
```

### Test

After installation, test the tool in a DSH session:

```
# The model can call:
list_directory(path: "/home/user")
```

## Comparison with Qwen Code

This tool is inspired by Qwen Code's `list_directory` tool, with similar features:

- ✅ Truncation at 100 entries
- ✅ Sorted output (directories first)
- ✅ Type and size information
- ✅ Statistics display
- ✅ System prompt guidance

**Key difference**: DSH separates JSON output (for the model) from rendered text (for users), following DSH best practices.

## License

MIT

## Dependencies

- `@deepseek-ai/cordis`: Plugin framework
- `@deepseek-ai/dsh-tools`: Tool definition utilities
- `@deepseek-ai/dsh-fs`: Filesystem service
- `@deepseek-ai/dsh-system-prompt`: System prompt utilities
- `@deepseek-ai/schemastery`: Configuration schema validation
