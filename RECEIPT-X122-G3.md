# 回执 · X122 颗粒 3 —— 站内口令保护文档编辑器(Cloudflare Pages Functions + KV)

执行:2026-09-07(北京时间)19:00–19:40,mini。
预注册:[`PREREG-X122-G3.md`](./PREREG-X122-G3.md)(开工 24 分钟落的第一个 commit `3441e23`)。

---

# 简短大白话

以前 owner 想改隐私政策上的一句话,得让我改、或者去 GitHub 网页上点半天。**现在网站自己带了一个编辑器**:

1. 手机或电脑打开 **<https://xiaotiantian-app.pages.dev/edit>**;
2. 输一个 19 位口令(在 Air 的 `~/Downloads/xiaotiantian-legal-site/EDIT-PASSPHRASE.txt` 里),12 小时内不用再输;
3. 页面左边是文字、右边**同步显示"发布出来长什么样"**——右边看到的就是线上会长的样子,不是"差不多";
4. 改完点「保存并发布」,**实测约 3 秒**线上页面就换了。顶上四个按钮切四个页面(目录 / 隐私政策 / 用户协议 / 支持与帮助);
5. 改错了可以从「历史版本」下拉里挑一个旧版本载回来(自动留最近 20 版)。

**长相一点没变**:改成这套架构之后,四个公开页拉下来的内容与改造前的静态页**一个字节都不差**(不是"肉眼看着一样",是 `cmp` 比出来相同)。
**安全**:错口令进不去、没登录改不了、伪造登录凭证改不了、同一个网络连错 5 次锁 15 分钟;有人硬把 `<script>` 打进正文,页面上只会把它当文字显示,不会执行。
**代价**:只有一个口令、不区分是谁改的;GitHub 上那份备份站从此不会自动跟着变(要人手同步一次)。

---

# 1. 交付了什么

| 地址 | 是什么 |
|---|---|
| `https://xiaotiantian-app.pages.dev/` `…/privacy` `…/terms` `…/support` | 公开页(内容从 KV 现取现渲染) |
| `https://xiaotiantian-app.pages.dev/edit` | 编辑入口。未登录=口令页,已登录=编辑器(默认目录页) |
| `…/privacy/edit` `…/terms/edit` `…/support/edit` | 直达某一页的编辑器 |
| `…/api/login` `logout` `save` `history` `export` | 后台接口(除 login/logout 外都校登录) |

代码:仓库 `functions/`(936 行,16 个文件)+ `template/render.js`(渲染器)+ `tools/`(单测、自检、KV 导入、凭证注入)。
线上部署:`b20f6bca` 起的 production deployment;KV 命名空间 `LEGAL_CONTENT` = `c1f1ad2b441b4d2ba0fb896e375c2621`。

## 三件跟任务书不一样的地方(预注册里已先声明,不是事后补的)

1. **KV 里存的不是纯 Markdown**,是「HTML 直通 + Markdown 便捷语法」。原因写在预注册 §1:
   颗粒 2 的正文是带 12 个 class、18 种标签的富 HTML,转成 Markdown 再转回来**结构上不可能**
   逐字节等价,而同一份任务书的硬约束要求逐字节等价。**二选一时我选了保长相。**
   现有正文原样直通;owner 以后新写段落可以直接敲 `## 标题`、`- 列表`、`**粗体**`,也认。
2. **XSS 防御走白名单**(任务书里给的两个选项之一),不是"一律转义原始 HTML"——因为要 HTML 直通。
3. **KV 无值时的回退正文打包进 Function bundle**,不是任务书说的放 `docs/_content/` 再去取:
   打包进去意味着回退路径一次网络请求都不发,KV 全挂时页面仍然完整。

---

# 2. 判据结果(预注册 §4 逐条,绿/红/没跑三态)

| 判据 | 结果 | 证据 |
|---|---|---|
| **G-EQ** 公开页与颗粒 2 静态页逐字节等价 | 🟢 绿 | 生产四页 `cmp` 全 0 差异,且 `X-Content-Source: kv`(见 §3.1) |
| **G-RENDER** 双端同源 | 🟢 绿 | 三份副本 sha256 全等 `d3ebf653…7a6a1`;`build.py` 不等即失败 |
| **G-UNIT** 渲染器单测 | 🟢 绿 | `node tools/test_render.mjs` → **25 passed, 0 failed** |
| **G-SEC** 安全阴性对照 5 条 | 🟢 绿 | 5/5 全部拿到期望状态码(见 §3.3) |
| **G-FRESH** 保存即发布 ≤10 s | 🟢 绿 | 无缓存 **2.88 s** 首见;普通请求 **3.69 s** 首见 |
| **G-SIZE** gzip < 15 KB | 🟢 绿 | 2299 / 7151 / 6625 / 4107 B(见 §3.4) |
| **G-REACH** 两地可达 | 🟢 绿 | mini 9/9 + appserver 9/9 全 200、redirects=0 |
| **G-NOEXT** 零外链 | 🟢 绿 | 公开页与编辑器页外域 `script src` / `link href` / `@import` 全 0 |
| **G-PREVIEW**(预注册外补的一条) | 🟢 绿 | 把**线上**编辑器页里嵌的资产 + **线上** `/edit-render.js` 跑一遍,产物与线上公开页逐字节相同 |

> 关于 G-PREVIEW:任务书要求"预览=发布效果"。光说"两边用同一份文件"是弱证据(文件同不代表
> 调用路径同),所以补了这条端到端比对——**证的是浏览器那条路径的输出**,不是仓库里的文件相等。

---

# 3. 实测数字

## 3.1 G-EQ 逐字节等价(生产,2026-09-07 19:27)

```
https://xiaotiantian-app.pages.dev/         : BYTE-IDENTICAL  src=kv
https://xiaotiantian-app.pages.dev/privacy  : BYTE-IDENTICAL  src=kv
https://xiaotiantian-app.pages.dev/terms    : BYTE-IDENTICAL  src=kv
https://xiaotiantian-app.pages.dev/support  : BYTE-IDENTICAL  src=kv
```
比对基准 = 仓库 `docs/*.html`(颗粒 2 的产物),用 `cmp` 判定,**没有做任何"去版本戳"的宽容处理**。
另有离线一半:`build.py` 每次构建都用 Function 侧代码重算四页与 `docs/*.html` 比,不等就构建失败。

`.html` 后缀地址行为没变:`/privacy.html` 仍 308 到 `/privacy`(4/4)。`/nosuchpage` 仍 404(静态 404 页未被接管)。

## 3.2 G-PREVIEW 预览 == 发布

```
index:   预览产物 == 线上页面  BYTE-IDENTICAL (5084 B)
privacy: 预览产物 == 线上页面  BYTE-IDENTICAL (19688 B)
terms:   预览产物 == 线上页面  BYTE-IDENTICAL (17451 B)
support: 预览产物 == 线上页面  BYTE-IDENTICAL (9427 B)
```

## 3.3 G-SEC 安全阴性对照(生产)

| # | 做什么 | 期望 | 实得 |
|---|---|---|---|
| 1 | 错口令 POST `/api/login` | 401 | **401** `{"ok":false,"error":"口令不对"}` |
| 2 | 不带 cookie POST `/api/save` | 401 | **401** `{"ok":false,"error":"未登录"}` |
| 3 | 伪造签名 cookie POST `/api/save` | 401 | **401** |
| 3b | 过期时间戳 + 真签名格式 | 401 | **401**(本地台架实测) |
| 4 | 连 5 次错口令后**用正确口令** | 429 | **429** `{"error":"错误次数过多,请 15 分钟后再试"}`;KV 键 `login_fail:<ip>` 带 `expiration` 时间戳(证明 TTL 已设) |
| 5 | 把 `<script>alert(1)</script>` 等四种载荷存进 support 页 | 页面上不执行 | 公开页里 `<script` / `<iframe` / `<img` 标签数 **全 0**;出现的是 `&lt;script&gt;alert(1)&lt;/script&gt;`、`&lt;p onclick=&quot;alert(2)&quot;&gt;`、`&lt;img src=x onerror=alert(3)&gt;`、`&lt;iframe src=&quot;https://evil.example&quot;&gt;` |
| 附 | 无 cookie 访问 `/api/history`、`/api/export` | 401 | **401 / 401** |
| 附 | `/nosuch/edit` | 404 | **404** |

第 5 条验完**已恢复原文并复验 `BYTE-IDENTICAL`**;那一版 XSS 历史记录也已从 KV 删除,
第 4 条造出来的锁定键测完立即删除并复验"正确口令能登进去"(200)。KV 现存 5 个键:四页正文 + 1 条 support 历史。

cookie 属性实测:`HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`。
`/edit*` 响应头:`cache-control: no-store, no-cache, must-revalidate` + `x-robots-tag: noindex, nofollow, noarchive`。
公开页响应头:`cache-control: public, max-age=300, s-maxage=600, stale-while-revalidate=86400`。

## 3.4 G-SIZE / G-REACH

| 页 | gzip | 原始 |
|---|---|---|
| `/` | 2299 B | 5084 B |
| `/privacy` | 7151 B | 19688 B |
| `/terms` | 6625 B | 17451 B |
| `/support` | 4107 B | 9427 B |

两地各 9 条地址(四公开页 + 四编辑页 + `/edit-render.js`)全部 `http=200 redirects=0`:
mini 0.26–1.00 s;appserver(国内腾讯云)0.52–0.95 s。

---

# 4. 怎么用(写给 owner)

**改文案**
1. 手机或电脑浏览器打开 <https://xiaotiantian-app.pages.dev/edit>
2. 输口令(见 Air `~/Downloads/xiaotiantian-legal-site/EDIT-PASSPHRASE.txt`),点「进入」
3. 顶上四个标签切页面:目录页 / 隐私政策 / 用户协议 / 支持与帮助
4. 左边改字,右边自动更新成"发布后的样子"
5. 点「保存并发布」(或按 ⌘S / Ctrl+S)。右上角出现「已发布 · 时间」就成了,**约 3 秒**线上可见
6. 「查看线上」在新标签打开真页面;「退出」注销登录

**改错了怎么回滚**
顶上「历史版本…」下拉,挑一个时间点 → 正文被载回编辑框(**此时线上还没变**)→ 看一眼没问题 → 点「保存并发布」。
自动保留最近 **20 版**,超过的自动删最旧的。

**写法**
- 直接改现成的 HTML(推荐:照着旁边已有的段落抄格式,`<h2>` 是大标题、`<p>` 是段落、`<li>` 是列表项)
- 也可以直接敲 Markdown:`## 标题`、`### 小标题`、`- 列表`、`1. 编号列表`、`**加粗**`、`` `代码` ``、`[文字](链接)`
- 允许的标签和样式类是白名单里那些;写了白名单外的东西(比如 `<script>`),页面上会**原样当文字显示**,不会报错也不会执行

**换口令**
Cloudflare 控制台 → Workers & Pages → `xiaotiantian-app` → Settings → Variables and Secrets →
把 `EDIT_PASSPHRASE` 改成新值 → 保存后**要重新部署一次才生效**(Deployments 里对最新一次点 Retry deployment)。
命令行等价写法:`source tools/cfenv.sh && npx wrangler pages secret put EDIT_PASSPHRASE --project-name xiaotiantian-app`,然后 `npx wrangler pages deploy`。
另一个 secret `EDIT_COOKIE_KEY` 是签登录凭证用的;改它会让所有人当场掉线(相当于"强制所有设备重新登录")。

---

# 5. 诚实边界(别当没说)

- **只有一个口令,不区分是谁改的**。没有用户体系、没有操作者记录;历史版本只记时间与内容,不记"谁改的"。
- **登录 12 小时过期**,过期后编辑器保存会提示重新登录(不会丢正在编辑的文字:提示后 1.2 秒才刷新,可先把文字复制走)。
- **KV 是最终一致的**。正文读写在同一个边缘节点通常秒级;`/api/history` 的**版本列表**用的是 KV 的 list 接口,
  可能滞后到 **60 秒** —— 实测就撞到过:刚保存完列表只显示 1 条,过一会儿才变 2 条。**正文本身不受影响**。
- **"保存即发布"的 3 秒是实测值,不是保证值**。`caches.default.delete` 在本次实测里返回 `false`
  (那一刻边缘没有该 URL 的缓存条目),所以这 3 秒实际来自 KV 传播 + `s-maxage` 行为,**不是缓存清除生效的证据**。
  如果哪天出现"保存了但页面没变",在地址后面加个 `?x=1` 就能看到新内容,等几分钟普通地址也会跟上。
- **失败锁定是按出口 IP 算的**。实测 mini 的出口 IP 是 VPS 的 `43.155.174.160`(Surge TUN 全局代理),
  也就是说**共用同一出口的所有设备共享这个计数**。owner 在自己家网络上是另一个 IP,互不影响。
- **GitHub Pages 备份站不再自动同步**。它发的是仓库 `docs/`,而正文权威来源已经是 KV。
  owner 在网页上改完之后,`cnaron.github.io/xiaotiantian-legal/` 上还是旧文字,直到有人手动同步(见 §7)。
- **404 页没接管**,还是纯静态,不能在编辑器里改。
- **渲染器不是 CommonMark**。它是为本站正文写的够用子集:4 空格缩进代码块语法**故意关掉**(现有正文每行缩进 8 空格,
  留着必然误判);表格、脚注、任务列表这些 Markdown 扩展都不支持(现有正文里的表格是直接写 HTML `<table>`)。
- **没做的**:草稿箱、图片上传、多人协作、操作日志、把编辑器接到 App 内、改 ASC 后台的 URL。
- **没验的**:`caches.default.delete` 在真有边缘缓存时到底删不删得掉(缺一次"先把页面缓存热起来再保存"的对照);
  Safari/iOS 上的真机实操(编辑器 UI 只在 mini 的 WebKit 离屏渲染里截过图,布局是对的,但没在真手机上点过按钮)。

---

# 6. 架构与文件

```
template/render.js        ← 渲染器唯一真源(HTML 白名单直通 + Markdown 子集 + 外壳套版)
  ├─ build.py 复制 → functions/_lib/render.js   (Worker 侧)
  └─ build.py 复制 → docs/edit-render.js        (浏览器预览侧)   三份 sha256 必须相同

functions/
  index.js privacy.js terms.js support.js   公开页:KV 取正文 → render → 外壳
  edit.js  [page]/edit.js                   编辑器 / 口令页
  api/login.js logout.js save.js history.js export.js
  _lib/page.js    绑本站资产 + KV 读取 + 静态回退
  _lib/auth.js    HMAC 签名 cookie、常量时间比较、失败计数
  _lib/editor.js  编辑器与口令页 HTML
  _lib/assets.js  ← build.py 生成(外壳/样式/页面元信息/回退正文)

tools/
  test_render.mjs   渲染器单测(25 条)
  check_parity.mjs  Function 侧组装 == docs/*.html 逐字节(build.py 调用)
  kv_import.py      把 content/*.html 导入 KV(会覆盖线上正文,慎用)
  cfenv.sh          从 VPS ~/.keys.md 现取 Cloudflare 凭证注入环境变量(不落盘)
```

KV 键:`page:<name>`(正文)、`history:<name>:<毫秒时间戳>`(最近 20 版)、`login_fail:<ip>`(TTL 900 s)。

---

# 7. 怎么同步回 GitHub 备份站(手动,需要时才做)

```bash
cd /Users/cc/Public/x84sb/legal-site
source tools/cfenv.sh
# 1. 登录拿 cookie(口令见 Air 上那个文件)
curl -s -c /tmp/cj -X POST -H 'Content-Type: application/json' \
     -d '{"passphrase":"<口令>"}' https://xiaotiantian-app.pages.dev/api/login
# 2. 把线上四页正文导出来覆盖 content/
curl -s -b /tmp/cj https://xiaotiantian-app.pages.dev/api/export | python3 -c "
import json,sys,pathlib
j=json.load(sys.stdin)
for k,v in j['pages'].items(): pathlib.Path(f'content/{k}.html').write_text(v['source']+'\n',encoding='utf-8')
print('已覆盖', list(j['pages']))"
# 3. 重新构建 + 推 GitHub
python3 build.py && git add content docs && git commit -m "sync: 从线上 KV 拉回正文" && git push
```
反方向(仓库 → 线上)是 `python3 tools/kv_import.py`,**会盖掉 owner 在网页上的改动**。

---

# 8. 凭证处置

- `EDIT_PASSPHRASE`:19 字符(4 组 4 位 + 连字符),字母表去掉了 `i l o 0 1` 等易混字符,熵 ≈ 79 bit。
- `EDIT_COOKIE_KEY`:32 字节随机数的 base64。
- 两个都用 `wrangler pages secret put` 写进 Cloudflare(production 环境),`secret list` 已复核两条都在。
- 明文**只**落到 Air `~/Downloads/xiaotiantian-legal-site/EDIT-PASSPHRASE.txt`,mini 上的临时文件已删。
  **不在本回执、不在任何 commit、不在会话正文里。**
- Cloudflare API token 走 `tools/cfenv.sh` 从 VPS `~/.keys.md` 现取现用,不落盘、不进仓库。

---

# 9. 没碰的

App、通知、重复站 `xiaotiantian-legal.pages.dev`(仍是 2026-09-07 改版前的旧内容,待 owner 裁),
颗粒 2 遗留三件待裁(样式取值 / 邮箱 003 vs 009 / 重复站),ASC 后台的 URL 填写,App 内链接指向。
