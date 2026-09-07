// 读一个页面里若干元素的最终计算样式(而不是猜 CSS 层叠结果)。
// 用法:computed <url> <wait> ; 输出 JSON 到 stdout
import Cocoa
import WebKit

let args = CommandLine.arguments
guard args.count >= 2 else { fputs("usage: computed <url> [wait]\n", stderr); exit(2) }
let wait = args.count > 2 ? Double(args[2]) ?? 5.0 : 5.0
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let web = WKWebView(frame: NSRect(x: 0, y: 0, width: 900, height: 1000))
let win = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 900, height: 1000),
                   styleMask: [.borderless], backing: .buffered, defer: false)
win.contentView = web; win.orderBack(nil)

class Nav: NSObject, WKNavigationDelegate {
    var done = false
    func webView(_ w: WKWebView, didFinish n: WKNavigation!) { done = true }
    func webView(_ w: WKWebView, didFail n: WKNavigation!, withError e: Error) { done = true }
    func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) { done = true }
}
let nav = Nav(); web.navigationDelegate = nav
let raw = args[1]
if raw.hasPrefix("http") { web.load(URLRequest(url: URL(string: raw)!)) }
else { let u = URL(fileURLWithPath: raw); web.loadFileURL(u, allowingReadAccessTo: u.deletingLastPathComponent()) }
let dl = Date().addingTimeInterval(60)
while !nav.done && Date() < dl { RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05)) }
let s = Date().addingTimeInterval(wait)
while Date() < s { RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05)) }

let js = """
(function(){
  const props=['font-size','font-weight','font-family','line-height','color','background-color',
    'margin-top','margin-bottom','margin-left','padding-top','padding-bottom','padding-left',
    'border-bottom-width','border-bottom-color','border-left-width','border-left-color',
    'list-style-type','text-align','max-width','border-radius','text-decoration-line'];
  const sels=['body','.policy-container','h1','.meta-info','h2','h3','main p','main ul','main li',
    '.highlight-box','.contact-info','a','code','footer'];
  const out={};
  for(const s of sels){
    const el=document.querySelector(s);
    if(!el){out[s]=null;continue;}
    const cs=getComputedStyle(el); const o={};
    for(const p of props){o[p]=cs.getPropertyValue(p);}
    out[s]=o;
  }
  out['__sheets']=[...document.styleSheets].map(x=>x.href||('inline:'+(x.ownerNode&&x.ownerNode.tagName)));
  out['__scripts']=[...document.scripts].map(x=>x.src||'inline');
  return JSON.stringify(out);
})()
"""
var result = "null"
let sem = DispatchSemaphore(value: 0)
web.evaluateJavaScript(js) { r, e in
    if let s = r as? String { result = s } else { fputs("js error: \(String(describing: e))\n", stderr) }
    sem.signal()
}
while sem.wait(timeout: .now()) == .timedOut { RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05)) }
print(result)
exit(0)
