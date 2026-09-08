#!/bin/bash
# G7-STALE 尺子:6 条过时串,四页正文逐条计数
DIR="$1"
total=0
for s in '经由我们的服务器' '转成一封电子邮件' '唯一一处网络请求' '不写入数据库' '开发者邮箱' 'gugushizi'; do
  n=0
  for p in index privacy terms support; do
    c=$(grep -o -F "$s" "$DIR/$p.html" 2>/dev/null | wc -l | tr -d ' ')
    n=$((n+c))
  done
  printf '%-24s %s\n' "$s" "$n"
  total=$((total+n))
done
echo "TOTAL=$total"
