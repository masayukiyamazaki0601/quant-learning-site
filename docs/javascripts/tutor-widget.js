/* ==========================================================================
   Quant Learning — AI家庭教師ウィジェット
   ・全ページ右下に「🎓 家庭教師に聞く」ボタンを表示
   ・Unit ページ（/units/pN/pN-NN/）なら Unit を自動認識し、本文をコンテキストに
     ソクラテス式の質問を開始
   ・バックエンド: tutor サーバー（uvicorn tutor.app:app --port 8001）が
     ローカルで動いている必要がある（APIキーはサーバー側のみで管理）
   ========================================================================== */
(function () {
  "use strict";
  if (window.__tutorWidgetLoaded) { return; }
  window.__tutorWidgetLoaded = true;

  var API = location.protocol + "//127.0.0.1:8001";
  var unitFile = "";
  var history = [];
  var busy = false;
  var started = false;

  // URL から Unit を自動認識（例: /units/p1/p1-03/ → p1/p1-03.md）
  var m = location.pathname.match(/\/units\/p([1-4])\/p\1-(\d{2})(?:[\/.]|$)/);
  if (m) {
    unitFile = "p" + m[1] + "/p" + m[1] + "-" + m[2] + ".md";
  }

  function $(id) { return document.getElementById(id); }
  function make(html) {
    var d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstChild;
  }
  function addMsg(role, text) {
    var b = $("tw-body");
    var el = document.createElement("div");
    el.className = "tw-msg " + role;
    if (role === "ai") {
      var lbl = document.createElement("b");
      lbl.textContent = "🎓 ";
      el.appendChild(lbl);
    }
    el.appendChild(document.createTextNode(text));
    b.appendChild(el);
    b.scrollTop = b.scrollHeight;
    return el;
  }
  function addMeta(text) {
    var b = $("tw-body");
    var el = document.createElement("div");
    el.className = "tw-meta";
    el.textContent = text;
    b.appendChild(el);
    b.scrollTop = b.scrollHeight;
  }
  function addNote(text) {
    var b = $("tw-body");
    var el = document.createElement("div");
    el.className = "tw-note";
    el.textContent = text;
    b.appendChild(el);
    b.scrollTop = b.scrollHeight;
  }
  function setBusy(v) {
    busy = v;
    $("tw-send").disabled = v;
  }

  // ---------- UI構築 ----------
  var root = make(
    '<div id="tw-root">' +
      '<button id="tw-fab" type="button">🎓 家庭教師に聞く</button>' +
      '<div id="tw-panel" hidden>' +
        '<div class="tw-head">' +
          '<span>🎓 AI家庭教師 <small id="tw-unit-label">' +
            (unitFile ? unitFile.replace(".md", "") : "汎用モード（Unit外のページ）") +
          "</small></span>" +
          '<button id="tw-close" type="button" aria-label="閉じる">✕</button>' +
        "</div>" +
        '<div class="tw-body" id="tw-body"></div>' +
        '<div class="tw-quick">' +
          '<button type="button" data-q="ヒント">💡 ヒント</button>' +
          '<button type="button" data-q="もっとやさしく、身近な例で説明して">🌱 やさしく</button>' +
          '<button type="button" data-q="ここまで分かったことを自分の言葉でまとめたい">📝 まとめる</button>' +
          '<button type="button" data-q="もう一度、最初の質問からやり直したい">🔄 最初から</button>' +
        "</div>" +
        '<div class="tw-input">' +
          '<input id="tw-input" type="text" placeholder="答えを入力…（Enterで送信）" autocomplete="off">' +
          '<button id="tw-send" type="button">送信</button>' +
        "</div>" +
      "</div>" +
    "</div>"
  );
  document.body.appendChild(root);

  var panel = $("tw-panel");
    // ---------- API通信 ----------
  function apiStatus(cb) {
    fetch(API + "/api/status")
      .then(function (r) { return r.json(); })
      .then(cb)
      .catch(function () { cb(null); });
  }
  function post() {
    setBusy(true);
    var startedAt = Date.now();
    var think = addMsg("ai", "…");
    think.classList.add("tw-think");
    think.textContent = "🧠 思考中… 0秒";
    var sec = 0;
    var timer = setInterval(function () {
      sec++;
      think.textContent = "🧠 思考中… " + sec + "秒";
    }, 1000);

    function cleanupTimer() { clearInterval(timer); }
    function taken() { return Math.max(1, Math.round((Date.now() - startedAt) / 1000)); }

    fetch(API + "/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unit_file: unitFile, history: history })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) { throw new Error(data.error || ("HTTP " + res.status)); }
          return data;
        });
      })
      .then(function (data) {
        cleanupTimer();
        if (think.parentNode) { think.parentNode.removeChild(think); }
        addMeta("⏱ " + taken() + " 秒間思考しました");
        addMsg("ai", data.reply);
        history.push({ role: "assistant", content: data.reply });
      })
      .catch(function (err) {
        cleanupTimer();
        if (think.parentNode) { think.parentNode.removeChild(think); }
        addNote("エラー: " + err.message);
      })
      .then(function () { setBusy(false); });
  }
  function sendUser(text) {
    if (busy) { return; }
    if (!history.length) {
      // 開始: ソクラテス式の最初の質問を1つ引き出す
      history.push({
        role: "user",
        content: "このUnitを学び終えました。私の理解を確かめるために、ソクラテス式に質問を始めてください。まず最初の質問を1つだけください。"
      });
      addMsg("user", "▶ このUnitの理解度チェックを開始");
      started = true;
      post();
      return;
    }
    if (!text.trim()) { return; }
    addMsg("user", text);
    history.push({ role: "user", content: text });
    post();
  }

  // ---------- イベント ----------
  $("tw-fab").addEventListener("click", function () {
    var isOpen = !panel.hidden;
    panel.hidden = isOpen;
    if (!panel.hidden && !started) {
      apiStatus(function (s) {
        if (s && s.key_set) {
          sendUser("");
        } else {
          addNote(
            "⚠️ 家庭教師サーバーが起動していないか、APIキーが未設定です。\n" +
            "使うにはローカルで起動してください：\n" +
            "  .venv/bin/uvicorn tutor.app:app --port 8001\n" +
            "（詳細は README の「AI 家庭教師」を参照）"
          );
        }
      });
    }
  });
  $("tw-close").addEventListener("click", function () { panel.hidden = true; });

  $("tw-send").addEventListener("click", function () {
    var v = $("tw-input").value;
    $("tw-input").value = "";
    sendUser(v);
  });
  $("tw-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var v = this.value;
      this.value = "";
      sendUser(v);
    }
  });
  document.querySelectorAll("#tw-panel .tw-quick button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      sendUser(btn.getAttribute("data-q"));
    });
  });
})();
