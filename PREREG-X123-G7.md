# X123 颗粒 7 · 预注册 —— 工单后端加「拉黑」与「预审」

> 立于 2026-09-09 10:20 北京时间(**动第一行代码前**)。仓库 `xiaotiantian-legal`(legal-site,**PUBLIC**),
> Pages 项目 `xiaotiantian-app`。前置:颗粒 6 已 DONE(图片能力已撤)。

## 大白话解释

**要做什么。** 现在 App 里「联系我们」发出来的话,后端是照单全收:开一条 GitHub 工单给 owner。
这一轮给它加两道门。

**第一道叫「拉黑」。** owner 在 GitHub 上给某个用户的工单贴一个 `blocked` 标签,那台手机
从此**发不出新的话**(提交和回复都被拒),但**还能看见以前的对话**(不让他一脸懵)。
想解封就把标签撕掉,最多 5 分钟就恢复。owner 全程只在 GitHub 上点,不用登任何别的后台。

**第二道叫「预审」。** 用户按下发送后,后端先自己看一眼这句话:① 先过一张**脏话/违法词表**;
② 没命中再交给 Cloudflare 的 AI 安全模型看一眼。任一判为不合规,就**当场拒绝**——不开工单、
不打扰 owner,只在 owner 那个「发送记录」页里记一条红色的。拒绝时不告诉用户为什么(不给
试探的人反馈)。**同一台手机被拒 3 次,自动上 `blocked` 标签**,等于自动拉黑。

**故意留的一个软处。** 如果 AI 那一步坏了或太慢(超过 3 秒),**放行**,并在记录里标一句
「AI 当时不可用」。理由:宁可漏掉一句脏话,也不能因为审核服务抽风把正常用户的求助拦在门外。

**做完算什么样。** ① 一句正常反馈照常开工单(200);② 脏话/违法样本 10 条全部被拒(400);
③ 贴了标签的手机拒收(403)、但仍看得到历史;④ 连拒 3 次自动上标签;⑤ 把 AI 拿掉,
正常反馈仍然过得去;⑥ 法律四页与站内编辑器**一个字节都不变**。

**风险与代价(先写在这)。** 词表是死的,一定会有**误伤**(把正常话当脏话)。所以本轮
必须做**假阳性对照**:拿一批正常反馈语料跑词表,命中必须是 0;词表的归一化(去符号、
全角转半角)有可能把两个无辜的字拼成一个脏词,这条也要专门反向验一次。

---

# 1. 动手前的事实(写死在这)

| # | 事实 | 来源 |
|---|---|---|
| F1 | 现有三条接口 `contact` / `reply` / `thread` 都在 `functions/api/feedback/`,共用 `_lib/feedback.js`(限流 / 清洗 / sendlog)、`_lib/ghapp.js`(GitHub App)、`_lib/ticket.js`(定位工单) | 读代码 |
| F2 | 设备 → 工单号的映射在 KV 键 `ticket:<deviceId>`;GitHub 搜索只是兜底 | `contact.js:145` |
| F3 | `reply` / `thread` 的入参里**没有 deviceId**,只有工单 id(= issue 号) | `reply.js:43`、`thread.js:40` |
| F4 | sendlog 是一行一条 KV(`sendlog:<ts>-<rnd>`),页面按 `mode` 上色,现有三色 issue/test/queued | `_lib/feedback.js:302`、`sendlog.js:98` |
| F5 | 测试模式(`X-RC-Test: 1` 或 KV `feedback:test_mode=on`)不调 GitHub | `feedback.js:283` |
| F6 | 生产 KV 命名空间 `c1f1ad2b…`,production 与 preview **同一个** | `wrangler.toml` |

**F3 的直接后果**:「同设备拒绝计数」在 reply 上没有 deviceId 可用。取法:计数主体
= `deviceId`(有就用),**没有就退回按工单号计**(键写 `i<issue>`)。这条差异写进代码注释与回执,
不假装两边一样。

# 2. 要交付的东西

1. `functions/_lib/moderation_words.js` —— 词/正则库 + 归一化,纯函数、无 IO、可单测。
2. `functions/_lib/moderation.js` —— 预审流水线(词表 → Workers AI)、拉黑查询(labels + KV 缓存)、
   拒绝计数与自动拉黑。
3. `contact.js` / `reply.js` 接上两道门;`thread.js` **不动**(拉黑后仍可读)。
4. `sendlog.js`:`rejected` / `blocked` 两种新 mode 上红色,展开里多一行「审核」(来源 + 类别 + 延迟)。
5. `wrangler.toml`:production 加 `[ai] binding = "AI"`;**preview 故意不加**(见 §4 G7-AI-NOBIND)。
6. `tools/test_feedback.mjs` 追加词表 / 归一化 / AI 分支三节单测(含阴性对照)。
7. 线上实测 + 回执 `RECEIPT-X123-G7.md`。

# 3. 判定规则(写死,事后不许改)

## 3.1 拉黑
- `contact`:`deviceId` → KV `ticket:<deviceId>` 拿 issue 号(**不查 GitHub 搜索**,太慢);
  有号就查 labels;另查 KV `block:<deviceId>`(给「还没开过工单就被拒 3 次」的设备用)。
- `reply`:id 是数字 ⇒ 直接查该 issue 的 labels。
- labels 查一次缓存 5 分钟,KV 键 `labels:<issue>`,值 = JSON 数组。
- 命中 `blocked` ⇒ `403 {"ok":false,"err":"blocked"}`。`thread` **不查**,照常可读。
- 自动拉黑写标签后**立刻刷新**该 issue 的缓存(否则自己刚贴的标签 5 分钟内看不见)。

## 3.2 预审(只审 `desc` / 回复正文,不审日志、不审元信息)
1. **词表**命中 ⇒ 拒,来源 `word`,类别 = 命中的那一类。
2. 词表没命中 ⇒ **Workers AI** `@cf/meta/llama-guard-3-8b`,3 秒超时。
   判为下列类别之一 ⇒ 拒,来源 `ai`:
   **S1 暴力犯罪 / S2 非暴力犯罪 / S3 性犯罪 / S4 儿童性剥削 / S9 无差别武器 /
   S10 仇恨 / S11 自杀自残 / S12 色情内容**。
   **故意不拒**:S5 诽谤 / S6 专业建议 / S7 隐私 / S8 知识产权 / S13 选举 / S14 代码解释器滥用
   —— 这六类在「一个跳绳 App 的用户吐槽」里假阳性风险远大于收益(例:抱怨别家 App = S8,
   抱怨某个人 = S5)。这份名单**就是本轮的「阈值」**,写死在 `moderation.js` 常量里。
3. AI 超时 / 抛错 / 没有绑定 ⇒ **放行**,sendlog 记 `ai_unavailable`。

## 3.3 拒绝后的处置
- 响应 `400`,正文**逐字节** `{"ok":false,"err":"rejected"}`;不开 issue、不写评论。
- sendlog 记一行:`mode=rejected`,带来源 / 类别 / 延迟 / 正文(受 `feedback:log_body` 开关约束)。
- 计数键 `rej:<主体>`(主体见 F3 后果),TTL 30 天;`>=3` ⇒ 自动拉黑:
  有 issue ⇒ 贴 `blocked` 标签 + 评论一句 `[系统] 因多次提交违规内容已自动屏蔽`;
  没 issue ⇒ KV `block:<deviceId>` = `1`,TTL 30 天。

# 4. 闸(判据先写死;绿 / 红 / 黄 / 没跑 四态)

| 闸 | 判据 | 怎么验 |
|---|---|---|
| **G7-NORMAL-200** | 一句正常反馈 → HTTP 200 且开出/追加工单 | 线上真跑(测试模式 + 真路径各一次) |
| **G7-WORD-POS** | 脏话 5 条 + 违法 5 条 **10/10** 被词表命中,类别正确 | 单测(样本只写类别不写原文进回执) |
| **G7-WORD-NEG** | ≥40 条正常反馈语料 **0 命中** | 单测,语料写进测试文件 |
| **G7-NORMALIZE** | 变体(拼音首字母 / 符号插入 / 全角 / 大小写)命中;**且**归一化不制造跨词误命中(反向对照 ≥5 条) | 单测 |
| **G7-AI-UNSAFE** | ≥3 条「词表不命中但确实不安全」的样本被 AI 判拒(400 + sendlog src=ai + 类别) | 线上真跑 |
| **G7-AI-SAFE** | 同一批正常语料经 AI 判 safe ⇒ 200 | 线上真跑 |
| **G7-AI-TIMEOUT** | 假 AI 挂 5 秒 ⇒ 放行 + `ai_unavailable` | 单测 |
| **G7-AI-THROW** | 假 AI 抛错 ⇒ 放行 + `ai_unavailable` | 单测 |
| **G7-AI-NOBIND** | **preview 部署真的没有 AI 绑定**,正常反馈仍 200,sendlog 记 `ai_unavailable` | 线上真跑(preview URL) |
| **G7-BLOCK-403** | 贴 `blocked` 后 contact 与 reply 均 403 `{"ok":false,"err":"blocked"}` | 线上真跑 |
| **G7-BLOCK-THREAD-OK** | **同一时刻** thread 仍 200 且能看到历史消息 | 线上真跑 |
| **G7-UNBLOCK** | 撕掉标签后 ≤5 min 恢复 200(记录实际恢复用时) | 线上真跑 |
| **G7-AUTOBLOCK-3** | 连续 3 次被拒后:issue 上出现 `blocked` 标签 + **恰好 1 条**系统评论;第 4 次 contact = 403 | 线上真跑 |
| **G7-COUNT-TTL** | `rej:*` 键存在且过期时间 ≈ 30 天(回读 `expiration`) | wrangler kv key 回读 |
| **G7-REJECT-SHAPE** | 拒绝响应体逐字节 = `{"ok":false,"err":"rejected"}`;**且**该次前后仓库 open issue 数不变 | 线上真跑 + GitHub API 计数 |
| **G7-SENDLOG-RED** | sendlog 页含 `mode=rejected` 行、红色 class、可见类别;**「解封」字样 0 命中** | 抓页面 grep 两个方向 |
| **G7-LEGAL-BYTES** | `/`、`/privacy`、`/terms`、`/support`、`/edit` 部署前后 sha256 **逐字节相同** | 部署前后各抓一次 |
| **G7-LATENCY** | 记录 ≥20 次审核延迟的 p50 / p95(词表段与 AI 段分开) | sendlog 里的 `modMs` / `aiMs` |
| **G7-NEURONS** | 记录本轮 Workers AI neurons 实际消耗;取不到就写清取不到的原因与替代估算 | CF GraphQL analytics |
| **G7-ONE-ISSUE** | 真路径新开 issue **≤1** 个,收工 close + 打 `test` 标签 | GitHub API 列举 |

**已知不清零 / 不做**:
- 词表不可能穷尽,本轮只求「常见 + 变体」,不追求覆盖率数字(没有真值集)。
- 不做解封按钮(owner 令:去 GitHub 撕标签)。
- 不改 App 侧;App 侧对 403 `blocked` / 400 `rejected` 的展示归 X121 颗粒 17。

# 5. 顺序

1. 词表 + 流水线 + 单测(本地) → commit。
2. 接进 contact/reply + sendlog 上色 → commit。
3. 部署 production(带 AI 绑定)→ 跑 G7-NORMAL-200 / WORD / AI / REJECT-SHAPE / LEGAL-BYTES。
4. 部署 preview(不带 AI 绑定)→ G7-AI-NOBIND。
5. 手工贴 / 撕 `blocked` 标签 → G7-BLOCK-* / G7-UNBLOCK。
6. 连拒 3 次 → G7-AUTOBLOCK-3;查 KV TTL。
7. 收工:关测试 issue、打 `test` 标签、写回执、`touch /Users/cc/x123/DONE-G7`。
