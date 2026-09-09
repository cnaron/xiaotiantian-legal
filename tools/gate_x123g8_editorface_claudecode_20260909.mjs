// 第三面(编辑器)的量法:**真 KV 字节 + 真编辑器代码**,不经口令。
// 这不是"读代码推断",是把线上 KV 里那份正文喂进 /edit 页面真正用的那个渲染函数,量它的输出。
import { readFileSync } from 'node:fs';
import { editorPage } from '/Users/cc/Public/x84sb/legal-site/functions/_lib/editor.js';
const PATS = ['IP 地址','相册','Photos','照片','电子邮件','邮箱','抹去','运行日志'];
const EM = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
let bad = 0;
for (const n of ['index','privacy','terms','support']) {
  const kv = readFileSync(`/Users/cc/x123/g8/after/kv-${n}.html`, 'utf8').replace(/\n+$/,'');
  const html = await editorPage(n, kv).text();
  // ★★★ 坑(本轮踩了两次):同一把「剥 HTML 注释」的尺子,在三面各遇到一种**不同的转义形态**:
  //   线上渲染面 = 原样 `<!-- … -->`;编辑器 textarea 面 = `&lt;!-- … --&gt;`;
  //   编辑器把正文灌进 JS 字符串那一段 = `\u003c!-- … -->`。
  //   只剥第一种,owner 令那两句注释(「外部页面一律不写任何电子邮件地址」)会被当成命中。
  //   ⇒ 先把两种转义还原成 `<`/`>`,再剥注释。
  const plain = html.replace(/\\u003c/gi, '<').replace(/\\u003e/gi, '>')
                    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const body = plain.replace(/<!--[\s\S]*?-->/g, '');
  const hit = Object.fromEntries(PATS.map(p => [p, (body.split(p).length - 1)]).filter(([,v]) => v));
  const tot = Object.values(hit).reduce((a,b)=>a+b,0);
  const phone = body.split('手机号').length - 1;
  const em = (html.match(EM) || []).length;
  if (tot) bad++;
  console.log(`${n.padEnd(9)} 编辑器面命中 ${tot} ${JSON.stringify(hit)}  手机号 ${phone}  邮箱形状 ${em}  (编辑器页 ${html.length} B)`);
}
// ── 阳性对照:同一把尺子量**改前**那份 KV 正文,必须命中 ──────────────────────
// 只会说「0」的尺子没有信息量。改前基线是 /Users/cc/x123/g8/baseline/kv-*.html。
let ctrl = 0;
for (const n of ['privacy', 'support']) {
  const kv = readFileSync(`/Users/cc/x123/g8/baseline/kv-${n}.html`, 'utf8').replace(/\n+$/, '');
  const html = await editorPage(n, kv).text();
  const plain = html.replace(/\\u003c/gi, '<').replace(/\\u003e/gi, '>')
                    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const body = plain.replace(/<!--[\s\S]*?-->/g, '');
  const tot = PATS.map((x) => body.split(x).length - 1).reduce((a, b) => a + b, 0);
  ctrl += tot;
  console.log(`阳性对照 ${n.padEnd(7)} 改前编辑器面命中 ${tot}`);
}
if (ctrl === 0) { console.log('❌ 阳性对照没命中 ⇒ 这把尺子失灵,上面的 0 不算数'); process.exit(1); }
console.log(bad === 0 ? `✅ 编辑器面 = 0(阳性对照改前 = ${ctrl})` : '❌ 编辑器面仍有命中');
process.exit(bad === 0 ? 0 : 1);
