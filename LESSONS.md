# 开发经验

> 记录 dsh-tool-list-dir 开发过程中踩过的坑与形成的约定。
> 架构/性能对比结论见 [TODO.md](./TODO.md) 第 3 节，版本变更见 [CHANGELOG.md](./CHANGELOG.md)。

## 1. 验证必须打到编译产物上

**观测**：重新 `tsc` 编译 `lib/` 之后，会话里的 `list_directory` 仍然输出旧文案。

有两种可能，未最终确认：插件只在会话启动时加载一次；或者会话加载的是另一份已安装的副本而非本仓库的 `lib/`。无论哪种，结论相同——**改完 `src/` 之后，不能靠在会话里调用工具来验证**。

后果是双向的误判：可能误以为"改动没生效"，也可能反过来误以为"生效了"。

三条可用的验证路径：

1. **直接执行编译产物**（本次采用，不落任何文件）：

   ```bash
   node --input-type=module -e "
   import * as plugin from './lib/index.js';
   const reg = [];
   const ctx = { systemPrompt: { section() {} }, tools: { register: t => reg.push(t) },
     fs: { resolve: async p => ({ displayPath: p, targetKey: p }),
           listDir: async () => [ /* 假条目 */ ] } };
   plugin.apply(ctx, { order: 1350, guidance: '', maxEntries: 100 });
   const tool = reg[0];
   const args = { path: '/p', ignore: ['*.tmp'] };
   const v = await tool.execute(args, { signal: undefined, agent: undefined });
   console.log(tool.output.render(args, v).map(p => p.text).join('\n'));
   "
   ```

   这一层只覆盖 `execute` + `render`，`ctx.fs` 是假的，测不到真实的文件系统行为。

2. **用 list 工具本身测**：真实链路——真 fs、真入参校验、真输出 schema 校验。但只反映会话启动时那一份代码。

3. **重启会话**，再用工具测。

**验证要写断言，不要"看着对"。** 单复数那个 bug（`Total: 3 entrys`）是断言抓到的，肉眼读代码没看出来。

## 2. 输出文案的约定

- **一个名词。** 渲染输出里所有"被列出的东西"一律叫 item/items。`entries` 只保留为 JSON 字段名和内部标识符——改字段名是破坏输出契约，不值得为文案清理去做。
- **计数一律走 `plural(count, singular, pluralForm)`，两个形式都必填。** 曾给它默认值 `${singular}s`，于是输出 `Total: 3 entrys`。英语复数不总是加 s，默认值在这里是陷阱。
- **`total === 0` 有两种含义，不能合并**：目录真的是空的，vs 调用方的 `ignore` 把内容全滤掉了。后者若说成 "is empty"，模型会断定目录里什么都没有。
- **排序必须发生在截断之前。** 先切片再排序，展示的是任意切片，"目录优先"的承诺形同虚设。
- **`stats` 描述过滤后的集合**，`stats.total` 等于实际返回的条目数。
- 面向模型的文案（工具 `description`、参数 `description`、渲染输出）用同一套词汇，不要一处 `entry` 一处 `item`。

## 3. DSH 插件的硬事实

- 工具返回值由注册表按 `output.schema` **运行时校验**，不合规直接抛 `ToolOutputError`；入参在 `defineTool` 包装过的 `execute` 之前校验，抛 `ToolArgsError`。这是 qwen-code 没有的一层（qwen 只校验入参，返回值是无类型的 `llmContent`）。
- `ToolCallKind`（`'read'` / `'edit'`）只是 UI 呈现语义，**不是权限**。DSH 工具无法自己声明权限。
- 审批是独立的 `dsh-user-approval` 服务：一次性、必须在回合内、fail-closed、只有 ask/never、无规则记忆、无路径匹配。

## 4. 工具使用与协作

- **专用工具优先于 shell。** 浏览目录用 `list_directory`，读文件用 read，搜索用 grep / glob；不要用 `ls` / `cat` 去探测。
- **测试优先用被测工具本身。** 只有在需要验证编译产物（第 1 节）时才写临时脚本，且跑完即删。

## 5. 版本与发布

- 提交信息用 Conventional Commits（`feat:` / `fix:` / `docs:` / `refactor:` / `chore:`），正文说清"为什么"而不只是"做了什么"。
- tag 是 annotated，命名 `vX.Y.Z`，message 形如 `0.3.2 — count/number agreement`。
- `lib/` **提交进仓库**（git 跟踪）。所以改完 `src/` 必须重新 `tsc`，并把产物和源码一起提交。
- 本沙箱里 npm 不可用（`npm whoami` 报 `EROFS`），发布需要能写 npm 配置的环境和凭据。
- 未 push 到远端。

## 6. 诚实边界

DSH 的 `fs` 后端编译在宿主里，不在 `node_modules`，读不到实现。因此"我们的 `listDir` 比 qwen 快"**未经证实**；能证实的只有"本工具层不做串行 IO，且 `isConcurrencySafe: true`"。

## 7. 遗留

- `package.json` 仍是 `0.3.2`，但代码已与 tag `v0.3.2` 不一致（`92dbc53` 统一了名词）。发 0.3.3 需要：版本号、README 版本行、CHANGELOG 一节、打 tag。
- `README.md` 第 3 行的 `**Version 0.3.0**` 早已过期。
- `CHANGELOG.md` 引用了从不存在的 tag `v0.1.0`、`v0.2.0`，对应的 compare 链接会 404。
- 未做：把 `.gitignore` / `.qwenignore` 解析做进本插件（决定见 [TODO.md](./TODO.md) 第 3 节）。
