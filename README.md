# 小天天练跳绳 · 法律与支持页

iOS 应用「小天天练跳绳」(App ID `com.playtime.ropecounter`)的**公开静态页面**,
供 App Store Connect 填写「隐私政策 URL」「支持 URL」,以及 App 内设置页链接使用。

## 页面

| 文件 | 内容 |
|---|---|
| `index.html` | 目录页(静态网站索引文档) |
| `privacy.html` | 隐私政策 v2.0(生效 2026-09-07) |
| `terms.html` | 用户协议 v2.0(生效 2026-09-07) |
| `support.html` | 支持与帮助(常见问题 + 联系邮箱) |
| `404.html` | 错误文档 |
| `style.css` | 唯一样式表 |

## 托管(**两处,内容必须保持一致**)

| 站点 | URL 形态 | 发布方式 |
|---|---|---|
| **Cloudflare Pages**(推荐填 ASC) | `https://xiaotiantian-legal.pages.dev/privacy`(**无 `.html`**) | mini 上 `npx wrangler pages deploy dist` 直传(**不接 GitHub 仓库**) |
| **GitHub Pages**(备份) | `https://cnaron.github.io/xiaotiantian-legal/privacy.html` | `git push` 到 `main`,根目录发布 |

⚠️ Cloudflare 会把 `.html` 后缀 308 跳转掉;GitHub Pages 不会。两套地址形态不同,内容相同。
⚠️ **改文案要两边都发**:`git push` + 重跑一次 `wrangler pages deploy dist`。
**发布目录 = `docs/`**(只含 6 个对外文件)。两处托管都只发 `docs/`,
仓库根的 `README.md` / `RECEIPT-X122.md` 属内部文档,**不会被公网访问到** ——
这也是 owner 日后在 Cloudflare 里「Connect to Git」时能安全自动发布的前提
(输出目录填 `docs`)。

## 约定

- **纯静态、零脚本**:全站没有 JavaScript、没有统计 / 广告 / 第三方资源、不设置 Cookie
  —— 与隐私政策里「不收集任何信息」的承诺保持一致。
- **页面之间用相对链接**(`./privacy.html`)⇒ 换域名 / 换托管商不需要改任何文件。
- **内容必须与 App 实际行为一致**:改 App 行为(权限、视频留存、付费档位)时,
  必须同步改本仓库对应段落并更新页顶版本号与生效日期。

## 事实基线(2026-09-07)

- 权限 6 条:相机 / 麦克风 / 相册读 / 相册写 / 健康写 / 健康读声明
- 每局生成一条本地视频,**单槽只留最新一局**,不上传
- 付费:1 年 ¥28、3 年 ¥48(非续期订阅,到期不自动续费)、永久 ¥128;
  升级 1 年→永久 ¥98、3 年→永久 ¥78
- 免费档:体测模式累计 3 次、历史最近 3 条
- 内置评分标准 6 套:国家标准(教育部)/ 北京 / 上海 / 广东(广州)/ 江苏(南京)/ 浙江(杭州)
