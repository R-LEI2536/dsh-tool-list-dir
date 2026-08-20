# dsh-tool-list-dir

**版本 0.2.0**

[English](./README.md)

一个轻量级、只读的目录列表工具，专为 [dsh-user-approval](https://github.com/R-LEI2536/dsh-user-approval) 设计。

## 功能特性

- **智能排序**：目录优先，然后是文件，组内按字母排序
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
    # 自定义系统提示指导顺序（默认：100）
    order: 150
    
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
| `order` | number | `100` | 系统提示指导部分的顺序。数值越大，在提示词中出现得越靠后。 |
| `guidance` | string | *(见默认值)* | 显示给模型的自定义指导文本。可用于提供特定上下文的指令。 |
| `maxEntries` | number | `100` | 返回的最大条目数。范围：1-1000。更大的目录会被截断。 |

### 默认指导文本

```
Use the list_directory tool — not shell commands like ls — to browse directory structures. When truncated use glob to find files by name pattern, or grep to search file contents. Use this for understanding project layouts.
```

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

### 渲染输出（用户可见）

**小型目录**：

```
Listed 3 items in /home/user/project:
──────────────────────────────────────────────────
DIR            -  src/
DIR            -  tests/
FILE    1234 B  package.json
──────────────────────────────────────────────────
Total: 3 entries (2 directories, 1 file)
```

**大型目录（截断）**：

```
Listed 150 items in /home/user/large-project:
──────────────────────────────────────────────────
DIR            -  src/
DIR            -  tests/
... (前 100 条)
──────────────────────────────────────────────────
[50 items truncated, showing first 100 of 150 total]

Total: 150 entries (30 directories, 120 files)
```

## 依赖

- `@deepseek-ai/cordis`: 插件框架
- `@deepseek-ai/dsh-tools`: 工具定义工具
- `@deepseek-ai/dsh-fs`: 文件系统服务
- `@deepseek-ai/dsh-system-prompt`: 系统提示工具
- `@deepseek-ai/schemastery`: 配置 schema 验证

## 许可证

MIT
