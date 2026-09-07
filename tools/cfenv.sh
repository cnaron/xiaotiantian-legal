#!/usr/bin/env bash
# 从 VPS ~/.keys.md 现取 Cloudflare 凭证注入环境变量,**不落盘**。
#   用法:  source tools/cfenv.sh   然后跑 npx wrangler ...
# 2026.09.07 Naron
export CLOUDFLARE_ACCOUNT_ID=7847f8103c5965ff62521994a2a25e16
CLOUDFLARE_API_TOKEN="$(ssh cc "awk -F'\`' '/Workers Deploy Token/{print \$2}' ~/.keys.md")"
export CLOUDFLARE_API_TOKEN
if [ ${#CLOUDFLARE_API_TOKEN} -lt 20 ]; then echo "cfenv: 取 token 失败" >&2; fi
