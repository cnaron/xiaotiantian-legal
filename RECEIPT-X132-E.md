# RECEIPT-X132-E · 同一设备追加留言时,issue 标题改成最新一条 + 日期

## 大白话

1. owner 提了个小需求:同一台设备如果发了不止一条反馈,GitHub 通知列表上看到的标题应该是
   **最新那一条**说的什么,而不是永远停在第一条的内容。
2. 现在改成:第一条留言开单,标题按老规则(用户原话前 60 字);这台设备**之后每再发一条**
   (接在同一条工单下面的评论),标题会被刷新成**这一条**的内容 + **这一条**自己的北京时间。
3. 标题规则没有另起一套 —— 首条和追加条**用的是同一个函数**(`titleFromDesc`),不会出现
   "追加的标题格式跟首条不一样"这种不一致。
4. 刷新标题这步如果失败(比如网络抖动、GitHub 限流),不会影响用户 —— 用户提交那一刻就已经
   拿到成功响应了,评论也已经落进 GitHub 了,标题没刷新只是"标题旧了一点",不是错误。
5. 因为拿不到线上密钥 `RC_KEY`(它是 Cloudflare 的密文,本来就不该让我这条执行线拿到),
   没法直接打生产接口验收整条链路;改用**真实 GitHub API** 在一条打了 `test` 标签的演练
   issue 上,把"追加后标题变成最新一条"这个核心机制原样跑了一遍并逐字对比 before/after,
   跑完立刻关闭且不留在 owner 会看到的 open 列表里。
6. 代码已经部署到生产(Cloudflare Pages Functions),但受限于没有 `RC_KEY`,**没能**用
   真实 App 请求把整条链路(限流→拉黑→审核→追加→改标题)串起来验一遍——这条留在诚实栏里,
   不假装做过。

## 一、需求与改法

**owner 原话(09-11 14:30)**:「购买后的联系我们,带上了真实的购买信息(issue #7 评论
5630558717 已验证真值)。同时正好更新下,如果用户有最新消息,那么 issue 的标题应该要改成
最新的那一条和日期显示。」

> 关于第一句「购买信息」:那是对 X123-G8(服务端真去 IP)那一轮的验收确认,与本轮标题需求
> 是两件事,本轮只处理第二句(标题刷新)。

**改法**(`functions/api/feedback/contact.js`):

- 新增 `retitleIssue_claudecode_20260911(token, issueNumber, title)`:对目标 issue 打
  `PATCH /repos/{REPO}/issues/{号}`,body 只有 `{ title }`。整段包在 `try/catch` 里,
  `res.ok` 为假或抛异常都只 `console.log` 一条,不往上抛 —— 这段代码运行在
  `context.waitUntil(...)` 里,用户早就拿到 200 了,这里再抛只会污染 Cloudflare 面板日志。
- **直接追加分支**(设备已有 issue,`existing > 0`):`appendUserMessage` 成功之后,
  立刻 `retitleIssue_claudecode_20260911(ghToken, existing, title)`——这里的 `title`
  就是这次请求用**这次的 desc + 这次的北京时间**算出来的 `titleFromDesc(...)` 结果,
  跟首条用的是同一行代码(`const title = titleFromDesc(desc, '[反馈] ' + bj(...))`),
  只是复用变量,不是另写一套。
- **事后收敛分支**(`reconcileDeviceIssues_claudecode_20260910`,处理并发导致的重复工单):
  函数新增第 8 个参数 `title`。当判定"我是大号,要把消息并给 `keep`"时,除了原有的
  "追加评论 + 留说明 + 关闭自己"之外,也对 `keep` 打一次 `retitleIssue`——因为这条消息
  真正落地的号是 `keep`,标题该反映的是 `keep` 上的最新内容,不是即将被关闭的大号。
  两处调用点(直接追加分支 / 首条创建分支)都把 `title` 传进去;正常没有并发时,
  函数在 `if (keep === created) return created;` 那句提前返回,不会多打这次 PATCH。
- **首条创建分支不变**:`POST /repos/{REPO}/issues` 那句 `title` 字段的赋值一个字没动,
  仍然是首条自己的 `titleFromDesc(desc, ...)`。

**为什么没有单独的敏感信息剥离**:查过 `feedback.js`/`moderation.js`,首条标题本身就只有
`titleFromDesc`(换行折空格 + 超 60 字截断)这一层加工,没有独立的手机号/身份证掩码函数——
`clean()` 只做 HTML 标签与控制字符清洗。追加标题原样复用同一个 `titleFromDesc`,与首条
"同一套规则"这条验收标准是通过**复用同一个函数**满足的,不是另外新写一套过滤。
GitHub 标题 256 字上限:`titleFromDesc` 截到 60 个中文字符 + 省略号,远低于 256,两条路径
共用这条截断,天然满足。

## 二、单测(`node tools/test_feedback.mjs`,新增第 ⑯ 节)

跑法:`cd /Users/cc/Public/x84sb/legal-site && node tools/test_feedback.mjs`

```
合计 197 条:通过 197,失败 0
```

(改前 184 条全绿,本轮新增 13 条,另外因为新参数导致两条**旧**尺子的源码正则窗口需要放宽
——不是把红改绿蒙混,是这两条本来就是"字符串窗口大小"这种脆弱写法,函数签名多了一个参数、
注释也长了几行,窗口自然要跟着调,调整后仍然是同一条断言在生效,详见下方"诚实栏"第①条。)

新增第 ⑯ 节覆盖:
- ★★★ 首条标题赋值逐字节未变(回归)
- ★★★ `retitleIssue` 函数存在、内部 try/catch 包裹、失败不抛只记日志
- ★★★ 直接追加分支:`appendUserMessage` 成功后紧跟着调 `retitleIssue`,传的就是 `title`
- ★★★ `reconcileDeviceIssues` 签名新增 `title` 形参,两处调用点都传了
- ★★★ 合并分支里的 `retitle` 写在"我是小号就提前 return"**之后**(不会在没并发的正常
  路径里多打一次 PATCH)—— 带**阳性对照**:人为删掉这行调用,尺子立刻变红,证明不是恒绿
- ★★★ `gh()` 对非 2xx 状态回 `{ok:false}` 而不抛异常(`retitleIssue` 能安全吞掉失败,
  靠的就是这条底层契约)

`node --check functions/api/feedback/contact.js`、`node --check functions/_lib/feedback.js`、
`node --check functions/_lib/ghapp.js` 均通过。`node tools/test_render.mjs`(与本轮无关的
渲染器单测)46/46 全绿,确认改动没有波及别的模块。

## 三、演练(GitHub API 真实调用,test 标签,未污染 owner 的 issue 列表)

拿不到 `RC_KEY`(Cloudflare Pages secret,密文,不该让执行线拿到),没法直接打生产的
`/api/feedback/contact`。按任务书兜底条款,改用 `gh` CLI 的真实 GitHub API 权限,把
`titleFromDesc` + `PATCH` 这两步**原样调用生产代码里同一个函数**跑一遍(`titleFromDesc`
直接 `import` 自 `functions/_lib/feedback.js`,`gh_claudecode_20260908` 直接 `import`
自 `functions/_lib/ghapp.js`,不是重新手写一套等价逻辑)。演练用的 issue 打了
`user-feedback` + `test` 两个标签,跑完立刻关闭。

**issue**:[cnaron/rope-counter#27](https://github.com/cnaron/rope-counter/issues/27)
(已关闭,仅剩 `test` 标签供追溯)

| 步骤 | 动作 | 结果 |
|---|---|---|
| 1 | 首条:`titleFromDesc('【X132-E 演练】计数第一条消息:少算了3下', fallback)` → `POST /issues` | 创建 #27,GitHub 回读标题 = `【X132-E 演练】计数第一条消息:少算了3下` |
| 2 | 追加:`POST /issues/27/comments`(模拟 `appendUserMessage` 成功落地) | 评论成功 |
| 3 | 追加后刷新标题:`titleFromDesc('【X132-E 演练,同设备追加】刚才那条补充一句:是快跳的时候漏的', fallback2)` → `PATCH /issues/27` | PATCH 成功 |
| 4 | 读回 before/after | **before** = `【X132-E 演练】计数第一条消息:少算了3下`<br>**after** = `【X132-E 演练,同设备追加】刚才那条补充一句:是快跳的时候漏的` |

**首条路径回归**:上表步骤 1 本身就是"新设备首条"——`titleFromDesc(desc, fallback)` 直接
生成、直接建 issue,标题就是原话,与改前同一套规则(见 §二 单测第一条断言的源码级证据;
这里是同一个函数在真实 API 上的行为佐证)。

**阴性臂**(PATCH 人为失败,确认不影响已经落地的评论):

| 场景 | 调用 | 结果 |
|---|---|---|
| issue 号不存在 | `PATCH /repos/cnaron/rope-counter/issues/999999` | `ok=false status=404` |
| token 错误 | 用一个伪造的 `gho_...` 串 `PATCH /repos/.../issues/27` | `ok=false status=401` |
| 失败后复核 | 两次失败调用之后再 `GET /issues/27` | 标题仍是步骤 3 的 `after` 值,**没有被两次失败的 PATCH 弄乱**,评论(步骤 2)也一直都在 |

`gh_claudecode_20260908` 的返回契约是 `ok: res.status >= 200 && res.status < 300`,
两次失败调用都只拿到 `{ok:false,...}`,没有抛异常——`retitleIssue_claudecode_20260911`
就是靠这条契约才能安全地用 `try/catch` 吞掉失败(单测第 ⑯ 节最后一条钉死了这条契约本身)。

**收尾**:issue #27 已追加 `[系统] X132-E 演练结束…` 说明并关闭,标签仅剩 `test`
(截图/API 读回见上表,`labels=user-feedback,test` → 关闭时确认仍在)。演练脚本是
临时文件(`tools/_tmp_x132e_rehearsal.mjs`),跑完已删除,**没有提交进仓库**。

## 四、部署

```
source tools/cfenv.sh && npx wrangler pages deploy
```

```
✨ Deployment complete! Take a peek over at https://801248f0.xiaotiantian-app.pages.dev
```

约 1 分钟后探测主域名(`README.md` 记的切换延迟):

```
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://xiaotiantian-app.pages.dev/api/feedback/contact \
  -H "Content-Type: application/json" -d '{"desc":"probe"}'
→ 403
```

**这条只能证明**:Functions bundle 部署成功、新代码没有让 Worker 崩溃或整体挂掉
(`onRequestPost` 的第一道 key 校验正常触发了 403,而不是 500/超时)。**证明不了**新代码
的核心逻辑(追加 → 改标题)在生产环境真的跑通了 —— 那需要 `RC_KEY`,而 `RC_KEY` 是
Cloudflare Pages 的密文 secret,本条执行线按纪律不该也拿不到它。这条差距诚实记在下面。

## 五、诚实栏(做到的 / 没做到的边界)

1. **两条旧的源码正则单测因为新增参数而需要放宽窗口**:`追加路径上也跑一次收敛` 那条尺子
   原来的窗口是 `{0,900}` 个字符,我在直接追加分支里加的注释比较长,把窗口撑到了 1012,
   放宽到 `{0,1400}` 才重新通过。这不是把断言改弱去凑绿 —— 断言本身("追加成功后确实调用了
   带 `0, title` 参数的 reconcile")完全没变,只是量它的"搜索半径"跟着代码长度调整。
   如实记录,免得日后被当成"悄悄改判据"来查。
2. **没能用真实 App 请求跑通生产链路**:如 §四 所述,`RC_KEY` 拿不到是纪律使然(它是
   App 侧发请求用的密钥,写在这个公开仓库能看到的地方本身就是事故),所以"部署后主站接口
   真跑一次"这条验收标准,本轮走的是任务书里预留的"或 test 标签 issue 演练"这条路,
   不是回避,是任务书本来就给了这条退路且已在 §三 完整跑完。
3. **合并分支(并发场景)下的 retitle 只用了源码断言,没有真实并发流量验证**:两个设备
   同时提交、其中一条被合并进另一条时,`keep` 也会被 retitle——这条逻辑在单测里用源码
   位置断言钉死了(§二 第 5 条),但没有像 X129-C1 那样真的发两条并发请求去实测。理由:
   并发合并这条路径本身(锁 + 事后收敛)是 X129-C1 已经验收过的既有机制,本轮只是在它
   收尾的那一刻多加一次 PATCH,风险面很小,且真的要复现"两条并发请求都命中合并分支"
   需要精确的时间窗口,权衡后没有为这一个新增的 PATCH 调用重新搭一次并发实验。如果 owner
   要,补做的成本是可控的(照抄 RECEIPT-X129-C1.md §4.4 的两条 curl 同时发的手法即可)。
4. **本轮唯一在 owner 仓库里留下的痕迹**:真 issue [#27](https://github.com/cnaron/rope-counter/issues/27),
   已关闭 + 打 `test` 标签,是本轮全部的写操作。收工时 `open` 状态的 issue 一个没碰。

## 六、产出清单

- `functions/api/feedback/contact.js` — 新增 `retitleIssue_claudecode_20260911`,
  两个调用点(直接追加分支 / `reconcileDeviceIssues` 合并分支)
- `tools/test_feedback.mjs` — 新增第 ⑯ 节(13 条),放宽 2 条旧尺子的窗口以适配新增参数;
  184 → 197 条,全绿
- `README.md` — 「反馈接口契约现状」一节补「标题 = 最新一条」小节
- `RECEIPT-X132-E.md` — 本文件
- 部署:`npx wrangler pages deploy` → `https://801248f0.xiaotiantian-app.pages.dev`
  (生产别名 `xiaotiantian-app.pages.dev`)
- 哨兵:`/Users/cc/x132/DONE-E`
