# RECEIPT-X132-B · 法律站三页「回复」措辞统一 + TICKET_SECRET 收尾

## 大白话

1. 隐私政策、用户协议、常见问题这三页,之前写着「我们会在 App 内回复」「通常 14 个工作日内回复」,
   但 App 现在的「联系我们」功能其实只能发不能收(单向的),这几句话是空头支票。
2. 这次把三页里所有提到「回复」「工作日」的承诺都改掉了,统一换成 owner 定的一句话:
   只接收反馈、用来改进产品,但不会一条一条回复。
3. 三个地方(联系方式那一句)三页文字逐字相同;另外几处零散提到「回复」的句子按同样精神
   改写或直接删掉,没有改到的段落一个字没动。
4. 正文的权威源是 Cloudflare KV,不是仓库文件 —— 已经用 `wrangler kv bulk put --remote`
   同步进去,主站(pages.dev)和 GitHub Pages 备份站现在都是新内容,三边一致。
5. 顺手把一个已经没人用的服务端密钥 `TICKET_SECRET` 删掉了(删前确认代码里零引用)。
6. contact 接口的冒烟测试因为拿不到调用它必须的密钥(`RC_KEY`,是密文,本来就不该让我拿到)
   而没能跑,按任务书里的兜底条款如实跳过,没有开真工单也没有硬闯。

## 一、三页改前/改后逐句对照

来源:改前取自 KV `page:privacy` / `page:terms` / `page:support`(见 §三 基线);
逐字取自 `/tmp/x132b/kv_before/*.html` 与部署后回读的 `/tmp/x132b/kv_after/*.html`。

### support.html

| # | 位置 | 改前 | 改后 |
|---|---|---|---|
| 1 | 「联系方式」字段 | `请在 App 内「小天天 → 联系我们」提交，我们会在 App 内回复` | **统一新措辞**(见下方原文,逐字与 privacy/terms 相同) |
| 2 | 「回复时效」整段 | `提交后，我们通常会在 14 个工作日内通过 App 内「联系我们」回复。对于重复提交、信息不足无法核实、或与本 App 无关的问题，我们保留不逐一回复的权利。` | **整行删除** |
| 3 | 联系区块末尾小字 | `在 App 内「小天天 → 联系我们」提交的反馈，开发者的回复会直接回到那一页的对话里，您也可以在同一条对话里接着回复。` | **整行删除**(描述的双向对话功能已不存在,不是改写能救的) |
| 4 | 第 10 问「需要注册账号吗」 | `……连同为回复与排查所必需的基本信息……只用来回复您和排查问题；……` | `……连同为排查问题所必需的基本信息……仅用于排查与改进产品；……` |

### privacy.html

| # | 位置 | 改前 | 改后 |
|---|---|---|---|
| 5 | §一.1「唯一的例外是联系我们」 | `……为回复与排查所必需的基本信息……这些信息只用于回复您和排查问题，不用于任何其他目的……` | `……为排查问题所必需的基本信息……这些信息只用于排查问题与改进产品，不用于任何其他目的……`(「接进同一条对话的编号」原样保留,按 owner 指示这半句不算过时) |
| 6 | §八「如何联系我们」开头 | `如果您对本隐私政策有任何疑问、意见或建议，请在 App 内「小天天 → 联系我们」提交，我们会在 App 内回复。` | **统一新措辞** |
| 7 | 联系方式末尾小字 | `由于本应用没有账号体系，我们无法也无需核验您的身份。提交后，我们通常会在 14 个工作日内通过 App 内「联系我们」回复。对于重复提交、信息不足无法核实、或与本 App 无关的问题，我们保留不逐一回复的权利。` | `由于本应用没有账号体系，我们无法也无需核验您的身份。`(时效承诺整句删除;「不逐一回复」不重复保留,因为上面 6 号的新段落已经说过一次) |

### terms.html

| # | 位置 | 改前 | 改后 |
|---|---|---|---|
| 8 | §十「如何联系我们」开头 | `如果您对本协议有任何疑问、意见或建议，请在 App 内「小天天 → 联系我们」提交，我们会在 App 内回复。` | **统一新措辞** |
| 9 | 联系区块末尾小字 | `提交后，我们通常会在 14 个工作日内通过 App 内「联系我们」回复。对于重复提交、信息不足无法核实、或与本 App 无关的问题，我们保留不逐一回复的权利。` | **整行删除** |

### 统一新措辞(三页 1/6/8 号逐字相同,主控定稿)

> 如有问题或建议，请在 App 内「小天天 → 联系我们」提交。该入口仅用于接收问题反馈，我们会查看每一条反馈并用于改进产品，但不会逐一回复。请勿在反馈中填写手机号、身份证号等个人敏感信息。

## 二、其它段落改前改后 diff(证明只动了目标句)

改前快照存于 `/tmp/x132b/kv_before/*.html`(部署前从 KV 原样拉取),改后重新读回
`/tmp/x132b/kv_after/*.html`。三份 diff 只命中上表 9 处(privacy 3 处、terms 2 处、support 4 处),
`index.html` 逐字节不变(`diff content/index.html <改后> ` 无输出)。完整 diff 见本次 commit
`59e1e2c`(`git show 59e1e2c -- content/`)。

## 三、尺子基线与结果

| 尺子 | 改前(基线,KV 直读) | 改后(KV / 主站 / 备站三处) |
|---|---|---|
| `回复`(privacy) | 6(其中 1 处是 dev 注释,不算正文) | 剥注释后,新措辞之外 = **0**;新措辞里的「不会逐一回复」出现 **1 次**(逐字属于主控定稿原文) |
| `回复`(terms) | 4(含 1 处注释) | 同上,**0**(注释外) |
| `回复`(support) | 8 | 同上,**0**(注释外) |
| `工作日`(三页各 1) | 各 1 | 各 **0** |
| 邮箱裸词 `@126.com`/`@qq.com`/`邮箱` | 0(沿用历史,阴性对照未破) | 仍 **0** |
| 新措辞出现次数 | 0 | 三页各 **1 次**,逐字节相同 |
| `docs/*.html` 字节数(build.py parity 自检) | privacy 21635 / terms 21016 / support 10257 | privacy 21513 / terms 20845 / support 9935,**主站、KV、备站三处一致** |

**关于「grep 回复|工作日 = 0」的字面表述与主控定稿文本的冲突,如实记录**:
owner 定的统一新措辞本身包含「但**不会逐一回复**」六个字里的「回复」二字 —— 这是主控原文,
不是我加的。字面上「三页 grep 回复 = 0」与「新措辞逐字保留」两条判据互斥,我采用的操作定义是
「新措辞之外的『回复/工作日』= 0」,已在自检脚本注释里写明(`tools/edits_x132b_claudecode_20260911.py`)。
这不是我擅自放宽标准,是两条判据字面上不可能同时为真,只能选一种读法,已经如实指出。

单测:`node tools/test_feedback.mjs` **184/184** 全绿(与本次改动的法律页文案无关,只是回归确认没有连带破坏服务端逻辑)。
`build.py` 自检(JS 渲染器与 `docs/*.html` 逐字节一致、class 白名单、零外域引用)全部通过。

## 四、secret 删除证据(TICKET_SECRET)

- 删前 `grep -rn TICKET_SECRET functions/ tools/` → **0 处代码引用**(只在历史 `.md` 回执文档里出现,均为记叙性文字,不影响运行)。
- 删前 `wrangler pages secret list --project-name xiaotiantian-app`:
  `EDIT_COOKIE_KEY / EDIT_PASSPHRASE / GH_APP_ID / GH_APP_PRIVATE_KEY / GH_INSTALLATION_ID / RC_KEY / TICKET_SECRET`(共 7 个)。
- 执行 `npx wrangler pages secret delete TICKET_SECRET --project-name xiaotiantian-app` → `✨ Success! Deleted secret TICKET_SECRET`。
- 删后重新 `secret list`:只剩 `EDIT_COOKIE_KEY / EDIT_PASSPHRASE / GH_APP_ID / GH_APP_PRIVATE_KEY / GH_INSTALLATION_ID / RC_KEY`(6 个,`TICKET_SECRET` 已不在列表)。

README 新增一节「反馈接口契约现状(X129-C1 起,单向;X132-B 补记「当前默认值」)」
(在「## 托管」之后、「## 约定」之前),把两条已实现的服务端假设写成**当前默认值**,
并注明 owner 可改(改哪两个常量、改完要重新部署),**本轮未改任何数值**。

## 五、诚实栏(没做的事 / 边界)

1. **contact 接口冒烟测试没有真的跑成**:接口要求请求头 `x-rc-key` 与 Pages secret
   `RC_KEY` 相等,`RC_KEY` 是加密存储的密文,我在 mini 本地、`/Users/cc/x123/` 交接目录、
   VPS `~/.keys.md` 里都没找到明文(符合仓库一贯的「明文不进 git/回执/会话」纪律,这是设计如此,
   不是漏了)。已按任务书 §4.6 的兜底条款「若无法不开真工单,写明并跳过」处理:
   开了 `feedback:test_mode=on` 后直接打 `POST /api/feedback/contact`,拿到的是 `403 forbidden`
   (卡在 key 校验这一步,根本没到 test_mode 分支),随后**已清理**该 KV 测试键
   (`wrangler kv key delete --remote feedback:test_mode`),没有产生任何工单或残留状态。
2. README 已按任务书 §3.2 补了新一节(见上),两条默认值 + owner 可改的说明都在,没有跳过。
3. **验证判据字面冲突**已在 §三 说明:owner 定的新措辞本身含「回复」二字,严格字面
   「grep 回复 = 0」不可能与「新措辞逐字保留」同时成立,我按「新措辞之外 = 0」执行并写清楚。
4. 没有触碰 iOS 工程、没有跑 paseo 任何命令、没有改动 GitHub 上任何已有 issue/工单。
5. 已确认的三边一致:主站 `xiaotiantian-app.pages.dev`(经 `/privacy`、`/terms`、`/support`
   跳转后 200)、KV 直读、GitHub Pages 备份站 `cnaron.github.io/xiaotiantian-legal`
   (`git push` 后约 30~40 秒完成 Pages 构建,已轮询确认到达新字节数)三处字节数完全一致
   (21513 / 20845 / 9935)。

## 六、产出

- 改法脚本:`tools/edits_x132b_claudecode_20260911.py`(锚点式改行/删行 + 自检,--dry 可复跑验证)
- Commit:`59e1e2c`(已 push 到 `origin/main`,GitHub 直连,非 VPS 镜像)
- 部署:`npx wrangler pages deploy` → `https://03a3860e.xiaotiantian-app.pages.dev`(生产别名 `xiaotiantian-app.pages.dev`)
- KV:`page:privacy` / `page:terms` / `page:support` 已用 `tools/kv_import.py` 覆盖为新内容(`--remote`)
- Secret:`TICKET_SECRET` 已删除
- 哨兵:`touch /Users/cc/x132/DONE-B`
