# 待办

## 1. 复制仓库 ✅
- [x] 复制本仓库（dsh-tool-list-dir）作为新插件的起点
- [x] 新仓库改名：package name、cordis.patch.yml、README、repository

## 2. 做成工具集 ✅
- [x] 保留 list_directory
- [ ] 后续可继续加工具

## 3. 与 qwen-code 的架构与性能对比 ✅
对比对象：`ref_codes/qwen-code-main/packages/core/src/tools/ls.ts` 及其周边（tools.ts / tool-registry.ts / permission-manager.ts / fileDiscoveryService.ts）。
背景：0.3.0 已补齐两项功能差距（先排序再截断、`ignore` 参数 + `ignored` 计数），本次只看**架构**和**性能**。

- [x] 架构差异
  - [x] 工具注册模型：qwen 是 `BaseDeclarativeTool`（每个工具类持有 schema）+ `BaseToolInvocation`（每次调用一个实例），`build()` = 校验 → `createInvocation()`；
        DSH 是 `defineTool()` 声明式定义 + cordis 插件 `apply(ctx)` 注册，参数与输出都编译成 JSON Schema
  - [x] 权限模型：qwen 由工具自带 `getDefaultPermission()` 声明默认值，中央 PermissionManager 只在**有规则命中**时才覆盖；规则可持久化、支持 `Read` 元类别和路径前缀匹配。
        DSH 的工具**无法声明权限**（`ToolCallKind` 只是 UI 图标语义），审批是独立的 `dsh-user-approval` 服务：一次性、必须在回合内、fail-closed、只有 ask/never、没有规则记忆
  - [x] 过滤体系：qwen 有 `FileDiscoveryService`（进程内 `ignore` 库解析 .gitignore/.qwenignore，带缓存但**无失效机制**）；我们完全没有，只有 0.3.0 新增的调用级 `ignore`
  - [x] 错误词汇：DSH `FsError` 结构化 code；qwen `ToolErrorType` 枚举（`ls.ts` 的 `FILE_NOT_FOUND` 分支是死代码）
  - [x] 输出契约：**最大结构差异** —— DSH 在注册表里用 `output.schema` 校验 execute 返回值（不合法直接 `ToolOutputError`）；
        qwen 只校验输入参数，返回值是 `llmContent` + `returnDisplay` 两个无类型字符串，不做任何校验
- [x] 性能差异（实测：10000 条目、热缓存）
  - [x] qwen 逐条目**串行** `await fs.stat`：78.7 ms；同样的事并行做 52.8 ms
  - [x] 纯 `readdir` 2.0 ms；`readdir({withFileTypes:true})` 2.4 ms —— 但 Dirent **不带 size**
  - [x] 结论：`size` 必须靠 stat 拿，所以"带大小的列表"这件事本身就要 ~45–53 ms/万条，两边都躲不掉；
        qwen 真正的额外代价是**串行**，约 1.5×
  - [x] 两边都在**截断前**对全部条目做 stat 和匹配（qwen 上限 100 行，却处理 1 万条）；DSH 的 `listDir` 是全有全无的，我们也无法只 stat 要展示的那 100 条
- [x] 产出结论：**不补 gitignore**
      qwen 的过滤是 harness 级服务（Config 持有的单例、跨工具共享、带缓存），不是工具级功能。
      要在 DSH 里以工具级实现，得自己造：root→leaf 的 .gitignore 发现与嵌套模式重写、`.git/info/exclude`、`!` 否定语义、缓存与失效 —— 而 `listDir` 不提供任何钩子。
      0.3.0 的 `ignore` 参数已经覆盖 80% 场景（node_modules、*.log）且几乎零成本。真要做，应该做进 DSH 的 fs 服务，而不是这个插件。

## 4. 发布 0.3.3 ✅
- [x] `package.json` 版本号 `0.3.2` → `0.3.3`
- [x] 修正两个 README 第 3 行的版本行（一直停在 `0.3.0`）
- [x] `CHANGELOG.md` 补 `[0.3.3]` 一节
- [x] 打 annotated tag `v0.3.3`，指向 `fb506ea`

## 5. 遗留
- [ ] 修正 `CHANGELOG.md` 中引用的 `v0.1.0`、`v0.2.0`：这两个 tag 从不存在，对应的 compare 链接会 404。修法未定 —— 要么回溯补 tag，要么改掉链接指向。

## 备注
- 开发经验（验证方式、输出文案约定、DSH 插件硬事实、发布规范）见 [LESSONS.md](./LESSONS.md)
- 原计划新增的 read 工具（按行范围读取）取消：DSH 官方 read 已支持该功能。
