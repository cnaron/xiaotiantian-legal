// 在 WKWebView 里跑一段 JS 并打印结果 —— 用来量「浏览器里实际发生了什么」(字体有没有加载、
// 元素高度、computedStyle),而不是靠看截图猜。X122 颗粒 6 定位「改一个词行间距全变」用。
// 用法:probe <url-or-file> <js-file> [waitSeconds]
// 2026.09.08 Naron
import Cocoa
import WebKit

let args = CommandLine.arguments
guard args.count >= 3 else { fputs("usage: probe <url> <js-file> [wait]\n", stderr); exit(2) }
let wait = args.count > 3 ? Double(args[3]) ?? 6.0 : 6.0
let js = (try? String(contentsOfFile: args[2], encoding: .utf8)) ?? ""

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
if raw.hasPrefix("http") {
    var req = URLRequest(url: URL(string: raw)!)
    req.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData     // 别拿本地 URLCache 的旧页糊弄我
    web.load(req)
} else { let u = URL(fileURLWithPath: raw); web.loadFileURL(u, allowingReadAccessTo: u.deletingLastPathComponent()) }

let deadline = Date().addingTimeInterval(60)
while !nav.done && Date() < deadline { RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05)) }
let settle = Date().addingTimeInterval(wait)
while Date() < settle { RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05)) }

var result = ""
let sem = DispatchSemaphore(value: 0)
web.evaluateJavaScript(js) { r, e in
    if let s = r as? String { result = s } else { result = "eval failed: \(String(describing: e)) / \(String(describing: r))" }
    sem.signal()
}
while sem.wait(timeout: .now()) == .timedOut { RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05)) }
print(result)
exit(0)
