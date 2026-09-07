// 小天天练跳绳 · 法律页正文渲染器(**双端同源**:Worker 与浏览器预览跑同一份代码)
//
// 输入格式 = 「HTML 直通 + Markdown 便捷语法」,不是 CommonMark。理由见 PREREG-X122-G3.md §1:
//   顶层块以 `<`(白名单标签)或 `<!--` 开头 ⇒ **原样直通,逐字节不动**(保住与颗粒 2 静态页
//   逐字节等价);其余块按 Markdown 子集解析。4 空格缩进代码块语法整个禁用(现有正文每行都
//   缩进 8 空格,留着必然误判)。
//
// 安全模型 = 白名单 + 「校验后原样吐回」(不重新序列化,否则字节会变):
//   标签不在白名单 / 属性不在白名单 / class 取值不在样式表里 / href 协议不安全
//   ⇒ 把该 token 按字面转义成可见文字,绝不执行。
// 2026.09.07 Naron

const ALLOWED_TAGS = new Set([
  'section', 'p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i',
  'code', 'a', 'div', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'br', 'hr', 'blockquote', 'pre', 'small',
]);

// 块级标签:只有它们能开启「顶层 HTML 直通块」
const BLOCK_TAGS = new Set([
  'section', 'p', 'h2', 'h3', 'h4', 'ul', 'ol', 'div', 'table', 'blockquote', 'pre', 'hr',
]);

const VOID_TAGS = new Set(['br', 'hr']);

// class 白名单 = template/style.css 里真实存在的类名(build.py 会核对,漏了就构建失败)
const ALLOWED_CLASSES = new Set([
  'policy-container', 'meta-info', 'highlight-box', 'warn', 'contact-info',
  'entry-list', 'entry', 'list-decimal',
  'mt-2', 'mt-4', 'ml-4', 'ml-5', 'text-sm', 'text-gray-500', 'text-blue-600',
]);

const ALLOWED_ATTRS = new Set(['class', 'href']);

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
}

function safeHref(v) {
  const t = v.trim();
  if (t === '') return false;
  if (/^(\.\/|\.\.\/|\/|#)/.test(t)) return true;                 // 站内相对/锚点
  return /^(https?:|mailto:)/i.test(t) && !/[\x00-\x1f]/.test(t);  // 只放行三种协议
}

// ── 逐 token 校验;通过的 token 原样返回(保字节),不通过的整段转义 ────────────
function sanitizeHtml(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt === -1) { out += src.slice(i); break; }
    out += src.slice(i, lt);

    // HTML 注释:必须完整闭合才直通(现有正文里有编辑指引注释)
    if (src.startsWith('<!--', lt)) {
      const end = src.indexOf('-->', lt + 4);
      if (end !== -1) { out += src.slice(lt, end + 3); i = end + 3; continue; }
      out += '&lt;'; i = lt + 1; continue;
    }

    const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)(\/?)>/.exec(src.slice(lt));
    if (!m) { out += '&lt;'; i = lt + 1; continue; }   // 不成其为标签的裸 `<`

    const token = m[0];
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    const attrSrc = m[3];

    if (!ALLOWED_TAGS.has(tag)) { out += escapeHtml(token); i = lt + token.length; continue; }
    if (closing) {
      if (attrSrc.trim() !== '') { out += escapeHtml(token); }
      else { out += token; }
      i = lt + token.length; continue;
    }

    // 属性逐条校验
    let ok = true;
    const attrRe = /([a-zA-Z_:][a-zA-Z0-9_.:-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let a;
    while ((a = attrRe.exec(attrSrc)) !== null) {
      const name = a[1].toLowerCase();
      const val = a[2] !== undefined ? a[2] : a[3] !== undefined ? a[3] : a[4] !== undefined ? a[4] : '';
      if (!ALLOWED_ATTRS.has(name)) { ok = false; break; }
      if (name === 'class') {
        for (const c of val.split(/\s+/).filter(Boolean)) {
          if (!ALLOWED_CLASSES.has(c)) { ok = false; break; }
        }
        if (!ok) break;
      }
      if (name === 'href' && !safeHref(val)) { ok = false; break; }
    }
    out += ok ? token : escapeHtml(token);
    i = lt + token.length;
  }
  return out;
}

// ── Markdown 子集(行内)────────────────────────────────────────────────────
function mdInline(s) {
  let t = s;
  t = t.replace(/`([^`]+)`/g, (_, c) => '<code>' + escapeHtml(c) + '</code>');
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
    (whole, text, href) => (safeHref(href) ? `<a href="${escapeHtml(href)}">${text}</a>` : escapeHtml(whole)));
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*\w])\*([^*\n]+)\*(?=[^*\w]|$)/g, '$1<em>$2</em>');
  return t;
}

const IND = '        ';   // 与现有正文一致的 8 空格缩进

// ── Markdown 子集(块级)────────────────────────────────────────────────────
function mdBlocks(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const t = raw.trim();
    if (t === '') { i++; continue; }

    if (t.startsWith('```')) {                                  // 围栏代码
      i++;
      const buf = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) { buf.push(lines[i]); i++; }
      if (i < lines.length) i++;
      out.push(IND + '<pre><code>' + escapeHtml(buf.join('\n')) + '</code></pre>');
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { out.push(IND + '<hr>'); i++; continue; }

    const h = /^(#{2,4})\s+(.*)$/.exec(t);
    if (h) { const n = h[1].length; out.push(`${IND}<h${n}>${mdInline(h[2])}</h${n}>`); i++; continue; }

    if (/^([-*+])\s+/.test(t) || /^\d+[.)]\s+/.test(t)) {
      const ordered = /^\d+[.)]\s+/.test(t);
      const items = [];
      while (i < lines.length) {
        const lt = lines[i].trim();
        if (lt === '') break;
        const mm = ordered ? /^\d+[.)]\s+(.*)$/.exec(lt) : /^[-*+]\s+(.*)$/.exec(lt);
        if (!mm) break;
        items.push(`${IND}    <li>${mdInline(mm[1])}</li>`);
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      const cls = ordered ? ' class="list-decimal"' : '';
      out.push(`${IND}<${tag}${cls}>\n${items.join('\n')}\n${IND}</${tag}>`);
      continue;
    }

    if (t.startsWith('> ')) {
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        buf.push(lines[i].trim().replace(/^>\s?/, '')); i++;
      }
      out.push(`${IND}<blockquote>${mdInline(buf.join(' '))}</blockquote>`);
      continue;
    }

    const buf = [lines[i].trim()];                                // 普通段落
    i++;                                                         // 首行无条件吃掉,防死循环
    while (i < lines.length) {
      const lt = lines[i].trim();
      if (lt === '' || lt.startsWith('<') || /^#{2,4}\s/.test(lt) ||
          /^([-*+])\s/.test(lt) || /^\d+[.)]\s/.test(lt) || lt.startsWith('```')) break;
      buf.push(lt); i++;
    }
    out.push(`${IND}<p>${mdInline(buf.join(''))}</p>`);
  }
  return out.join('\n');
}

// ── 顶层切段:HTML 直通块 vs Markdown 块 ───────────────────────────────────
export function render(src) {
  const text = String(src == null ? '' : src).replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  let out = [];
  let i = 0;
  let mdBuf = [];
  // Markdown 段的产物同样过一遍白名单(用户在 md 里手打 <script> 也要被转义)
  const flushMd = () => { if (mdBuf.length) { out.push(sanitizeHtml(mdBlocks(mdBuf))); mdBuf = []; } };

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (t === '') {                       // 空行原样保留(字节等价靠它)
      if (mdBuf.length) mdBuf.push(line); else out.push(line);
      i++; continue;
    }

    if (t.startsWith('<!--')) {
      flushMd();
      const buf = [line];
      let j = i;
      while (j < lines.length && lines[j].indexOf('-->') === -1) { j++; if (j < lines.length) buf.push(lines[j]); }
      out.push(sanitizeHtml(buf.join('\n')));
      i = j + 1; continue;
    }

    const open = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(t);
    if (open && BLOCK_TAGS.has(open[1].toLowerCase())) {
      flushMd();
      const tag = open[1].toLowerCase();
      const buf = [];
      if (VOID_TAGS.has(tag)) { buf.push(line); i++; }
      else {
        const openRe = new RegExp(`<${tag}(?=[\\s>/])`, 'gi');
        const closeRe = new RegExp(`</${tag}\\s*>`, 'gi');
        let depth = 0;
        do {
          const l = lines[i];
          buf.push(l);
          depth += (l.match(openRe) || []).length - (l.match(closeRe) || []).length;
          i++;
        } while (i < lines.length && depth > 0);
      }
      out.push(sanitizeHtml(buf.join('\n')));
      continue;
    }

    mdBuf.push(line); i++;                // 其余交给 Markdown
  }
  flushMd();
  return out.join('\n');
}

export default render;
