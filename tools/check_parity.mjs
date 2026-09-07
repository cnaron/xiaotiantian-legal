// 自检:用 Function 侧的同一条代码路径(render + buildPage)重算四页,与 docs/*.html 逐字节比。
// 由 build.py 调用;单独跑也行:node tools/check_parity.mjs   2026.09.07 Naron
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPage, PAGE_NAMES } from '../functions/_lib/page.js';
import { FALLBACK, PAGES } from '../functions/_lib/assets.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let bad = 0;
for (const name of PAGE_NAMES) {
  const got = buildPage(name, FALLBACK[name]);
  const want = fs.readFileSync(path.join(ROOT, 'docs', PAGES[name].out), 'utf8');
  if (got === want) console.log(`parity ok    ${PAGES[name].out}  ${Buffer.byteLength(got)} B`);
  else {
    bad++;
    console.log(`parity FAIL  ${PAGES[name].out}`);
    const a = want.split('\n'), b = got.split('\n');
    for (let i = 0; i < Math.max(a.length, b.length); i++)
      if (a[i] !== b[i]) { console.log('  line ' + (i + 1) + '\n  docs: ' + JSON.stringify(a[i]) + '\n  fn  : ' + JSON.stringify(b[i])); break; }
  }
}
process.exit(bad === 0 ? 0 : 1);
