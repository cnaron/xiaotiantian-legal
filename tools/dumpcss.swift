// 抓「浏览器里实际生效的样式表」。X122 颗粒 4 用途:原版页靠 cdn.tailwindcss.com 在浏览器里
// 现编译 CSS;要把它换成内联 CSS 又不改长相,唯一可靠的办法是把**它自己生成的那份**抓下来,
// 而不是我手写一份近似的。用法:dumpcss <url> <out.css> [waitSeconds]
// 输出 = 页面里所有 <style> 元素的 textContent,按 `/*== style[i] ==*/` 分隔。
// 2026.09.08 Naron
import Cocoa
import WebKit

let args = CommandLine.arguments
guard args.count >= 3 else { fputs("usage: dumpcss <url> <out.css> [wait]\n", stderr); exit(2) }
let wait = args.count > 3 ? Double(args[3]) ?? 5.0 : 5.0

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let web = WKWebView(frame: NSRect(x: 0, y: 0, width: 900, height: 800),
                    configuration: WKWebViewConfiguration())
let win = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 900, height: 800),
                   styleMask: [.borderless], backing: .buffered, defer: false)
win.contentView = web
win.orderBack(nil)

class Nav: NSObject, WKNavigationDelegate {
    var done = false
    func webView(_ w: WKWebView, didFinish n: WKNavigation!) { done = true }
    func webView(_ w: WKWebView, didFail n: WKNavigation!, withError e: Error) { done = true }
    func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) {
        fputs("load failed: \(e)\n", stderr); done = true
    }
}
let nav = Nav()
web.navigationDelegate = nav

let raw = args[1]
if raw.hasPrefix("http") { web.load(URLRequest(url: URL(string: raw)!)) }
else { let u = URL(fileURLWithPath: raw); web.loadFileURL(u, allowingReadAccessTo: u.deletingLastPathComponent()) }

let deadline = Date().addingTimeInterval(60)
while !nav.done && Date() < deadline { RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05)) }
let settle = Date().addingTimeInterval(wait)
while Date() < settle { RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05)) }

let js = """
(function(){
  var out = [];
  var els = document.querySelectorAll('style');
  for (var i = 0; i < els.length; i++) {
    out.push('/*== style[' + i + '] id=' + (els[i].id||'') + ' len=' + els[i].textContent.length + ' ==*/');
    out.push(els[i].textContent);
  }
  return out.join('\\n');
})()
"""
var result = ""
let sem = DispatchSemaphore(value: 0)
web.evaluateJavaScript(js) { r, e in
    if let s = r as? String { result = s }
    else { fputs("eval failed: \(String(describing: e))\n", stderr) }
    sem.signal()
}
while sem.wait(timeout: .now()) == .timedOut { RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05)) }
try! result.write(toFile: args[2], atomically: true, encoding: .utf8)
fputs("wrote \(result.utf8.count) bytes -> \(args[2])\n", stderr)
exit(0)
