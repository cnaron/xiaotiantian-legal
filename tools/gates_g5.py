# -*- coding: utf-8 -*-
"""X122 颗粒 5 文案闸 —— G5-NOSITE / G5-PRICE / G5-TECH。

用法:python3 tools/gates_g5.py <目录>      (目录里要有 index/privacy/terms/support.html)
阴性对照:拿改动前的 docs 跑,三条都必须红。
2026.09.08 Naron
"""
import io, os, re, sys

PAGES = ['index.html', 'privacy.html', 'terms.html', 'support.html']

# G5-PRICE 允许出现的价格数字(App 现价,SubscriptionPlan.swift)
ALLOWED_PRICES = {'28', '48', '128', '98', '78'}
# 绝对禁词:旧订阅制的价格与商品名
HARD_BAN = ['¥6', '¥58', '月订阅', '年订阅', 'proration', '按剩余天数比例']
# 条件禁词:只允许出现在否定语境,或 <h3> 疑问句标题里
COND_BAN = ['自动续费', '免费试用', '自动扣款', '试用期']
NEG_WORDS = ['不', '没有', '无', '未']
TECH_BAN = ['静态页面', '托管', 'GitHub', 'Cloudflare', '编辑入口', '构建', 'Pages', 'wrangler']


def gate_nosite(texts):
    hits = [(f, len(re.findall(r'gugushizi', s, re.I))) for f, s in texts]
    n = sum(c for _, c in hits)
    return n == 0, '命中 %d 处 %s' % (n, [h for h in hits if h[1]])


def gate_tech(texts):
    hits = []
    for f, s in texts:
        for kw in TECH_BAN:
            for m in re.finditer(re.escape(kw), s):
                hits.append((f, kw))
    return not hits, '命中 %d 处 %s' % (len(hits), hits[:6])


def gate_price(texts):
    bad = []
    for f, s in texts:
        for kw in HARD_BAN:
            if kw in s:
                bad.append((f, 'HARD:' + kw))
        # 价格数字白名单
        for m in re.finditer(r'¥\s*(\d+)', s):
            if m.group(1) not in ALLOWED_PRICES:
                bad.append((f, 'PRICE:¥' + m.group(1)))
        # 条件禁词必须落在否定语境 / 疑问标题里
        for kw in COND_BAN:
            for m in re.finditer(re.escape(kw), s):
                pre = s[max(0, m.start() - 14):m.start()]
                if any(w in pre for w in NEG_WORDS):
                    continue
                # 例外:FAQ 的 <h3> 疑问句标题(「…自动续费吗？」),紧接着的正文即否定
                line_start = s.rfind('\n', 0, m.start()) + 1
                line_end = s.find('\n', m.end())
                line = s[line_start:line_end if line_end > 0 else len(s)]
                if '<h3>' in line and ('吗？' in line or '吗?' in line):
                    continue
                bad.append((f, 'COND:' + kw + ' | …' + s[max(0, m.start()-24):m.end()+6].replace('\n', ' ')))
    return not bad, '命中 %d 处 %s' % (len(bad), bad[:6])


def main(root):
    texts = []
    for p in PAGES:
        fp = os.path.join(root, p)
        texts.append((p, io.open(fp, encoding='utf-8').read()))
    rc = 0
    for name, fn in [('G5-NOSITE', gate_nosite), ('G5-PRICE', gate_price), ('G5-TECH', gate_tech)]:
        ok, msg = fn(texts)
        print('%s  %-10s  %s' % ('绿 PASS' if ok else '红 FAIL', name, msg))
        if not ok:
            rc = 1
    return rc


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else 'docs'))
