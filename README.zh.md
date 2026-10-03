# dsh-tool-list-dir

**版本 0.3.3**

[English](./README.md)

一个轻量级、只读的目录列表工具，专为 [dsh-user-approval](https://github.com/R-LEI2536/dsh-user-approval) 设计。

## 功能特性

- **智能排序**：目录优先，然后是文件，组内按字母排序 —— **先排序再截断**，所以截断后展示的始终是"目录优先"的那一段
- **条目过滤**：可选的 `ignore` glob 模式会略过匹配的条目，并在结果中回报被隐藏的条数
- **统计信息**：显示总数、文件数和目录数
- **自动截断**：默认限制输出 100 条（可配置）
- **类型和大小信息**：显示条目类型（DIR/FILE）和文件大小
- **系统提示指导**：为模型提供使用指导

## 安装方式

```bash
dsh plugin --profile web add @rh854lkjd/dsh-tool-list-dir
```

## 配置说明

### 自定义配置

你可以在 agent preset 或 `cordis.patch.yml` 中自定义工具行为：

```yaml
- id: tool-list-dir
  name: @rh854lkjd/dsh-tool-list-dir
  config:
    # 自定义系统提示指导顺序（默认：1350）
    order: 1350
    
    # 自定义指导文本
    guidance: |
      使用 list_directory 浏览项目结构。
      结果显示文件大小和类型。
      按类型和名称排序。
    
    # 截断前的最大条目数（1-1000，默认：100）
    maxEntries: 200
```

### 禁用工具

```yaml
- id: tool-list-dir
  name: @rh854lkjd/dsh-tool-list-dir
  disabled: true
```

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `order` | number | `1350` | 系统提示指导部分的顺序。默认 `1350` 落在 DSH 0.1.5 工具描述带（1000-2900）内的 `TOOL_EDIT`（1300）与 `TOOL_GLOB`（1400）之间。数值越大，在提示词中出现得越靠后。 |
| `guidance` | string | *(见默认值)* | 显示给模型的自定义指导文本。可用于提供特定上下文的指令。 |
| `maxEntries` | number | `100` | 返回的最大条目数。范围：1-1000。更大的目录会被截断。 |

### 默认指导文本

```
Use the list_directory tool — not shell commands like ls — to browse directory structures. When truncated use glob to find files by name pattern, or grep to search file contents. Use this for understanding project layouts.
```

## 工具参数

以下是**每次调用**的参数，不是插件配置项。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | string | 是 | 要列出的目录，按会话工作目录解析，允许相对路径。 |
| `ignore` | string[] | 否 | 匹配条目**文件名（basename）**的 glob 模式。`*` 和 `?` 是仅有的通配符，其余字符一律按字面量处理。匹配到的条目会被略过。 |

```json
{ "path": "src", "ignore": ["*.test.ts", "node_modules"] }
```

`ignore` 的语义与 qwen-code 的 `list_directory` 一致，同一个模式在两边含义相同。

## 工具输出

### JSON 结构（给模型的）

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

**当条目过多被截断时**（超过 `maxEntries`）：

```json
{
  "path": "/home/user/large-project",
  "entries": [ /* 前 100 条 */ ],
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

**当条目被过滤时**（有 `ignore` 模式命中）：

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

没有被过滤时 `ignored` 字段不出现。`stats` 始终描述**实际返回**的条目 —— `stats.total` 等于过滤后（截断前）`entries` 的长度。

### 渲染输出（用户可见）

**小型目录**：

```
Listed 3 items in /home/user/project:
──────────────────────────────────────────────────
DIR               src/
FILE      1234 B  package.json
FILE      5678 B  README.md
──────────────────────────────────────────────────
Total: 3 items (1 directory, 2 files)
```

**使用 `ignore`**（过滤掉 3 条）：

```
Listed 2 items in /home/user/project:
──────────────────────────────────────────────────
DIR               src/
FILE      1234 B  package.json
──────────────────────────────────────────────────
[3 items hidden by ignore patterns]

Total: 2 items (1 directory, 1 file)
```

**大型目录（截断）**：

```
Listed 150 items in /home/user/large-project:
──────────────────────────────────────────────────
DIR               src/
DIR               tests/
FILE       100 B  file000.ts
FILE       101 B  file001.ts
... (前 100 条)
──────────────────────────────────────────────────
[50 items truncated, showing first 100 of 150 total]

Total: 150 items (2 directories, 148 files)
```

注意展示的是排序后的**前一段**，所以目录一定会出现在截断点之前。

**空目录** —— 空结果只给一句话，不再渲染成两条分隔线夹着空内容：

```
Directory /home/user/empty is empty.
```

**结果为空，但目录并不空** —— 当 `ignore` 把每一条都挡住了，输出会说明这一点，而不是声称目录是空的：

```
Directory /home/user/project is not empty. The ignore patterns hid 5 items.
```

这两种情况是刻意分开的。少了第二种写法，模型会断定目录里什么都没有，而实际上是调用方自己的 `ignore` 模式把条目全部移除了。

## 依赖

- `@deepseek-ai/cordis`: 插件框架
- `@deepseek-ai/dsh-tools`: 工具定义工具
- `@deepseek-ai/dsh-fs`: 文件系统服务
- `@deepseek-ai/dsh-system-prompt`: 系统提示工具
- `@deepseek-ai/schemastery`: 配置 schema 验证

## 许可证

MIT
