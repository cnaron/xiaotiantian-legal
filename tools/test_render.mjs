// 渲染器单测(G-UNIT)。跑法:node tools/test_render.mjs
// 覆盖:四页正文直通逐字节等价 / Markdown 基本语法 / XSS 阴性对照六条。 2026.09.07 Naron
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../template/render.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const eq = (name, got, want) => {
  if (got === want) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + '\n    got : ' + JSON.stringify(got) + '\n    want: ' + JSON.stringify(want)); }
};
const has = (name, got, needle) => {
  if (got.includes(needle)) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + '\n    got : ' + JSON.stringify(got) + '\n    need: ' + JSON.stringify(needle)); }
};
const hasnt = (name, got, needle) => {
  if (!got.includes(needle)) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + '\n    got : ' + JSON.stringify(got) + '\n    must not contain: ' + JSON.stringify(needle)); }
};

console.log('[1] 四页正文 HTML 直通逐字节等价');
for (const p of ['index', 'privacy', 'terms', 'support']) {
  const src = fs.readFileSync(path.join(ROOT, 'content', p + '.html'), 'utf8').replace(/\n+$/, '');
  eq('content/' + p + '.html 直通', render(src), src);
}

console.log('[2] Markdown 子集');
eq('二级标题', render('## 标题'), '        <h2>标题</h2>');
eq('三级标题', render('### 小标题'), '        <h3>小标题</h3>');
eq('段落+加粗', render('这里**很重要**。'), '        <p>这里<strong>很重要</strong>。</p>');
eq('无序列表', render('- 甲\n- 乙'), '        <ul>\n            <li>甲</li>\n            <li>乙</li>\n        </ul>');
eq('有序列表', render('1. 甲\n2. 乙'), '        <ol class="list-decimal">\n            <li>甲</li>\n            <li>乙</li>\n        </ol>');
eq('行内代码', render('用 `com.playtime.ropecounter`'), '        <p>用 <code>com.playtime.ropecounter</code></p>');
eq('链接', render('见[隐私政策](./privacy.html)'), '        <p>见<a href="./privacy.html">隐私政策</a></p>');
eq('分隔线', render('---'), '        <hr>');

console.log('[3] XSS / 白名单阴性对照');
{
  const r = render('<p>前</p>\n<script>alert(1)</script>\n<p>后</p>');
  has('script 被转义', r, '&lt;script&gt;');
  hasnt('script 不成标签', r, '<script');
  hasnt('/script 不成标签', r, '</script>');
}
{
  const r = render('<p onclick="alert(1)">点我</p>');
  has('onclick 整个标签被转义', r, '&lt;p onclick=&quot;alert(1)&quot;&gt;');
  hasnt('onclick 未直通', r, '<p onclick');
}
{
  const r = render('<p><a href="javascript:alert(1)">走</a></p>');
  has('javascript: href 被转义', r, '&lt;a href=&quot;javascript:alert(1)&quot;&gt;');
  hasnt('javascript: 未直通', r, '<a href="javascript:');
}
{
  const r = render('<div class="evil-injected">x</div>');
  has('未知 class 被转义', r, '&lt;div class=&quot;evil-injected&quot;&gt;');
}
{
  const r = render('<iframe src="https://evil.example"></iframe>');
  hasnt('iframe 不成标签', r, '<iframe');
  has('iframe 被转义', r, '&lt;iframe');
}
{
  const r = render('<img src=x onerror=alert(1)>');
  hasnt('img 不成标签', r, '<img');
}
{
  const r = render('见[恶意](javascript:alert(1))');
  hasnt('Markdown 链接的 javascript: 被拦', r, 'href="javascript:');
}
{
  const r = render('<style>body{display:none}</style>');
  hasnt('style 不成标签', r, '<style');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
