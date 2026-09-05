"""ソクラテス式 AI 家庭教師（DeepSeek API プロキシ・ローカル専用）

起動例（quant-learning-site 直下で）:
    .venv/bin/pip install -r tutor/requirements.txt
    cp tutor/.env.example tutor/.env   # DEEPSEEK_API_KEY を書く
    .venv/bin/uvicorn tutor.app:app --port 8001
    → http://127.0.0.1:8001/

ポイント:
- APIキーはサーバー側（.env）だけで使い、ブラウザには渡さない
- 選んだユニットの本文（docs/units/...）を読み込み、ソクラテス式の家庭教師として対話する
"""
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

BASE = Path(__file__).resolve().parent
UNITS_ROOT = (BASE.parent / "docs" / "units").resolve()
API_URL = "https://api.deepseek.com/chat/completions"

load_dotenv(BASE / ".env")

MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

app = FastAPI(title="Quant Socratic Tutor")

SYSTEM_PROMPT = """あなたは個人学習サイト「Quant Learning」のソクラテス式家庭教師です。
相手は「中学校を卒業した数学の知識」しか持たない初心者だと思ってください。

【絶対ルール】
1. 答えを先に言わない。まず質問を1つだけ投げかけ、相手の答えを待つ。
2. 1回のメッセージは原則200文字以内。短く、やさしい言葉で。
3. 相手が間違えても否定せず、身近な例（バイト代・お年玉・買い物・スマホなど）で「気づかせる」。
4. 正解でも「なぜそうなる？」と1段階深く問い、うわべの暗記でないことを確かめる。
5. 相手が「ヒント」と打ったら、答えは書かずヒントだけ1つ。
6. 相手が自力で説明できたと判断できたら「よくできました！」と、そのUnitの要点を相手自身の言葉で3行にまとめさせて完了にする。
7. 会話は常に日本語。数式や記号よりも、言葉と具体例で。

【教え方の流れ（基本）】
導入の質問 → 相手の答えを待つ → 間違いなら例で気づかせる / 正解なら深掘り → 自力で説明できたら完了。"""


class ChatReq(BaseModel):
    unit_file: str = ""  # 例: "p1/p1-02.md"
    history: list[dict] = []  # [{role:"user"/"assistant", content:"..."}]


def load_context(unit_file: str) -> str:
    if not unit_file:
        return ""
    safe = (UNITS_ROOT / unit_file).resolve()
    if safe.suffix != ".md" or not str(safe).startswith(str(UNITS_ROOT)):
        return ""
    if not safe.exists():
        return ""
    return safe.read_text(encoding="utf-8")[:6000]


@app.get("/")
def home():
    return FileResponse(BASE / "static" / "index.html")


@app.get("/api/status")
def status():
    return {"ok": True, "key_set": bool(os.getenv("DEEPSEEK_API_KEY"))}


@app.post("/api/tutor")
async def tutor(req: ChatReq):
    key = os.getenv("DEEPSEEK_API_KEY")
    if not key:
        return JSONResponse(
            {"error": "DEEPSEEK_API_KEY が設定されていません。tutor/.env にAPIキーを書いてサーバーを再起動してください（tutor/.env.example をコピー）。"},
            status_code=503,
        )

    ctx = load_context(req.unit_file)
    system = SYSTEM_PROMPT
    if ctx:
        system += "\n\n【いま学んでいるユニットの本文（必要なら参照してよい）】\n" + ctx

    messages = [{"role": "system", "content": system}]
    for m in req.history[-30:]:
        role = m.get("role")
        content = str(m.get("content", ""))[:4000]
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    if not messages or messages[-1]["role"] != "user":
        messages.append({"role": "user", "content": "このUnitについて、ソクラテス式で質問を始めてください。"})

    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 700,
        "stream": False,
    }
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            r = await client.post(API_URL, headers=headers, json=payload)
        if r.status_code != 200:
            return JSONResponse({"error": f"DeepSeek API エラー ({r.status_code}): {r.text[:300]}"}, status_code=502)
        data = r.json()
        reply = data["choices"][0]["message"]["content"].strip()
        return {"reply": reply}
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"error": f"通信エラー: {exc}"}, status_code=502)
