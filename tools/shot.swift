// 离屏 WKWebView 整页截图。用法:shot <url-or-file> <out.png> [width] [waitSeconds]
// 参照页要联网取 cdn.tailwindcss.com,故必须真取网络;本站页面零外链,取本地 file:// 即可。
import Cocoa
import WebKit

let args = CommandLine.arguments
guard args.count >= 3 else { fputs("usage: shot <url> <out.png> [width] [wait]\n", stderr); exit(2) }
let width = args.count > 3 ? Double(args[3]) ?? 900 : 900
let wait  = args.count > 4 ? Double(args[4]) ?? 3.0 : 3.0
let outPath = args[2]

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

let cfg = WKWebViewConfiguration()
let web = WKWebView(frame: NSRect(x: 0, y: 0, width: width, height: 1000), configuration: cfg)
let win = NSWindow(contentRect: NSRect(x: 0, y: 0, width: width, height: 1000),
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
    web.load(URLRequest(url: URL(string: raw)!))
} else {
    let u = URL(fileURLWithPath: raw)
    web.loadFileURL(u, allowingReadAccessTo: u.deletingLastPathComponent())
}

let deadline = Date().addingTimeInterval(60)
while !nav.done && Date() < deadline {
    RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05))
}
// 等 Tailwind CDN 注入样式 / 字体回退稳定
let settle = Date().addingTimeInterval(wait)
while Date() < settle { RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05)) }

// 量整页高度后放大窗口再截,拿到完整长图
var fullHeight = 1000.0
let sem = DispatchSemaphore(value: 0)
web.evaluateJavaScript("document.documentElement.scrollHeight") { r, _ in
    if let h = r as? Double { fullHeight = h } else if let h = r as? Int { fullHeight = Double(h) }
    sem.signal()
}
while sem.wait(timeout: .now()) == .timedOut {
    RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05))
}
web.frame = NSRect(x: 0, y: 0, width: width, height: fullHeight)
win.setContentSize(NSSize(width: width, height: fullHeight))
let settle2 = Date().addingTimeInterval(1.0)
while Date() < settle2 { RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05)) }

let cfgS = WKSnapshotConfiguration()
cfgS.rect = NSRect(x: 0, y: 0, width: width, height: fullHeight)
var failed = false
let sem2 = DispatchSemaphore(value: 0)
web.takeSnapshot(with: cfgS) { image, err in
    defer { sem2.signal() }
    guard let image = image, let tiff = image.tiffRepresentation,
          let rep = NSBitmapImageRep(data: tiff),
          let png = rep.representation(using: .png, properties: [:]) else {
        fputs("snapshot failed: \(String(describing: err))\n", stderr); failed = true; return
    }
    try? png.write(to: URL(fileURLWithPath: outPath))
}
while sem2.wait(timeout: .now()) == .timedOut {
    RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05))
}
if failed { exit(1) }
print("wrote \(outPath)  \(Int(width))x\(Int(fullHeight))")
exit(0)
