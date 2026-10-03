# 待办

## 1. 复制仓库 ✅
- [x] 复制本仓库（dsh-tool-list-dir）作为新插件的起点
- [x] 新仓库改名：package name、cordis.patch.yml、README、repository

## 2. 做成工具集 ✅
- [x] 保留 list_directory
- [ ] 后续可继续加工具

## 3. 与 qwen-code 的架构与性能对比（待做）
对比对象：`ref_codes/qwen-code-main/packages/core/src/tools/ls.ts`（qwen 的 `list_directory`）。
背景：0.3.0 已补齐两项功能差距（先排序再截断、`ignore` 参数 + `ignored` 计数），本次对比只看**架构**和**性能**。

- [ ] 架构差异
  - [ ] 工具注册模型：DSH `defineTool` + 插件 `apply(ctx)`（声明式、schema 驱动、输出投影）
        vs qwen `BaseDeclarativeTool` + `BaseToolInvocation` + `createInvocation`（命令式、面向对象）
  - [ ] 权限模型：DSH 由 policy 层（dsh-user-approval）统一裁决
        vs qwen 工具自带 `getDefaultPermission()`（工作区内 allow / 区外 ask）
  - [ ] 过滤体系：我们无 vs qwen `FileDiscoveryService` + `filterFilesWithReport`（.gitignore / .qwenignore 全家桶）
  - [ ] 错误词汇：DSH `FsError` 结构化 code（FS_NOT_FOUND / FS_NOT_DIRECTORY …）
        vs qwen `ToolErrorType`（注意其 `if (!stats)` 分支是死代码，实际落 LS_EXECUTION_ERROR）
  - [ ] 输出契约：DSH 强制 output schema + render 投影 vs qwen 只有 `llmContent` / `returnDisplay` 两个字符串
- [ ] 性能差异
  - [ ] 元数据获取：qwen 对每个条目串行 `await fs.stat`（N 次 syscall，无并发）
        vs 我们 `ctx.fs.listDir` 一次性返回 name/type/size
  - [ ] 排序与截断成本（我们已改为排序后截断，需评估大目录下的实际开销）
  - [ ] 并发安全：我们 `isConcurrencySafe: true` vs qwen 无此概念
  - [ ] 大目录 / 慢盘下的实测表现
- [ ] 产出结论：是否值得补第三块能力（`.gitignore` / `.qwenignore` 支持）
      注意 DSH 的 `listDir` 没有任何过滤入口，真要做得自己实现完整 gitignore 语义（`!` 否定、目录锚定、嵌套），成本不低。

## 备注
- 原计划新增的 read 工具（按行范围读取）取消：DSH 官方 read 已支持该功能。
