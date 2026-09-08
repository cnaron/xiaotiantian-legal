#!/usr/bin/env bash
# X123 颗粒 5 §2「先量再做」:量一个观测点到 Cloudflare 边缘的**上传**耗时。
#   用法:  RC_KEY 写在 $KEYFILE(默认 /tmp/x123g5_key,一行)
#          bash netprobe_bench_claudecode_20260908.sh <观测点名字>
#   输出:  每行一次采样,制表符分隔:
#          点  方向  字节  http  namelookup  connect  appconnect  starttransfer  total  speed  colo
#   注意:  -H 'Expect:' 关掉 100-continue(否则 1 MB 会先等一个 RTT,量出来的是协议不是链路)。
#          随机体不可压缩 ⇒ 量的是真字节。 2026.09.08 Naron
set -u
BASE="${BASE:-https://xiaotiantian-app.pages.dev/api/feedback/netprobe}"
LABEL="${1:-unknown}"
N="${N:-10}"
KEYFILE="${KEYFILE:-/tmp/x123g5_key}"
K="$(head -n1 "$KEYFILE")"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FMT='%{http_code}\t%{time_namelookup}\t%{time_connect}\t%{time_appconnect}\t%{time_starttransfer}\t%{time_total}\t%{speed_upload}\n'

for SZ in 307200 1048576; do
  head -c "$SZ" /dev/urandom > "$TMP/body.bin"
  for i in $(seq 1 "$N"); do
    OUT=$(curl -sS -o "$TMP/resp.json" -X POST --data-binary "@$TMP/body.bin" \
      -H "X-RC-Key: $K" -H 'Content-Type: application/octet-stream' -H 'Expect:' \
      -H 'Accept-Encoding: identity' --max-time 120 -w "$FMT" "$BASE" 2>/dev/null)
    COLO=$(tr -d '\n' < "$TMP/resp.json" | sed -n 's/.*"colo":"\([A-Z]*\)".*/\1/p')
    printf '%s\tup\t%s\t%s\t%s\n' "$LABEL" "$SZ" "$OUT" "${COLO:-?}" | tr -d '\r'
  done
done

for i in $(seq 1 "$N"); do
  OUT=$(curl -sS -o /dev/null -D "$TMP/h.txt" \
    -H "X-RC-Key: $K" -H 'Accept-Encoding: identity' --max-time 120 \
    -w '%{http_code}\t%{time_namelookup}\t%{time_connect}\t%{time_appconnect}\t%{time_starttransfer}\t%{time_total}\t%{speed_download}\n' \
    "$BASE?bytes=204800" 2>/dev/null)
  COLO=$(sed -n 's/^[Xx]-[Rr][Cc]-[Cc]olo: *//p' "$TMP/h.txt" | tr -d '\r\n')
  printf '%s\tdown\t204800\t%s\t%s\n' "$LABEL" "$OUT" "${COLO:-?}" | tr -d '\r'
done
