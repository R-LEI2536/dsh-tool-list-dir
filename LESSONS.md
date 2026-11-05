# 开发经验

> 记录 dsh-tool-list-dir 开发过程中踩过的坑与形成的约定。
> 架构/性能对比结论见 [TODO.md](./TODO.md) 第 3 节，版本变更见 [CHANGELOG.md](./CHANGELOG.md)。

## 1. 验证必须打到编译产物上

**观测**：重新 `tsc` 编译 `lib/` 之后，会话里的 `list_directory` 仍然输出旧文案。

有两种可能，未最终确认：插件只在会话启动时加载一次；或者会话加载的是另一份已安装的副本而非本仓库的 `lib/`。无论哪种，结论相同——**改完 `src/` 之后，不能靠在会话里调用工具来验证**。

后果是双向的误判：可能误以为"改动没生效"，也可能反过来误以为"生效了"。

四条可用的验证路径（前两条跑在编译产物上）：

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

2. **仓库自带冒烟测试**（0.4.0 起）：`pnpm test`。`pretest` 先 `tsc`，再在 **`lib/` 产物**上用假 ctx 断言工具契约、相对路径解析、排序/截断、`ignore` 计数与空/被滤空两种文案。和路径 1 一样是假 `fs`，区别是它常驻仓库、可重复、失败即信号。

3. **用 list 工具本身测**：真实链路——真 fs、真入参校验、真输出 schema 校验。但只反映会话启动时那一份代码。

4. **重启会话**，再用工具测。

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
- **相对路径必须走 `ctx.workingDirectory.ensure(exec.agent, exec.signal)`。** DSH 0.2.1 起 `Session.header.cwd` 只是会话**原始**项目身份/权限根，`working_directory` 执行 `cd` 后它不变；官方 `@deepseek-ai/dsh-tool-fs` 就是这么解析的（`session-cwd.ts`）。非 agent 调用（`exec.agent === undefined`）不传 `cwd`，由 fs 后端决定。代价：插件 `inject` 多一个 `workingDirectory`，profile 里没有这个服务就会一直 PENDING。
- **peer 范围就是启动门。** `^0.2.1-rc.1` 这类范围同时接受 `rc.1`/`rc.2`，但**不含**更低宿主；写精确版本（`0.2.1-rc.1`）会在下一个 rc 立刻被拒，`^0.2.1`（不带 prerelease）当下就被拒。

## 4. 工具使用与协作

- **专用工具优先于 shell。** 浏览目录用 `list_directory`，读文件用 read，搜索用 grep / glob；不要用 `ls` / `cat` 去探测。
- **测试优先用被测工具本身。** 只有在需要验证编译产物（第 1 节）时才写临时脚本，且跑完即删。

## 5. 版本与发布

- 提交信息用 Conventional Commits（`feat:` / `fix:` / `docs:` / `refactor:` / `chore:`），正文说清"为什么"而不只是"做了什么"。
- tag 是 annotated，命名 `vX.Y.Z`，message 形如 `0.3.2 — count/number agreement`。
- `lib/` **提交进仓库**（git 跟踪）。所以改完 `src/` 必须重新 `tsc`，并把产物和源码一起提交。
- **npm 默认缓存 `~/.npm` 在沙箱内只读**，直接 `npm whoami` / `npm publish` 会 EROFS；把 `npm_config_cache` 指到工作区内目录（如 `.pnpm-cache/npm`）就能正常发布（0.4.2 的发版命令按此执行）。查版本用 `pnpm view`。
- **远端是 GitHub**（`git@github.com:R-LEI2536/dsh-tool-list-dir.git`）。22 端口可能被阻断，`git push` / `fetch` / `ls-remote` 报 `Connection reset` 时改用 `ssh://git@ssh.github.com:443/<owner>/<repo>.git` 的 URL 形式，配 `GIT_SSH_COMMAND` 的 `-F /dev/null -o IdentitiesOnly=yes -i <绝对私钥> -o ConnectTimeout=10`。
- 安装依赖用 `pnpm install --store-dir=.pnpm-cache/v11`（本仓库的 store 不在默认位置，否则 pnpm 会因为 store 不一致要求清空 `node_modules`）。
- pnpm 11 的供应链 release-age 策略会把**刚发布**的预发布版挡在门外：0.4.0 时 `^0.2.1-rc.1` 解析成 `0.2.1-rc.1` 而不是 `rc.2`。所以**要对着目标 rc 做类型验证，就把 devDeps 精确钉到那个版本**（devDeps 不进兼容门）；0.4.1 钉 `0.2.1-rc.5` 后就真的装到了 rc.5。peer 仍保持宽范围 `^0.2.1-rc.1`。**锁文件里"仍满足新范围"的旧版本不会自己升级**：0.4.2 把 cordis 从 `~4.0.5` 放宽成 `^4.0.5` 后重装，锁文件仍停在 `4.0.5`，必须精确钉 `4.1.0`（或 `pnpm update`）才会换到新基底。
- **`~` 的上界很窄，`~3.18.5` 到不了 `3.19.0`。** DSH `0.2.2-rc.1` 全族把 `@deepseek-ai/cordis ~4.1.0` 声明成 peer；schemastery 则在 dsh-tools / dsh-system-prompt / dsh-working-directory 等包里是 dependency `~3.19.0`（不是 peer）。peer 要放宽到 `^4.0.5` / `^3.18.5`，dev 要精确钉 `4.1.0` / `3.19.0`。`pnpm peers check` 是发现这种错配最快的信号（install 末尾会提示 "Issues with peer dependencies"），别忽略它。
- **兼容门表要按运行时版本读，不能按结论抄。** 指南 §1.1 把 `^0.2.1` / `~0.2.1` / `>=0.2.1` 在 `0.2.2-rc.1` 运行时下也标成 ❌；用真实函数实算，三门**全部通过**——`0.2.2-rc.1` 数值上高于 `0.2.1`，`includePrerelease: true` 只负责不再排除预发布。这三门在任何低于 `0.2.1` 的运行时上被拒（实测 `0.2.1-rc.5`、`0.2.0-rc.2` 都拒）。**门禁结论一律以 `evaluatePluginCompatibility` 的实跑为准**，指南表格只在它跑不了的时候作参考。
- **DSH 0.2.2 起 `engines.node` 是 `>=24.9.0`**（0.2.1 是 `^22.19.0 || >=24.0.0`）。构建/CI 不能再指望 Node 22。
- **宿主还没升级时也能验门禁**：用宿主自带 `@deepseek-ai/dsh-app-boot` 的 `evaluatePluginCompatibility(manifest, {}, '<目标版本>')` 显式传目标 runtime。0.4.2 在 rc.5 宿主上验了 `0.2.2-rc.1`；rc.1 树里同一文件的谓词只有一行 `semver.satisfies(runtimeVersion, range, { includePrerelease: true })`，与 rc.5 逐字相同。
- **复算门禁要用宿主自带的 semver（当前 7.8.6）。** npm 自带的 semver 7.8.1 对 `satisfies('0.2.1-rc.5', '^0.2.1', { includePrerelease: true })` 返回 `true`，宿主自带的 7.8.6 返回 `false`；拿错版本会得出"`^0.2.1` 能过门"的错误结论。宿主自带的 semver 可以用 `createRequire(<dsh>/lib/bin.js)` 解析到。
- **host 工具插件的 rc 升级通常只是依赖对齐。** 0.4.1 和 0.4.2 用目标 rc 声明重新 `tsc` 后 `lib/` 都逐字节未变，说明消费的 API 签名没变（依赖自身的 `.d.ts` 有重构，如 dsh-tools 把 types 拆成多个子模块，但不影响本插件产物与类型面）。没有 diff 就不要硬编一个"升级"改动；把力气花在版本声明、lockfile 和验证证据上。

## 6. 诚实边界

DSH 的 `fs` 后端编译在宿主里，不在 `node_modules`，读不到实现。因此"我们的 `listDir` 比 qwen 快"**未经证实**；能证实的只有"本工具层不做串行 IO，且 `isConcurrencySafe: true`"。

## 7. 遗留

- `CHANGELOG.md` 引用了从不存在的 tag `v0.1.0`、`v0.2.0`，对应的 compare 链接会 404。修法未定：要么回溯补 tag，要么改掉链接指向。
- 未做：把 `.gitignore` / `.qwenignore` 解析做进本插件（决定见 [TODO.md](./TODO.md) 第 3 节）。
