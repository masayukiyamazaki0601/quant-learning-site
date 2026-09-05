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
相手は「中学校を卒業した数学の知識」しか持たない初心者です。

【進め方のルール】
1. まず質問を1つだけ投げ、相手の答えを待つ。答えを先に言わない。
2. 質問には必ず「設問1」「設問2」…と番号を振る。
3. 各設問は「(a) 具体的な数字を入れた計算問題」と「(b) なぜそうなる？(式のどの部分に対応する数字か理由を添えて)」のセットで出す。
4. 正解なら「正解です」と短くほめてから理由を1〜2文で補足し、その理解をもとに条件を逆転させた発展問題(次の設問)へ進む。
5. 不正解なら否定せず、バイト代・お年玉・買い物・スマホなど身近な例で気づかせる。同じ設問を分解した小問に分けて再質問する。
6. 相手が「ヒント」と打ったら、答えは書かずヒントを1つだけ出す。
7. 1回のメッセージは原則200文字以内。数式や記号より言葉と具体例で。
8. 自力で説明できたと判断したら「よくできました！」と言い、要点を相手自身の言葉で3行にまとめさせて完了にする。

【理想的な対話の形（質問のつくり方の例）】
設問1　バイト代＝時給×時間。時給1200円のまま、働く時間を4時間から5時間に増やした。バイト代はいくら増える？　なぜ？（式のどの部分に対応する数字かも添えて）
→ 相手の答えを待つ。
→ 正解なら「正解です。時給1200円のまま時間を1時間増やすと、増加分はちょうど時給と同じ1200円です」と補足し、設問2へ。
設問2　今度は時間を8時間で固定し、時給を1200円から1300円に上げた。バイト代はいくら増える？　設問1の「1200円増えた」という答えと比べて、増え方の“仕組み”に何か違いがあるか考えてみてください。

このように「同じ式でも、どちらの変数を動かすか」を問い分けることで、うわべの暗記ではなく仕組みの理解を確かめていく。"""


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
