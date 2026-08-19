# dsh-tool-list-dir

一个轻量级、只读的目录列表工具，专为 DeepSeek Harness 设计。

## 功能特性

- **智能排序**：目录优先，然后是文件，组内按字母排序
- **统计信息**：显示总数、文件数和目录数
- **自动截断**：默认限制输出 100 条（可配置）
- **类型和大小信息**：显示条目类型（DIR/FILE）和文件大小
- **系统提示指导**：为模型提供使用指导

## 安装方式

### 方式 1：从 npm 安装（发布后）
```bash
dsh plugin --profile web add dsh-tool-list-dir
```

### 方式 2：从本地目录安装
```bash
dsh plugin --profile web add link:/path/to/dsh-tool-list-dir
```

### 方式 3：从 GitHub 安装
```bash
dsh plugin --profile web add github:your-org/dsh-tool-list-dir#main
```

## 配置说明

在 `cordis.patch.yml` 中添加：

### 基础用法（使用默认配置）

```yaml
- id: tool-list-dir
  name: dsh-tool-list-dir
```

### 自定义配置

```yaml
- id: tool-list-dir
  name: dsh-tool-list-dir
  config:
    order: 150                    # 系统提示指导的顺序（默认：100）
    guidance: '自定义指导文本'     # 自定义指导文本
    maxEntries: 200               # 截断前的最大条目数（1-1000，默认：100）
```

### 禁用工具

```yaml
- id: tool-list-dir
  disabled: true
```

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `order` | number | `100` | 系统提示指导部分的顺序 |
| `guidance` | string | *(见下方默认值)* | 自定义指导文本 |
| `maxEntries` | number | `100` | 返回的最大条目数（1-1000） |

### 默认指导文本

```
Use the list_directory tool — not shell commands like ls — to browse directory structures. 
Results are sorted (directories first, then files), include type and size information, 
and show statistics. Use this for understanding project layouts.
```

## 工具输出

### JSON 结构

工具向模型返回结构化的 JSON 对象：

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

**当条目过多被截断时**：
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

## 开发指南

### 构建

```bash
npm run build
```

### 测试

安装后，在 DSH 会话中测试：

```
# 模型可以调用：
list_directory(path: "/home/user")
```

## 与 Qwen Code 的对比

此工具受 Qwen Code 的 `list_directory` 工具启发，具有相似的功能：

- ✅ 在 100 条时截断
- ✅ 排序输出（目录优先）
- ✅ 类型和大小信息
- ✅ 统计信息显示
- ✅ 系统提示指导

**主要区别**：DSH 将 JSON 输出（给模型）与渲染文本（给用户）分离，遵循 DSH 最佳实践。

## 依赖

- `@deepseek-ai/cordis`: 插件框架
- `@deepseek-ai/dsh-tools`: 工具定义工具
- `@deepseek-ai/dsh-fs`: 文件系统服务
- `@deepseek-ai/dsh-system-prompt`: 系统提示工具
- `@deepseek-ai/schemastery`: 配置 schema 验证

## 许可证

MIT

## 作者

DeepSeek Harness Community
