# 小天天练跳绳 · 法律与支持页

> **X122 颗粒 5:已完成并上线(2026-09-08)。四页内容逐句核实到 App 现状。**
> owner:「把内容都核实一遍,不要展示官网,价格和当前保持一致,同时也要加入可编辑的页面」
> ⇒ 颗粒 4 那张「原版与现状差异表(10 处)」**已逐条改成真话**,每条都落到 iOS 源码行号
> (预注册 [`PREREG-X122-G5.md`](./PREREG-X122-G5.md) §1 的 24 条事实清单)。
> 最要紧的三处:**视频留存说实话**(每局本地留一条,只留最新一局,可回看/导出,不上传)、
> **订阅制改买断五档**(¥28 / ¥48 / ¥128,升级 ¥98 / ¥78,**不自动续费、无免费试用**)、
> **权限 2 条补到 6 条**。另按 owner 令:**站上 `gugushizi.com` 已清零**(改前 6 处),
> 主页「关于本站」那段技术/托管说明**整节删除**,全站不再出现「托管 / GitHub / Cloudflare」等字样。
> 七条判据全绿(三条文案闸带真阴性对照)。**样式表/外壳/字体一个字节没碰** ——
> privacy/terms 的 `<head>`(整套内联 CSS)改前改后逐字节相同。
> 完整交付说明见 [`RECEIPT-X122-G5.md`](./RECEIPT-X122-G5.md);**三件待 owner 过目**见其 §6。

> **X122 颗粒 4:已完成并上线(2026-09-08)。隐私政策 / 用户协议改用 owner 原版页面。**
> owner:「你这个隐私政策跟原版还是有差距呀,直接用原版代码就好了呀」⇒ 不再自己重写,
> 把原版两页**整篇搬过来**,只删页脚版权行 + 把两处外链资源搬成同源。
> 并排逐像素实测:**除被删的底栏外全等**。见 [`RECEIPT-X122-G4.md`](./RECEIPT-X122-G4.md)。
> ⚠️ 那一轮登记的「原版与现状 10 处出入」**已由颗粒 5 全部处理**,此告警作废。

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

**整页模式(颗粒 4 起)**:`privacy` / `terms` 在 `content/pages.json` 里带 `"fullpage": true`,
它们的 `content/*.html` 就是**整篇文档**(自带 `<html>`/`<head>`/内联 `<style>`),
外壳 `template/shell.html` 与 `template/style.css` 对这两页**完全不生效**。
要重新从原版生成,跑 `python3 tools/adopt_original.py <原版html> <dumpcss产物> content/<page>.html`。

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
| `privacy.html` | owner 原版隐私政策整页(整页模式,不套外壳);**正文已按颗粒 5 核实到 App 现状,2026-09-08 生效** |
| `terms.html` | owner 原版用户协议整页(整页模式,不套外壳);**正文已按颗粒 5 核实到 App 现状,2026-09-08 生效** |
| `support.html` | 支持与帮助(常见问题 + 联系邮箱) |
| `404.html` | 错误文档 |
| ~~`style.css`~~ | **已删**:样式在构建时内联进每页(零外链) |
| `assets/noto-sans-sc.css` + `assets/fonts/*.woff2` | 自托管中文字体(101 分片 4.5 MB),privacy/terms 用。**是 vendored 资产,不是构建产物,`build.py` 不动它** |

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

- **纯静态、零脚本、零外域**:公开页没有 JavaScript、没有统计 / 广告 / 第三方资源、不设置 Cookie。
  颗粒 4 起 privacy/terms 会额外取一份**同源**字体(`assets/noto-sans-sc.css`)——
  仍然一个外部域名都不连,但不再是「每页一个自包含文件」了。
  渲染器在整页模式下**结构性**保证这点:白名单里没有 script/img/link/iframe,
  唯一的 `<style>` 口子由 `checkCss()` 挡住外域 `url()` 与 `@import`;`build.py` 另有一道零外域自检。
- **页面之间用相对链接**(`./privacy.html`)⇒ 换域名 / 换托管商不需要改任何文件。
  (代价:Cloudflare 上站内点击会多一次 308;给 ASC / App 的入口 URL 一律用无后缀形式,零跳转。)
- **内容必须与 App 实际行为一致**:改 App 行为(权限、视频留存、付费档位)时,
  必须同步改本仓库对应段落并更新页顶版本号与生效日期。
  ✅ **颗粒 5(2026-09-08)起四页都满足这一条**:每句话都能指到 iOS 源码里的出处,
  查不到出处的三条断言(±5% 误差 / proration / 「本 App 不联网」)已删除而非改小。
  文案闸 `python3 tools/gates_g5.py docs` 可随时复跑(NOSITE / PRICE / TECH 三条)。

## 事实基线(2026-09-08 复核,逐条有代码出处 —— 见 PREREG-X122-G5.md §1)

- 权限 6 条:相机 / 麦克风 / 相册读 / 相册写 / 健康写 / 健康读声明
- 每局生成一条本地视频,**单槽只留最新一局**,不上传
- 付费:1 年 ¥28、3 年 ¥48(非续期订阅,到期不自动续费)、永久 ¥128;
  升级 1 年→永久 ¥98、3 年→永久 ¥78
- 免费档:体测模式累计 3 次、历史最近 3 条、趋势近 3 天(Pro 近 7 天)
- **唯一一处网络请求 = 「联系我们」提交**(发 8 个字段,不含身份标识);除此之外全程不联网
- 开发者邮箱 `shengtang009@126.com`(**009**;颗粒 2 遗留的 003 已改正)
- 记录可逐条删除;「设置→开发选项→清空所有记录」整段包在 `#if DEBUG`,上架包不编译
- 间歇训练(HIIT)**在 UI 上没有入口** ⇒ 四页一律不提
- 内置评分标准 6 套:国家标准(教育部)/ 北京 / 上海 / 广东(广州)/ 江苏(南京)/ 浙江(杭州)
