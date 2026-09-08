// X122 颗粒 6 的可重跑闸门。回答的问题只有一个:
//   **「只改一个词,线上是不是只变那个词?」**
// 跑法(先 source tools/cfenv.sh 不需要;要的是编辑器口令):
//   EDIT_PASSPHRASE=<口令> node tools/gate_g6.mjs [--base https://xiaotiantian-app.pages.dev]
// 会真的往线上四页各写一次再改回去,结束时逐字节复原并核对。 2026.09.08 Naron

import { render, renderFull, renderPage } from '../template/render.js';
import { SHELL, CSS_MIN, PAGES } from '../functions/_lib/assets.js';

const BASE = (() => { const i = process.argv.indexOf('--base'); return i > 0 ? process.argv[i + 1] : 'https://xiaotiantian-app.pages.dev'; })();
const PASS = process.env.EDIT_PASSPHRASE || '';
const PAGE_NAMES = ['index', 'privacy', 'terms', 'support'];
// 四页各挑一个真出现在正文里的词,换成一个同样长度级别、明显不同的词
const WORDS = { index: ['隐私', '私隐'], privacy: ['不收集', '未收集'], terms: ['用户', '使用者'], support: ['常见', '常问'] };

let cookie = '';
const results = [];
const rec = (gate, ok, note) => { results.push({ gate, ok, note }); console.log(`  ${ok ? '✅' : '❌'} ${gate} —— ${note}`); };

const cb = () => `cb=${Date.now()}${Math.floor(Math.random() * 1e9)}`;
const urlOf = (p, bust = true) => `${BASE}/${p === 'index' ? '' : p}${bust ? '?' + cb() : ''}`;

async function api(path, init = {}) {
  const r = await fetch(BASE + path, { ...init, headers: { ...(init.headers || {}), ...(cookie ? { cookie } : {}) } });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  return r;
}
async function login() {
  const r = await api('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passphrase: PASS }) });
  const j = await r.json(); if (!j.ok) throw new Error('登录失败:' + JSON.stringify(j));
}
async function exportAll() { const j = await (await api('/api/export')).json(); if (!j.ok) throw new Error('export 失败'); return j.pages; }
async function save(page, body) {
  const j = await (await api('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page, body }) })).json();
  if (!j.ok) throw new Error('save 失败:' + JSON.stringify(j));
  return j;
}
const getLive = async (p) => (await fetch(urlOf(p))).text();
const diffLines = (a, b) => {
  // 最朴素的行级 diff 就够了:我们要的是「差异行数」,不是最优编辑脚本
  const A = a.split('\n'), B = b.split('\n'), out = [];
  const n = Math.max(A.length, B.length);
  if (A.length !== B.length) return { count: 999, lines: [`行数不同 ${A.length} vs ${B.length}`] };
  for (let i = 0; i < n; i++) if (A[i] !== B[i]) out.push({ i, a: A[i], b: B[i] });
  return { count: out.length * 2, lines: out };
};

// ── 阴性对照:一条「会重排」的保存链(归一化换行 + 去行尾空格 + <p> 重新包装)──────
// 它证明这几条闸真的能抓到重排,不是永远绿。
function legacyNormalizingSave(src) {
  return src.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, '').replace(/^\s+/, ''))
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
}

// ── G6-SEC:7 类 XSS 在两种模式下都必须被转义 ────────────────────────────────
// needle = **「还活着」的形态**(真标签 / 真属性)。转义后的 `&lt;p onclick=&quot;…` 里
// 照样有 onclick 这几个字母,但那是页面上的可见文字,不是属性 ⇒ 拿裸词当 needle 会误报,
// 所以这里一律钉「带尖括号的真标签形态」。 2026.09.08 Naron
const XSS = [
  ['<script>alert(1)</script>', '<script'],
  ['<p onclick="alert(1)">x</p>', '<p onclick'],
  ['<a href="javascript:alert(1)">x</a>', '<a href="javascript:'],
  ['<iframe src="//evil.com"></iframe>', '<iframe'],
  ['<img src=x onerror=alert(1)>', '<img'],
  ['<p class="totally-unknown-class">x</p>', '<p class="totally-unknown-class"'],
  ['<style>a{}</style><script>alert(1)</script>', '<script'],
];

async function main() {
  console.log(`# X122-G6 闸门 · ${BASE}\n`);

  // ── G6-SEC(离线,不用登录)────────────────────────────────────────────────
  let secOk = true, secNotes = [];
  for (const [payload, needle] of XSS) {
    for (const [mode, fn] of [['片段', render], ['整页', renderFull]]) {
      const out = fn(payload);
      if (out.includes(needle)) { secOk = false; secNotes.push(`${mode}模式漏了 ${needle}`); }
    }
  }
  rec('G6-SEC', secOk, secOk ? `7 类 XSS × 片段/整页两模式 = 14 例全被转义` : secNotes.join(';'));

  if (!PASS) { console.log('\n(没给 EDIT_PASSPHRASE,只跑了离线闸)'); return finish(); }
  await login();
  const before = await exportAll();

  // ── G6-CACHE ─────────────────────────────────────────────────────────────
  // 真正要保证的是「owner 保存后刷新,一定看到新页」。
  // ⚠️ 预注册里写的「条件请求回 304」这一半**做不到**:Cloudflare 会把 Pages Functions 响应上的
  //    ETag 剥掉(强/弱、gzip/identity、生产域/预览域 六种组合实测全被剥,见 RECEIPT-X122-G6.md)。
  //    代码里的 ETag 留着(平台哪天不剥就立刻生效),但闸不能拿一个不由我们决定的东西当通过线。
  //    改成钉真正管用的那两条:头里没有任何允许画旧页的余量 + max-age=0。
  //    「真浏览器保存后立刻看到新页」由 shot warm-cache 实测另行验(带阴性对照,见回执 §4)。
  {
    const r1 = await fetch(urlOf('privacy'));
    const cc = r1.headers.get('cache-control') || '', etag = r1.headers.get('etag') || '';
    const noStale = !/stale-while-revalidate/i.test(cc) && !/s-maxage/i.test(cc) && /max-age=0/.test(cc) && /must-revalidate/.test(cc);
    rec('G6-CACHE', noStale,
      `Cache-Control="${cc}"(不含 stale-while-revalidate / s-maxage,且 max-age=0 + must-revalidate)· ETag ${etag ? '=' + etag : '被 CF 剥掉(平台限制,已记账)'}`);
  }

  // ── G6-ONEWORD + G6-RT ───────────────────────────────────────────────────
  for (const page of PAGE_NAMES) {
    const src = before[page].source;
    const [oldW, newW] = WORDS[page];
    const at = src.indexOf(oldW);
    if (at < 0) { rec(`G6-ONEWORD/${page}`, false, `正文里找不到「${oldW}」,闸没跑成`); continue; }
    const liveBefore = await getLive(page);

    await save(page, src.slice(0, at) + newW + src.slice(at + oldW.length));
    const liveEdit = await getLive(page);
    const d = diffLines(liveBefore, liveEdit);
    const onlyThatWord = d.count === 2 && d.lines.length === 1 &&
      d.lines[0].a.replace(oldW, newW) === d.lines[0].b;
    rec(`G6-ONEWORD/${page}`, onlyThatWord,
      `线上变化行数=${d.count}(期望 2);「${oldW}」→「${newW}」${onlyThatWord ? ',该行其余字节不动' : ''}`);

    // 阴性对照:同一份输入过一遍会重排的旧式保存链 ⇒ 差异必须 > 2
    const normed = legacyNormalizingSave(src);
    const dNeg = diffLines(renderPage(SHELL, CSS_MIN, PAGES[page], src), renderPage(SHELL, CSS_MIN, PAGES[page], normed));
    rec(`G6-ONEWORD/${page}·阴性对照`, dNeg.count > 2,
      `换成「保存时做归一化」的旧式链路 ⇒ 差异 ${dNeg.count} 行(必须 >2,否则这条闸抓不到重排)`);

    await save(page, src);
    const liveBack = await getLive(page);
    rec(`G6-RT/${page}`, liveBack === liveBefore,
      liveBack === liveBefore ? '改一字→存→改回→存,线上逐字节复原' : `未复原,差 ${diffLines(liveBefore, liveBack).count} 行`);
  }

  // 收尾:确认四页正文与起点逐字节相同
  const after = await exportAll();
  const same = PAGE_NAMES.every((p) => after[p].source === before[p].source);
  rec('G6-RT/收尾', same, same ? 'KV 四页正文与开跑前逐字节相同' : '⚠️ KV 与开跑前不同,需人工核对');
  finish();
}

function finish() {
  const bad = results.filter((r) => !r.ok);
  console.log(`\n总判定:${bad.length === 0 ? '✅ 全绿' : `❌ ${bad.length} 条红`}  (共 ${results.length} 条)`);
  process.exit(bad.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error('闸门跑挂了:', e); process.exit(2); });
