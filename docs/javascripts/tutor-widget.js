/* ==========================================================================
   Quant Learning — AI家庭教師ウィジェット（ブラウザ完結版）
   - DeepSeek API にブラウザから直接アクセスする（CORS許可済みを確認）
   - ローカルサーバー不要。github.io の公開ページでそのまま使える
   - APIキーは初回に1度だけ入力し、ブラウザの localStorage に保存
     （キーを GitHub やサーバーに送ることはない）
   - 開いている Unit ページの本文を自動で読み込み、ソクラテス式の質問をする
   ========================================================================== */
(function () {
  "use strict";
  if (window.__tutorWidgetLoaded) { return; }
  window.__tutorWidgetLoaded = true;

  var DS_URL = "https://api.deepseek.com/chat/completions";
  var DS_MODEL = "deepseek-chat";
  var KEY_LS = "quant_ds_key";

  var unitFile = "";
  var unitTitle = "";
  var history = [];
  var busy = false;
  var started = false;
  var pageContext = null;

  // URL から Unit を自動認識（例: /units/p1/p1-03/ → p1/p1-03.md）
  var m = location.pathname.match(/\/units\/p([1-4])\/p\1-(\d{2})(?:[\/.]|$)/);
  if (m) {
    unitFile = "p" + m[1] + "/p" + m[1] + "-" + m[2] + ".md";
    unitTitle = document.title.replace(/\s*[-|]\s*Quant Learning.*$/, "").trim();
  }

  function $(id) { return document.getElementById(id); }
  function getKey() { return localStorage.getItem(KEY_LS) || ""; }
  function setKey(v) {
    if (v) { localStorage.setItem(KEY_LS, v.trim()); } else { localStorage.removeItem(KEY_LS); }
  }
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
  function clearBody() {
    $("tw-body").innerHTML = "";
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
            (unitTitle || "汎用モード（Unit外のページ）") +
          "</small></span>" +
          '<button id="tw-close" type="button" aria-label="閉じる">✕</button>' +
        "</div>" +
        '<div class="tw-keybar" id="tw-keybar" hidden>' +
          '<div class="tw-keyrow">' +
            '<input id="tw-key-input" type="password" placeholder="DeepSeek APIキーを貼り付け（初回のみ）">' +
            '<button id="tw-key-save" type="button">保存</button>' +
          "</div>" +
          '<div class="tw-keynote">キーはこのブラウザにだけ保存されます（GitHub やサーバーには送信しません）。取得: platform.deepseek.com → API Keys</div>' +
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
  var keybar = $("tw-keybar");

  // ---------- スマホ表示の最適化（ほぼ全画面シート＋キーボード対策） ----------
  function isSmallScreen() { return window.innerWidth <= 560; }
  function keyboardGap() {
    try {
      if (window.visualViewport && window.visualViewport.height < window.innerHeight) {
        return window.innerHeight - Math.round(window.visualViewport.height);
      }
    } catch (e) { /* ignore */ }
    return 0;
  }
  function refreshMobilePanel() {
    if (!panel.classList.contains("tw-mobile")) { return; }
    panel.style.bottom = (10 + keyboardGap()) + "px";
  }
  function setMobileMode(on) {
    if (on) {
      panel.classList.add("tw-mobile");
      // スマホではドラッグ位置を無視してCSSレイアウトに任せる
      panel.style.left = "";
      panel.style.top = "";
      panel.style.right = "";
      panel.style.bottom = "";
      refreshMobilePanel();
    } else {
      panel.classList.remove("tw-mobile");
      panel.style.bottom = "";
    }
  }
  if (window.visualViewport && window.visualViewport.addEventListener) {
    window.visualViewport.addEventListener("resize", refreshMobilePanel);
  }
  window.addEventListener("resize", function () {
    if (!panel.hidden) { setMobileMode(isSmallScreen()); }
  });
  ["tw-input", "tw-key-input"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener("focus", refreshMobilePanel);
      el.addEventListener("blur", function () {
        setTimeout(refreshMobilePanel, 300);
      });
    }
  });

  // ---------- ドラッグで移動（位置は localStorage に記憶） ----------
  var FAB_POS = "quant_tw_fab_pos";
  var PANEL_POS = "quant_tw_panel_pos";
  function readPos(k) {
    try {
      var d = JSON.parse(localStorage.getItem(k));
      if (d && typeof d.left === "number" && typeof d.top === "number") { return d; }
    } catch (e) { /* ignore */ }
    return null;
  }
  function writePos(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ }
  }
  function clampPos(el, left, top) {
    var r = el.getBoundingClientRect();
    var w = r.width || 320;
    var h = r.height || 300;
    var maxL = Math.max(4, window.innerWidth - w - 4);
    var maxT = Math.max(4, window.innerHeight - h - 4);
    return { left: Math.min(Math.max(left, 4), maxL), top: Math.min(Math.max(top, 4), maxT) };
  }
  function applySavedPos(el, k) {
    var p = readPos(k);
    if (!p) { return; }
    var c = clampPos(el, p.left, p.top);
    el.style.left = c.left + "px";
    el.style.top = c.top + "px";
    el.style.right = "auto";
    el.style.bottom = "auto";
  }
  function makeDraggable(el, handle, key, allowClickThrough) {
    var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    handle = handle || el;
    handle.addEventListener("pointerdown", function (e) {
      if (e.button !== undefined && e.button !== 0) { return; }
      if (allowClickThrough && e.target.closest && e.target.closest("#tw-close")) { return; }
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      var r = el.getBoundingClientRect();
      ox = r.left; oy = r.top;
      el.style.right = "auto";
      el.style.bottom = "auto";
      el.style.left = ox + "px";
      el.style.top = oy + "px";
      document.body.style.userSelect = "none";
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      e.preventDefault();
    });
    el.addEventListener("pointermove", function (e) {
      if (!dragging) { return; }
      var c = clampPos(el, ox + (e.clientX - sx), oy + (e.clientY - sy));
      el.style.left = c.left + "px";
      el.style.top = c.top + "px";
    });
    function endDrag(e) {
      if (!dragging) { return; }
      dragging = false;
      document.body.style.userSelect = "";
      try { el.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      var moved = Math.abs(e.clientX - sx) > 4 || Math.abs(e.clientY - sy) > 4;
      if (moved) {
        var r = el.getBoundingClientRect();
        writePos(key, { left: r.left, top: r.top });
        el.__dragged = true; // ドラッグ直後の click を無効化するフラグ
        setTimeout(function () { el.__dragged = false; }, 80);
      }
    }
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
  }

  applySavedPos(panel, PANEL_POS);
  applySavedPos($("tw-fab"), FAB_POS);
  makeDraggable(panel, panel.querySelector(".tw-head"), PANEL_POS, true);
  makeDraggable($("tw-fab"), null, FAB_POS, false);

  // ダブルクリックで初期位置（右下）に戻す
  function resetPos(el, k) {
    localStorage.removeItem(k);
    el.style.left = "";
    el.style.top = "";
    el.style.right = "";
    el.style.bottom = "";
  }
  $("tw-fab").addEventListener("dblclick", function () {
    resetPos($("tw-fab"), FAB_POS);
  });
  panel.querySelector(".tw-head").addEventListener("dblclick", function () {
    resetPos(panel, PANEL_POS);
  });

  // ---------- 会話履歴の保存（閉じても・ページを離れても続きから再開） ----------
  function chatKey() { return "quant_tw_chat_" + (unitFile || "general"); }
  function saveChat() {
    try { localStorage.setItem(chatKey(), JSON.stringify(history)); } catch (e) { /* ignore */ }
  }
  function clearSavedChat() {
    try { localStorage.removeItem(chatKey()); } catch (e) { /* ignore */ }
  }
  function loadSavedChat() {
    try {
      var arr = JSON.parse(localStorage.getItem(chatKey()));
      if (Array.isArray(arr) && arr.length) {
        return arr.filter(function (m) {
          return (m.role === "user" || m.role === "assistant") &&
                 typeof m.content === "string";
        });
      }
    } catch (e) { /* ignore */ }
    return null;
  }
  function renderHistory() {
    clearBody();
    for (var i = 0; i < history.length; i++) {
      addMsg(history[i].role, history[i].content);
    }
    var b = $("tw-body");
    b.scrollTop = b.scrollHeight;
  }
    var SYSTEM =
    "あなたは個人学習サイト「Quant Learning」のソクラテス式家庭教師です。\n" +
    "相手は「中学校を卒業した数学の知識」しか持たない初心者です。\n" +
    "【ルール】\n" +
    "1. 答えを先に言わない。まず質問を1つだけ投げ、相手の答えを待つ。\n" +
    "2. 質問には必ず「設問1」「設問2」…と番号を振る。\n" +
    "3. 各設問は「(a) 具体的な数字を使った計算問題」と「(b) なぜそうなる？(式のどの部分に対応するか理由を添えて)」のセットで出す。\n" +
    "4. 正解なら「正解です」とほめて理由を1〜2文補足し、条件を逆転させた発展問題へ進む。\n" +
    "5. 不正解なら否定せず、バイト代・お年玉・買い物・スマホなど身近な例で気づかせる。\n" +
    "6. 相手が「ヒント」と打ったら、答えは書かずヒントを1つだけ出す。\n" +
    "7. 1回のメッセージは原則200文字以内。数式や記号より言葉と具体例で。\n" +
    "8. 自力で説明できたと判断したら「よくできました！」と言い、要点を相手自身の言葉で3行にまとめさせて完了にする。\n" +
    "理想例: 設問1「バイト代＝時給×時間。時給1200円のまま4→5時間。いくら増える？なぜ？」→ 正解なら設問2「今度は8時間固定で時給1200→1300円。いくら増える？設問1の答えと比べて増え方の仕組みの違いは？」";

  // ---------- 現在の記事本文を読み込んで文脈にする ----------
  function loadPageContext() {
    if (pageContext !== null || !unitFile) {
      return Promise.resolve(pageContext || "");
    }
    pageContext = ""; // 2重ロード防止
    return fetch(location.href)
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var art = doc.querySelector(".md-content__inner") || doc.querySelector("article");
        pageContext = art ? art.innerText.slice(0, 6000) : "";
        return pageContext;
      })
      .catch(function () { pageContext = ""; return ""; });
  }

  function buildMessages() {
    var sys = SYSTEM;
    if (unitTitle) {
      sys += "\n\n【いま学んでいるUnit】" + unitTitle + "（" + unitFile + "）";
    }
    if (pageContext) {
      sys += "\n\n【このUnitの本文（必要なら参照してよい）】\n" + pageContext.slice(0, 4000);
    }
    var messages = [{ role: "system", content: sys }];
    var h = history.slice(-30);
    for (var i = 0; i < h.length; i++) { messages.push(h[i]); }
    if (messages[messages.length - 1].role !== "user") {
      messages.push({
        role: "user",
        content: "このUnitを学び終えました。私の理解を確かめるために、ソクラテス式に質問を始めてください。まず最初の質問を1つだけください。"
      });
    }
    return messages;
  }

  // ---------- DeepSeek へ直接リクエスト ----------
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

    function cleanup() { clearInterval(timer); }
    function taken() { return Math.max(1, Math.round((Date.now() - startedAt) / 1000)); }

    fetch(DS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getKey()
      },
      body: JSON.stringify({
        model: DS_MODEL,
        messages: buildMessages(),
        temperature: 0.7,
        max_tokens: 700,
        stream: false
      })
    })
      .then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          try { data = JSON.parse(text); } catch (e) { data = null; }
          if (!res.ok) {
            var msg = (data && data.error && data.error.message) ||
                      text.trim() || ("HTTP " + res.status);
            var err = new Error(msg);
            err.status = res.status;
            throw err;
          }
          if (!data) { throw new Error("応答を解釈できませんでした"); }
          return data;
        });
      })
      .then(function (data) {
        cleanup();
        if (think.parentNode) { think.parentNode.removeChild(think); }
        addMeta("⏱ " + taken() + " 秒間思考しました");
        var reply = data.choices[0].message.content.trim();
        addMsg("ai", reply);
        history.push({ role: "assistant", content: reply });
        saveChat();
      })
      .catch(function (err) {
        cleanup();
        if (think.parentNode) { think.parentNode.removeChild(think); }
        if (err.status === 401 || err.status === 403) {
          setKey("");
          keybar.hidden = false;
          addNote(
            "🔑 APIキーが無効または未設定のようです（" + String(err.message).slice(0, 100) + "）。\n" +
            "上の欄にキー（sk- ではじまる文字列）を貼って「保存」してください。"
          );
        } else {
          addNote("エラー: " + (err.message || err));
        }
      })
      .then(function () { setBusy(false); });
  }

  // ---------- 会話 ----------
  function showKeyHint() {
    keybar.hidden = false;
    var body = $("tw-body");
    var kids = body.children;
    var txt = "🔑 APIキーを上の欄に貼って「保存」してください（sk- で始まる文字列）";
    if (kids.length &&
        kids[kids.length - 1].className === "tw-note" &&
        kids[kids.length - 1].textContent.indexOf("APIキー") >= 0) {
      return;
    }
    addNote(txt);
  }
  function requireKey() {
    if (getKey()) { return true; }
    showKeyHint();
    return false;
  }
  function startChat() {
    if (!requireKey()) { return; }
    clearSavedChat();
    history = [];
    started = true;
    addMsg("user", "▶ このUnitの理解度チェックを開始");
    history.push({
      role: "user",
      content: "このUnitを学び終えました。私の理解を確かめるために、ソクラテス式に質問を始めてください。まず最初の質問を1つだけください。"
    });
    saveChat();
    loadPageContext().then(function () { post(); });
  }
  function sendUser(text) {
    if (busy) { return; }
    if (!requireKey()) { return; }
    if (!history.length) { startChat(); return; }
    if (!text.trim()) { return; }
    addMsg("user", text);
    history.push({ role: "user", content: text });
    saveChat();
    post();
  }

  // ---------- イベント ----------
  $("tw-fab").addEventListener("click", function () {
    if ($("tw-fab").__dragged) { return; } // ドラッグ直後は開閉しない
    if (!panel.hidden) { panel.hidden = true; return; }
    panel.hidden = false;
    setMobileMode(isSmallScreen());
    if (history.length) { return; } // 会話継続中はそのまま表示
    // 保存済みの会話があれば続きから再開（ページを離れても大丈夫）
    var saved = loadSavedChat();
    if (saved && saved.length) {
      history = saved;
      started = true;
      renderHistory();
      addMeta("📎 前回の続きから再開しました");
      if (!getKey()) { showKeyHint(); }
      return;
    }
    clearBody();
    if (!getKey()) {
      showKeyHint();
      return;
    }
    startChat();
  });
  $("tw-close").addEventListener("click", function () { panel.hidden = true; });

  $("tw-key-save").addEventListener("click", function () {
    var v = $("tw-key-input").value;
    if (!v.trim()) { return; }
    setKey(v);
    $("tw-key-input").value = "";
    keybar.hidden = true;
    if (history.length) {
      // 途中の会話がある場合は、そのまま続きから
      clearBody();
      renderHistory();
      addMeta("✅ キーを保存しました。続きをどうぞ");
    } else {
      clearBody();
      startChat();
    }
  });

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
      var q = btn.getAttribute("data-q");
      if (q.indexOf("最初の質問からやり直し") >= 0) {
        history = [];
        clearBody();
        startChat();
      } else {
        sendUser(q);
      }
    });
  });
})();
