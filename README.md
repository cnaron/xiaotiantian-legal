# 小天天练跳绳 · 法律与支持页

> **X122 颗粒 3:已完成并上线(2026-09-07)。站内多了一个带口令的文档编辑器。**
> 打开 **<https://xiaotiantian-app.pages.dev/edit>** → 输口令 → 左边改字、右边同步看
> 「发布出来长什么样」→ 点「保存并发布」,**约 3 秒**线上就换了,不用碰 GitHub。
> 口令在 Air `~/Downloads/xiaotiantian-legal-site/EDIT-PASSPHRASE.txt`。
> 完整交付说明见 [`RECEIPT-X122-G3.md`](./RECEIPT-X122-G3.md)。
>
> **⚠️ 正文的权威来源从此是 Cloudflare KV,不再是本仓库的 `content/`。**
> owner 在网页上改完之后,仓库里的 `content/` 与 `docs/` 就落后了;
> GitHub Pages 备份站(`cnaron.github.io/xiaotiantian-legal/`)**不会自动跟随**,
> 只当应急。要把线上内容倒回仓库,见回执 §7「怎么同步回 GitHub 备份站」。
>
> 颗粒 2 遗留、仍等 owner 拍板两项:① 样式取「按样式表写的值」还是「照抄老页面实际长相」
> ② 联系邮箱 `003` 还是 `009`。另有一个内容已过时的重复站 `xiaotiantian-legal.pages.dev` 待裁。

iOS 应用「小天天练跳绳」(App ID `com.playtime.ropecounter`)的**公开静态页面**,
供 App Store Connect 填写「隐私政策 URL」「支持 URL」,以及 App 内设置页链接使用。

## 两条改文案的路(颗粒 3 起)

| | A. 网页编辑器(owner 日常用) | B. 改仓库再发布(改样式/结构时用) |
|---|---|---|
| 入口 | <https://xiaotiantian-app.pages.dev/edit> | 本仓库 `content/` + `template/` |
| 改的是 | Cloudflare KV 里的正文 | 仓库源文件 |
| 生效 | 点「保存并发布」约 3 秒 | `python3 build.py` → `git push` → `source tools/cfenv.sh && npx wrangler pages deploy` |
| 影响面 | 只换正文 | 外壳/样式/新页面都能改 |

⚠️ **两条路会互相盖**:走 B 重新导入 KV(`python3 tools/kv_import.py`)会把 owner
在网页上改的内容盖掉;反过来只发布代码(`wrangler pages deploy`)不会动 KV,是安全的。
要先把线上内容拉回仓库,见回执 §7。

## 构建(2026-09-07 起)

`docs/` 是**构建产物,不要直接手改**。源在:
`template/shell.html`(外壳)+ `template/style.css`(样式)+ `content/<page>.html`(正文片段)
+ `content/pages.json`(标题/日期)+ `template/render.js`(渲染器),
改完跑 `python3 build.py` 重新生成 `docs/` 与 `functions/_lib/` 里的产物。
`build.py` 会自检三件事,任一不过就构建失败:渲染器三份副本 sha256 一致 /
正文用到的 class 都在渲染器白名单里 / **Function 侧组装出来的四页与 `docs/*.html` 逐字节相同**。

单测:`node tools/test_render.mjs`(25 条,含 7 类 XSS 阴性对照)。

## 页面(docs/ 下)

| 文件 | 内容 |
|---|---|
| `index.html` | 目录页(静态网站索引文档)|
| `privacy.html` | 隐私政策 v2.0(生效 2026-09-07) |
| `terms.html` | 用户协议 v2.0(生效 2026-09-07) |
| `support.html` | 支持与帮助(常见问题 + 联系邮箱) |
| `404.html` | 错误文档 |
| ~~`style.css`~~ | **已删**:样式在构建时内联进每页(零外链) |

## 托管(**两处,内容必须保持一致**)

| 站点 | URL 形态 | 发布方式 |
|---|---|---|
| **Cloudflare Pages**(★ 主用,填 ASC) | `https://xiaotiantian-app.pages.dev/privacy`(**无 `.html`**,直接 200 零跳转) | mini 上 `npx wrangler pages deploy docs --project-name xiaotiantian-app` 直传(**不接 GitHub 仓库**) |
| **GitHub Pages**(备份) | `https://cnaron.github.io/xiaotiantian-legal/privacy.html` | `git push` 到 `main`,**`/docs` 目录**发布 |

⚠️ Cloudflare 会把 `.html` 后缀 308 跳转掉;GitHub Pages 不会。两套地址形态不同,内容相同。
⚠️ **改文案要两边都发**:改 `content/` → `python3 build.py` → `git push` + 重跑一次 `wrangler pages deploy docs`。
⚠️ **还有一个内容已过时的重复站** `https://xiaotiantian-legal.pages.dev/` —— 本轮按 owner 令未动,
  它仍是 2026-09-07 改版**之前**的内容(写着「不保存视频」「自动续费」)。**等 owner 裁:删掉,或也发一份。**
**发布目录 = `docs/`**(只含对外文件)。两处托管都只发 `docs/`,
仓库根的 `README.md` / `RECEIPT-X122.md` 属内部文档,**不会被公网访问到** ——
这也是 owner 日后在 Cloudflare 里「Connect to Git」时能安全自动发布的前提
(输出目录填 `docs`)。

## 约定

- **纯静态、零脚本、零外链**:全站没有 JavaScript、没有统计 / 广告 / 第三方资源、没有外部字体、不设置 Cookie
  —— 与隐私政策里「不收集任何信息」的承诺保持一致。
- **页面之间用相对链接**(`./privacy.html`)⇒ 换域名 / 换托管商不需要改任何文件。
  (代价:Cloudflare 上站内点击会多一次 308;给 ASC / App 的入口 URL 一律用无后缀形式,零跳转。)
- **内容必须与 App 实际行为一致**:改 App 行为(权限、视频留存、付费档位)时,
  必须同步改本仓库对应段落并更新页顶版本号与生效日期。

## 事实基线(2026-09-07)

- 权限 6 条:相机 / 麦克风 / 相册读 / 相册写 / 健康写 / 健康读声明
- 每局生成一条本地视频,**单槽只留最新一局**,不上传
- 付费:1 年 ¥28、3 年 ¥48(非续期订阅,到期不自动续费)、永久 ¥128;
  升级 1 年→永久 ¥98、3 年→永久 ¥78
- 免费档:体测模式累计 3 次、历史最近 3 条
- 内置评分标准 6 套:国家标准(教育部)/ 北京 / 上海 / 广东(广州)/ 江苏(南京)/ 浙江(杭州)
