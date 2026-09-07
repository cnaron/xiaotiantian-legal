# 预注册 · X122 颗粒 3 —— 站内口令保护文档编辑器(Pages Functions + KV)

> 落此文件时间:2026-09-07(北京时间)。**先写判据再写代码**;下面每条判据在回执
> `RECEIPT-X122-G3.md` 里必须逐条给结果(绿/红/没跑,三态)。

## 简短大白话

owner 现在改法律页要么让我改、要么去 GitHub 网页上改,都别扭。这一颗粒是在网站上
自己开一个**带口令的编辑页**:打开 `/edit`,输一个口令进去,左边写字、右边同步显示
"发布出来长什么样",点保存就直接换掉线上页面,**不用碰 GitHub、不用装任何东西、
手机上也能改**。做完 owner 只需要记住两样东西:网址和口令。

## 1. 与任务书的两处偏差(先说清楚,再干活)

### 偏差 A:KV 里存的不是纯 Markdown,是「HTML 直通 + Markdown 便捷语法」

任务书写「值 = Markdown 正文」。但颗粒 2 的正文源 `content/*.html` 是**带 class 的
富 HTML**(`highlight-box` / `entry-list` / `mt-2 ml-4` / `<table>` 等 12 个 class、
18 种标签)。把它转成 Markdown 再转回 HTML,**结构上不可能**满足同一份任务书里的
硬约束「公开页与颗粒 2 的静态页逐字节等价」——class 与嵌套 `<div>` 在 Markdown 里
没有对应写法。两条要求二选一,我选**保长相**(owner 原话是「不要跳转到 GitHub」,
不是「必须用 Markdown 语法」)。

因此渲染器的输入格式定义为:

- **顶层块首字符是 `<` 且标签在白名单内 ⇒ 原样直通**(逐字节不动,连缩进和 HTML 注释
  都保留)⇒ 首版从 `content/` 导入 KV 后,渲染输出与 `docs/*.html` **逐字节相同**。
- 其余顶层块 ⇒ 按 Markdown 解析(`##`/`###` 标题、`-`/`1.` 列表、`**粗**`、`` `码` ``、
  `[文字](链接)`、段落、``` 围栏)。owner 以后新写段落可以直接用 Markdown。
- **缩进代码块语法(4 空格)整个禁用**——现有正文每行都缩进 8 空格,留着它必然把
  正文误判成代码块。围栏 ``` 保留。

### 偏差 B:XSS 防御用「白名单」而不是「全部转义」

任务书原文允许二选一(「须转义原始 HTML(**或白名单**)」)。既然要 HTML 直通,
就必须走白名单。实现方式是**逐 token 校验后原样吐回**(不是重新序列化),这样才能
保住逐字节等价:

- 允许标签:`section p h2 h3 h4 ul ol li strong em code a div span table thead tbody tr th td br hr blockquote`
- 允许属性:`class`(取值必须全部落在 CSS 里已有的 class 白名单)、`href`(只允许
  `./` `../` `#` `/` 开头或 `https:` `http:` `mailto:` 协议)
- HTML 注释 `<!-- ... -->` 直通(现有正文里有编辑指引注释)
- 其余一切(`script` `style` `iframe` `on*=` `javascript:` `srcdoc` `<!DOCTYPE` …)
  ⇒ **把原文按字面转义输出**(变成可见文字,不执行)

## 2. 路由表(约定即判据)

| 路径 | 文件 | 行为 |
|---|---|---|
| `/` | `functions/index.js` | KV `index` → 渲染 → HTML |
| `/privacy` `/terms` `/support` | `functions/<page>.js` | KV `<page>` → 渲染 → HTML |
| `/privacy.html` 等 | (静态资产仍在) | CF 原有 308 → 无后缀 → 落到上面的 Function |
| `/404.html` | 静态 | 本颗粒不接管(不可编辑) |
| `/edit` | `functions/edit.js` | 未登录=口令页;已登录=编辑器(默认 privacy) |
| `/<page>/edit` | `functions/[page]/edit.js` | 同上,直达指定页;page 不在四页内 ⇒ 404 |
| `/api/login` | `functions/api/login.js` | POST 口令 → 下发签名 cookie |
| `/api/logout` | `functions/api/logout.js` | POST → 清 cookie |
| `/api/save` | `functions/api/save.js` | POST(校 cookie)→ 写 KV + 写 history |
| `/api/history` | `functions/api/history.js` | GET 列表 / GET `?ts=` 取某版正文(校 cookie) |
| `/api/export` | `functions/api/export.js` | GET(校 cookie)→ 打包四页正文 JSON,供手动同步 GitHub 备份站 |

`/edit*` 与 `/api/*`:`Cache-Control: no-store` + `X-Robots-Tag: noindex, nofollow`。
公开页:`Cache-Control: public, max-age=300, s-maxage=600, stale-while-revalidate=86400`。

## 3. 存储约定

命名空间 `LEGAL_CONTENT`,绑定名 `LEGAL_CONTENT`:

| 键 | 值 | TTL |
|---|---|---|
| `page:<name>`(`index/privacy/terms/support`) | 正文源码 | 无 |
| `history:<name>:<ts>`(ts=毫秒) | 正文源码 | 无(超过 20 版由 save 主动删旧) |
| `login_fail:<ip>` | 失败次数 | 900 s |

KV 无值 ⇒ **回退到构建时打包进 Function 的静态正文**(`functions/_lib/fallback.js`,
由 `build.py` 从 `content/` 生成)。任务书写的是回退到 `docs/_content/`;改成打包进
bundle 是因为那样回退路径不需要再发一次网络请求,KV 挂了也一定拿得到。

## 4. 预注册判据(回执逐条给绿/红/没跑)

### G-EQ 逐字节等价(主判据)
把 `content/*.html` 原样导入 KV 后,线上 `/`、`/privacy`、`/terms`、`/support` 的
响应体与仓库 `docs/index.html` `docs/privacy.html` `docs/terms.html` `docs/support.html`
**逐字节相同**(`cmp` 退出码 0,不做任何"去版本戳"的宽容处理)。
**任一页不同即 G-EQ 红**,不允许改判为"看起来一样"。

### G-RENDER 双端同源
浏览器预览用的渲染器与 Worker 渲染器**是同一份文件的两个副本**;`build.py` 在每次
构建时对两份副本做 `sha256` 比对,不一致直接构建失败。回执贴两个 sha。

### G-UNIT 渲染器单测
`tools/test_render.mjs`,至少覆盖:四页正文直通逐字节等价、Markdown 基本语法、
`<script>` 被转义、`onclick=` 被转义、`javascript:` href 被转义、未知 class 被转义。
**全部通过才算绿**。

### G-SEC 安全阴性对照(五条,全部要有 HTTP 状态码证据)
1. 错口令 POST `/api/login` ⇒ **401**
2. 不带 cookie POST `/api/save` ⇒ **401**
3. 伪造/篡改签名 cookie POST `/api/save` ⇒ **401**
4. 连续 5 次错口令后,**用正确口令**登录 ⇒ **429**(且 15 min 后自动解锁 —— 本条只验
   429,解锁只验 KV TTL 已设,不等 15 min)
5. 把 `<script>alert(1)</script>` 存进某页 ⇒ 公开页源码里出现的是
   `&lt;script&gt;`(grep 证明),不是可执行标签。**验完立刻恢复原文并核对 G-EQ**

### G-FRESH 保存即发布
保存后 **≤10 s** 内,不带缓存(`curl -H 'Cache-Control: no-cache'` + 随机 query)
拉公开页能看到新内容;并记录带缓存的普通请求多久跟上。

### G-SIZE 体积
四个公开页 gzip 后 **< 15 KB**(逐页给数)。

### G-REACH 两地可达
mini 与 appserver 各拉四个公开页 + `/edit`,全部 200(`/edit` 未登录时是 200 口令页)。

### G-NOEXT 零外链
公开页与编辑器页 HTML 里 `grep -E 'https?://(?!xiaotiantian)'` 只允许出现在正文文案里
的链接,不允许出现 `<script src=` / `<link href=` / `@import` 指向外域。

## 5. 口令与密钥处置

- `EDIT_PASSPHRASE`:执行线生成 ≥16 位随机串,`wrangler pages secret put` 写入。
- `EDIT_COOKIE_KEY`:32 字节随机 base64,同法写入;cookie = `HMAC-SHA256(key, exp)`,
  `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`,校验用常量时间比较。
- 明文**只**写到 Air `~/Downloads/xiaotiantian-legal-site/EDIT-PASSPHRASE.txt`,
  scp 后 mini 删除。不进 commit、不进回执、不进会话正文。

## 6. 本颗粒不做

- 不动 App、不发通知、不动重复站 `xiaotiantian-legal.pages.dev`
- 不碰颗粒 2 遗留三件待裁(样式取值 / 邮箱 003 vs 009 / 重复站)
- 不做多用户、不做草稿箱、不做图片上传
- GitHub Pages 备份站**不再自动跟随** KV 内容(见回执"诚实边界")
