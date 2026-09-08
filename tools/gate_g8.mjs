// X122 颗粒 8 的可重跑闸门。回答三个问题:
//   ① 层叠顺序对不对(Tailwind Preflight 必须在页面自己的 <style> **之前**)?
//   ② 经 /api/save 保存一次「只改一个词」之后,<style> / 所有 class / style= / 换行结构
//      是不是**逐字节不变**?(颗粒 8 新加的回归闸,钉的是颗粒 4 那类「样式被顺序/结构带歪」)
//   ③ privacy / terms 的实测排版是不是与 support **逐项相等**(owner 指定的参照)?
// 跑法:
//   node tools/gate_g8.mjs                      # 只跑离线闸(①③离线部分)
//   EDIT_PASSPHRASE=<口令> node tools/gate_g8.mjs   # 全跑(会真往线上写一次再改回去)
//   加 --skip-metric 跳过 WebKit 实测(CI 无图形环境时)
// 2026.09.08 Naron
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { render, renderFull } from '../template/render.js';

const BASE = (() => { const i = process.argv.indexOf('--base'); return i > 0 ? process.argv[i + 1] : 'https://xiaotiantian-app.pages.dev'; })();
const GH = 'https://cnaron.github.io/xiaotiantian-legal';
const PASS = process.env.EDIT_PASSPHRASE || '';
const PAGE_NAMES = ['index', 'privacy', 'terms', 'support'];
const FULLPAGE = ['privacy', 'terms'];
const WORDS = { index: ['隐私', '私隐'], privacy: ['不收集', '未收集'], terms: ['用户', '使用者'], support: ['常见', '常问'] };
const SLA = '提交后，我们通常会在 <strong>14 个工作日内</strong>通过 App 内「联系我们」回复。'
          + '对于重复提交、信息不足无法核实、或与本 App 无关的问题，我们保留不逐一回复的权利。';

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
  const j = await (await api('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passphrase: PASS }) })).json();
  if (!j.ok) throw new Error('登录失败:' + JSON.stringify(j));
}
async function exportAll() { const j = await (await api('/api/export')).json(); if (!j.ok) throw new Error('export 失败'); return j.pages; }
async function save(page, body) {
  const j = await (await api('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page, body }) })).json();
  if (!j.ok) throw new Error('save 失败:' + JSON.stringify(j));
  return j;
}
const getLive = async (p) => (await fetch(urlOf(p))).text();

// ── 结构指纹:闸②钉的四样东西 ────────────────────────────────────────────────
// 注释先剥掉再取 <style>:说明注释正文里带着字面量 "<style>",不剥会把边界找歪(颗粒 8 踩过)。
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');
const styleBlocks = (s) => [...stripComments(s).matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
const classAttrs = (s) => [...s.matchAll(/\sclass="([^"]*)"/g)].map((m) => m[1]);
const styleAttrs = (s) => [...s.matchAll(/\sstyle="([^"]*)"/g)].map((m) => m[1]);
// 换行结构 = 行数 + 每行的「前导空白 + 长度」剖面(排版靠缩进/空行的地方一动就露馅)
const lineShape = (s) => s.split('\n').map((l) => `${(l.match(/^[ \t]*/) || [''])[0].length}:${l.length}`);
const fp = (s) => ({ styles: styleBlocks(s), classes: classAttrs(s), styleAttr: styleAttrs(s), shape: lineShape(s) });
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 结构比较:允许 shape 里恰好一行长度变化(那一行就是被改的词所在行),其余必须全等
function structDiff(before, after, dLen) {
  const A = fp(before), B = fp(after);
  const out = [];
  if (!eq(A.styles, B.styles)) out.push(`<style> 变了(${A.styles.length}→${B.styles.length} 块)`);
  if (!eq(A.classes, B.classes)) out.push(`class 变了(${A.classes.length}→${B.classes.length} 个)`);
  if (!eq(A.styleAttr, B.styleAttr)) out.push(`style= 变了(${A.styleAttr.length}→${B.styleAttr.length} 个)`);
  if (A.shape.length !== B.shape.length) out.push(`行数变了 ${A.shape.length}→${B.shape.length}`);
  else {
    const bad = A.shape.map((v, i) => [i, v, B.shape[i]]).filter(([, v, w]) => v !== w);
    if (bad.length > 1) out.push(`换行/缩进剖面有 ${bad.length} 行变化(只允许 1 行:被改词所在行)`);
    else if (bad.length === 1) {
      const [i, v, w] = bad[0];
      const [ia, la] = v.split(':').map(Number), [ib, lb] = w.split(':').map(Number);
      if (ia !== ib) out.push(`第 ${i} 行缩进变了 ${ia}→${ib}`);
      else if (lb - la !== dLen) out.push(`第 ${i} 行长度变化 ${lb - la} ≠ 换词长度差 ${dLen}`);
    }
  }
  return out;
}

// ── 阴性对照:一条会把结构揉掉的「旧式保存链」──────────────────────────────
const legacyNormalizingSave = (src) => src.replace(/\r\n?/g, '\n').split('\n')
  .map((l) => l.replace(/\s+$/, '').replace(/^\s+/, ''))
  .filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');

// ── ① 层叠顺序 ──────────────────────────────────────────────────────────────
// 通过线:含 "tailwindcss v3" 的那块 <style> 必须排在含 "line-height: 1.8" 的那块**之前**。
function cascadeOk(html) {
  const bare = stripComments(html);
  const iTw = bare.indexOf('tailwindcss v3');
  const iPage = bare.indexOf('line-height: 1.8');
  if (iTw < 0 || iPage < 0) return { ok: false, note: `找不到标志串(tw=${iTw} page=${iPage})` };
  return { ok: iTw < iPage, note: `Tailwind 块 @${iTw} ${iTw < iPage ? '<' : '>'} 页面样式块 @${iPage}` };
}

// ── ③ 实测排版 ──────────────────────────────────────────────────────────────
const METRIC_JS = '/tmp/g8_metric.js';
const METRIC_SRC = `(function(){var o=[];var b=getComputedStyle(document.body);
function f(s){var e=document.querySelector(s);if(!e)return s+'=NONE';var c=getComputedStyle(e);
return s+'|fs='+c.fontSize+'|fw='+c.fontWeight+'|lh='+c.lineHeight+'|mt='+c.marginTop+'|mb='+c.marginBottom;}
o.push('body|lh='+b.lineHeight);
var ps=[].slice.call(document.querySelectorAll('p')).filter(function(p){return getComputedStyle(p).fontSize==='16px';});
var c=getComputedStyle(ps[0]);o.push('p16|lh='+c.lineHeight+'|mt='+c.marginTop+'|mb='+c.marginBottom);
o.push(f('h1'));o.push(f('h2'));o.push(f('h3'));
var u=document.querySelector('ul');var uc=getComputedStyle(u);
o.push('ul|list='+uc.listStyleType+'|ml='+uc.marginLeft+'|pl='+uc.paddingLeft);
var l=document.querySelector('li');var lc=getComputedStyle(l);o.push('li|lh='+lc.lineHeight+'|mb='+lc.marginBottom);
return o.join('\\n');})()`;
function metricsOf(target) {
  fs.writeFileSync(METRIC_JS, METRIC_SRC);
  const out = execFileSync('./tools/probe', [target, METRIC_JS, '6', 'nocache'], { encoding: 'utf8', timeout: 180000 });
  return out.trim().split('\n').filter(Boolean);
}

async function main() {
  console.log(`# X122-G8 闸门 · ${BASE}\n`);

  // ── G8-CASCADE(离线,含阴性对照)────────────────────────────────────────
  {
    const notes = [], negNotes = [];
    let ok = true, negOk = true;
    for (const p of FULLPAGE) {
      const r = cascadeOk(fs.readFileSync(`docs/${p}.html`, 'utf8'));
      if (!r.ok) ok = false;
      notes.push(`${p}:${r.note}`);
      // 阴性对照:修复前的字节(颗粒 8 首个 commit 的父提交)必须红
      const old = execFileSync('git', ['show', `HEAD:content/${p}.html`], { encoding: 'utf8' });
      const oldFixed = execFileSync('git', ['show', `3a15497^:content/${p}.html`], { encoding: 'utf8' });
      const rn = cascadeOk(oldFixed);
      if (rn.ok) negOk = false;
      negNotes.push(`${p}:${rn.note}`);
      void old;
    }
    rec('G8-CASCADE', ok, `Preflight 在页面样式之前 —— ${notes.join(' · ')}`);
    rec('G8-CASCADE·阴性对照', negOk, `修复前字节(3a15497^)必须红 —— ${negNotes.join(' · ')}`);
  }

  // ── G8-SLA(离线:统一话术恰好 3 处,四页无其它「工作日」提法)───────────
  {
    let hits = 0, other = 0;
    for (const p of PAGE_NAMES) {
      const s = fs.readFileSync(`docs/${p}.html`, 'utf8');
      const c = (s.match(new RegExp(SLA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      hits += c; other += (s.match(/工作日/g) || []).length - c;
    }
    rec('G8-SLA', hits === 3 && other === 0, `统一话术 ${hits} 处(期望 3:support/privacy/terms)· 其它「工作日」提法 ${other} 处(期望 0)`);
  }

  // ── G8-METRIC(WebKit 实测:privacy/terms 与 support 逐项相等)────────────
  if (!process.argv.includes('--skip-metric')) {
    try {
      const sup = metricsOf('docs/support.html');
      for (const p of FULLPAGE) {
        const m = metricsOf(`docs/${p}.html`);
        const bad = sup.map((v, i) => [v, m[i]]).filter(([a, b]) => a !== b);
        rec(`G8-METRIC/${p}`, bad.length === 0,
          bad.length === 0 ? `7 项排版指标与 support 全等(body lh=${sup[0].split('=')[1]})`
                           : `与 support 不同 ${bad.length} 项:${bad.map(([a, b]) => `${a} vs ${b}`).join(' / ')}`);
      }
    } catch (e) { rec('G8-METRIC', false, '跑不起来(需要图形会话下的 tools/probe):' + e.message); }
  }

  if (!PASS) { console.log('\n(没给 EDIT_PASSPHRASE,只跑了离线闸)'); return finish(); }
  await login();
  const before = await exportAll();

  // ── G8-STRUCT:真往线上存一次「只改一个词」,钉 <style>/class/style=/换行结构 ──
  for (const page of PAGE_NAMES) {
    const src = before[page].source;
    const [oldW, newW] = WORDS[page];
    const at = src.indexOf(oldW);
    if (at < 0) { rec(`G8-STRUCT/${page}`, false, `正文里找不到「${oldW}」,闸没跑成`); continue; }
    const dLen = newW.length - oldW.length;
    const liveBefore = await getLive(page);

    await save(page, src.slice(0, at) + newW + src.slice(at + oldW.length));
    const liveEdit = await getLive(page);
    const problems = structDiff(liveBefore, liveEdit, dLen);
    rec(`G8-STRUCT/${page}`, problems.length === 0,
      problems.length === 0
        ? `存一次(「${oldW}」→「${newW}」)后:<style> ${styleBlocks(liveBefore).length} 块 / class ${classAttrs(liveBefore).length} 个 / style= ${styleAttrs(liveBefore).length} 个 / ${lineShape(liveBefore).length} 行剖面 —— 除被改词那一行外逐字节不变`
        : problems.join(';'));

    // 阴性对照:同一份输入过一遍「会揉结构」的旧式保存链,这条闸必须红
    const fn = FULLPAGE.includes(page) ? renderFull : render;
    const neg = structDiff(fn(src), fn(legacyNormalizingSave(src)), 0);
    rec(`G8-STRUCT/${page}·阴性对照`, neg.length > 0,
      neg.length > 0 ? `换成「保存时做归一化」的旧式链路 ⇒ 抓到 ${neg.length} 类结构变化:${neg[0]}` : '⚠️ 没抓到,这条闸抓不动结构变化');

    await save(page, src);
    const liveBack = await getLive(page);
    rec(`G8-STRUCT/${page}·复原`, liveBack === liveBefore, liveBack === liveBefore ? '改回后线上逐字节复原' : '⚠️ 未复原,需人工核对');
  }

  // ── G8-LIVE:主站 4 页 + 备份站 4 页全 200;主站正文与 docs 逐字节同 ─────────
  {
    const bad = [];
    for (const p of PAGE_NAMES) {
      const want = fs.readFileSync(`docs/${p}.html`, 'utf8');
      const got = await getLive(p);
      if (got !== want) bad.push(`${p}(主站 ${got.length} vs docs ${want.length})`);
      const g = await fetch(`${GH}/${p}.html?${cb()}`);
      if (g.status !== 200) bad.push(`${p}(备份站 ${g.status})`);
    }
    rec('G8-LIVE', bad.length === 0, bad.length === 0 ? '主站 4 页逐字节 == docs;备份站 4 页 200' : bad.join(';'));
  }

  // ── G8-MAIL:八页邮箱裸词仍 0(颗粒 7 的尺子,回归闸)─────────────────────
  {
    let n = 0;
    for (const p of PAGE_NAMES) {
      for (const s of [await getLive(p), await (await fetch(`${GH}/${p}.html?${cb()}`)).text()]) {
        n += (s.match(/@126\.com|@qq\.com|邮箱/g) || []).length;
      }
    }
    rec('G8-MAIL', n === 0, `八页裸词 @126.com / @qq.com / 邮箱 命中 ${n} 处(期望 0)`);
  }

  const after = await exportAll();
  const same = PAGE_NAMES.every((p) => after[p].source === before[p].source);
  rec('G8-STRUCT/收尾', same, same ? 'KV 四页正文与开跑前逐字节相同' : '⚠️ KV 与开跑前不同,需人工核对');
  finish();
}

function finish() {
  const bad = results.filter((r) => !r.ok);
  console.log(`\n总判定:${bad.length === 0 ? '✅ 全绿' : `❌ ${bad.length} 条红`}  (共 ${results.length} 条)`);
  process.exit(bad.length === 0 ? 0 : 1);
}
main().catch((e) => { console.error('闸门跑挂了:', e); process.exit(2); });
