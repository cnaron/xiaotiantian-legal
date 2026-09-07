// 编辑器与口令页的 HTML。两页都零外链(自带样式,渲染器从同源 /edit-render.js 取)。
// 2026.09.07 Naron
import { SHELL, CSS_MIN, PAGES } from './assets.js';
import { PAGE_NAMES } from './page.js';
import { NO_STORE } from './auth.js';

const CHROME = `
*,::before,::after{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",Arial,sans-serif;
     background:#0f172a;color:#e2e8f0;line-height:1.6}
a{color:#7dd3fc}
.bar{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;padding:.6rem .9rem;background:#1e293b;border-bottom:1px solid #334155;position:sticky;top:0;z-index:5}
.bar .grow{flex:1}
.tab{padding:.35rem .8rem;border-radius:.4rem;background:#334155;color:#cbd5e1;text-decoration:none;font-size:.9rem}
.tab.on{background:#0ea5e9;color:#fff;font-weight:600}
button{font:inherit;padding:.4rem .9rem;border:0;border-radius:.4rem;background:#334155;color:#e2e8f0;cursor:pointer}
button.primary{background:#0ea5e9;color:#fff;font-weight:600}
button:disabled{opacity:.5;cursor:default}
select{font:inherit;padding:.35rem .5rem;border-radius:.4rem;background:#334155;color:#e2e8f0;border:1px solid #475569}
.wrap{display:flex;height:calc(100vh - 52px)}
.pane{flex:1;min-width:0;display:flex;flex-direction:column}
.pane h4{margin:0;padding:.35rem .8rem;font-size:.78rem;font-weight:600;color:#94a3b8;background:#111c2e;letter-spacing:.05em}
textarea{flex:1;width:100%;border:0;outline:0;resize:none;padding:.9rem;background:#0b1220;color:#e2e8f0;
         font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;line-height:1.65;tab-size:4}
iframe{flex:1;width:100%;border:0;background:#fff}
.status{font-size:.85rem;color:#94a3b8;padding:0 .4rem}
.status.ok{color:#4ade80}.status.err{color:#f87171}
@media (max-width:900px){.wrap{flex-direction:column;height:auto}.pane{height:60vh}}
`;

const LOGIN_CSS = `
*,::before,::after{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#e2e8f0;
     font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",Arial,sans-serif}
form{background:#1e293b;padding:2rem;border-radius:.9rem;width:min(92vw,360px);box-shadow:0 10px 30px rgba(0,0,0,.4)}
h1{margin:0 0 .3rem;font-size:1.15rem}
p{margin:0 0 1.2rem;color:#94a3b8;font-size:.85rem}
input{width:100%;font:inherit;padding:.65rem .8rem;border-radius:.5rem;border:1px solid #475569;background:#0b1220;color:#e2e8f0}
button{width:100%;margin-top:.9rem;font:inherit;font-weight:600;padding:.65rem;border:0;border-radius:.5rem;background:#0ea5e9;color:#fff;cursor:pointer}
.msg{margin-top:.8rem;font-size:.85rem;color:#f87171;min-height:1.2em}
`;

const head = (title, css) =>
  `<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n` +
  `<meta name="viewport" content="width=device-width, initial-scale=1.0">\n` +
  `<meta name="robots" content="noindex, nofollow, noarchive">\n<title>${title}</title>\n` +
  `<style>${css}</style>\n</head>\n`;

export function loginPage(nextPage, msg = '') {
  const html = head('编辑登录 · 小天天练跳绳', LOGIN_CSS) + `<body>
<form id="f" autocomplete="off">
  <h1>法律页编辑</h1>
  <p>输入口令后可直接修改线上页面。</p>
  <input id="p" type="password" name="passphrase" placeholder="口令" autofocus>
  <button type="submit">进入</button>
  <div class="msg" id="m">${msg}</div>
</form>
<script>
const f=document.getElementById('f'),m=document.getElementById('m');
f.addEventListener('submit',async e=>{e.preventDefault();m.textContent='';
  const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({passphrase:document.getElementById('p').value})});
  const j=await r.json().catch(()=>({}));
  if(r.ok&&j.ok){location.href=${JSON.stringify('/' + (nextPage === 'index' ? '' : nextPage + '/') + 'edit')};}
  else{m.textContent=j.error||('登录失败('+r.status+')');}
});
</script>
</body>\n</html>\n`;
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE } });
}

// JSON 嵌进 <script> 里,把 < 转义掉,免得正文里的 </script> 提前截断
const embed = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

export function editorPage(page, source) {
  const tabs = PAGE_NAMES.map((n) =>
    `<a class="tab${n === page ? ' on' : ''}" href="/${n === 'index' ? '' : n + '/'}edit">${
      { index: '目录页', privacy: '隐私政策', terms: '用户协议', support: '支持与帮助' }[n]}</a>`).join('\n  ');
  const live = '/' + (page === 'index' ? '' : page);

  const html = head('编辑 · 小天天练跳绳法律页', CHROME) + `<body>
<div class="bar">
  ${tabs}
  <span class="grow"></span>
  <select id="hist" title="历史版本"><option value="">历史版本…</option></select>
  <button id="save" class="primary">保存并发布</button>
  <a class="tab" id="live" href="${live}" target="_blank" rel="noopener">查看线上</a>
  <button id="out">退出</button>
  <span class="status" id="st"></span>
</div>
<div class="wrap">
  <div class="pane"><h4>正文源码(HTML 直通 / 也可写 Markdown)</h4><textarea id="src" spellcheck="false"></textarea></div>
  <div class="pane"><h4>发布后的样子(实时)</h4><iframe id="pv" sandbox=""></iframe></div>
</div>
<script type="module">
import { renderPage } from '/edit-render.js';
const SHELL=${embed(SHELL)}, CSS=${embed(CSS_MIN)}, META=${embed(PAGES[page])};
const PAGE=${JSON.stringify(page)};
const src=document.getElementById('src'), pv=document.getElementById('pv'),
      st=document.getElementById('st'), save=document.getElementById('save'),
      hist=document.getElementById('hist'), out=document.getElementById('out');
src.value=${embed(source)};
let saved=src.value;
function draw(){ try{ pv.srcdoc=renderPage(SHELL,CSS,META,src.value); }catch(e){ st.textContent='预览出错:'+e.message; } }
function say(t,cls){ st.textContent=t; st.className='status'+(cls?' '+cls:''); }
let timer; src.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(draw,180);
  say(src.value===saved?'':'有未保存的修改');});
draw();

async function doSave(){
  save.disabled=true; say('保存中…');
  try{
    const r=await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({page:PAGE,body:src.value})});
    const j=await r.json().catch(()=>({}));
    if(r.status===401){ say('登录已过期,请重新登录','err'); setTimeout(()=>location.reload(),1200); return; }
    if(r.ok&&j.ok){ saved=src.value; say('已发布 · '+new Date(j.ts).toLocaleTimeString('zh-CN'),'ok'); loadHist(); }
    else say(j.error||('保存失败('+r.status+')'),'err');
  }catch(e){ say('保存失败:'+e.message,'err'); }
  finally{ save.disabled=false; }
}
save.addEventListener('click',doSave);
document.addEventListener('keydown',e=>{ if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();doSave();} });
window.addEventListener('beforeunload',e=>{ if(src.value!==saved){e.preventDefault();e.returnValue='';} });

async function loadHist(){
  try{
    const r=await fetch('/api/history?page='+PAGE); const j=await r.json();
    if(!j.ok) return;
    hist.innerHTML='<option value="">历史版本…</option>'+j.versions.map(t=>
      '<option value="'+t+'">'+new Date(t).toLocaleString('zh-CN')+'</option>').join('');
  }catch(e){}
}
hist.addEventListener('change',async()=>{
  const ts=hist.value; if(!ts) return;
  const r=await fetch('/api/history?page='+PAGE+'&ts='+ts); const j=await r.json();
  if(j.ok){ src.value=j.body; draw(); say('已载入该版本 —— 还没发布,确认无误再点「保存并发布」'); }
  else say('取历史版本失败','err');
  hist.value='';
});
loadHist();
out.addEventListener('click',async()=>{ await fetch('/api/logout',{method:'POST'}); saved=src.value; location.href='/edit'; });
</script>
</body>\n</html>\n`;
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE } });
}
