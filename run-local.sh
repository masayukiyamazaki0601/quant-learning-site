#!/usr/bin/env bash
# ==========================================================================
# Quant Learning ローカル起動スクリプト
#   ① AI家庭教師サーバー（uvicorn / 8001）をバックグラウンドで起動
#   ② mkdocs serve（8000）をフォアグラウンドで起動
# 使い方:  ./run-local.sh
# 停止:    mkdocs は Ctrl+C / 家庭教師は pkill -f 'tutor.app:app'
# ==========================================================================
set -e
cd "$(dirname "$0")"

if [ ! -x ".venv/bin/uvicorn" ]; then
  echo "エラー: .venv が見つかりません。先に次を実行してください:"
  echo "  python3 -m venv .venv && .venv/bin/pip install -r requirements.txt -r tutor/requirements.txt"
  exit 1
fi

if [ ! -f "tutor/.env" ]; then
  echo "⚠️ 注意: tutor/.env がありません。DeepSeek APIキーを設定しないと家庭教師は使えません。"
  echo "    cp tutor/.env.example tutor/.env  # 中にキーを記入"
fi

echo "▶ ① AI家庭教師サーバー (port 8001)"
if lsof -nP -iTCP:8001 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "   すでに起動中です（そのまま使います）"
else
  nohup .venv/bin/uvicorn tutor.app:app --port 8001 > /tmp/quant-tutor.log 2>&1 &
  echo "   起動しました（ログ: /tmp/quant-tutor.log）"
fi
sleep 1

echo "▶ ② サイト本体 (mkdocs serve / port 8000)"
echo ""
echo "=============================================================="
echo " ✔ ブラウザで開く URL:"
echo "     http://127.0.0.1:8000/units/p1/p1-03/"
echo ""
echo "   （右下「🎓 家庭教師に聞く」で対話できます）"
echo "=============================================================="
echo ""

exec .venv/bin/mkdocs serve -a 127.0.0.1:8000
