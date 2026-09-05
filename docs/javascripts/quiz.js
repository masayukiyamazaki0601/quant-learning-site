/* ==========================================================================
   Quant Learning — 選択式クイズ（正解音・不正解音つき）
   HTML 側の書き方（例）:
   <div class="qwrap">
     <p class="qq">Q1：問題文</p>
     <ul class="qopts">
       <li><button type="button" class="qopt" data-correct="0" data-letter="A"><span class="qletter">A</span>選択肢の文</button></li>
       <li><button type="button" class="qopt" data-correct="1" data-letter="B">...</button></li>
     </ul>
     <p class="quiz-feedback" aria-live="polite"></p>
     <details class="kansetsu"><summary>答えの理由（クリックで表示）</summary>
       <div class="ex-body">解説テキスト</div>
     </details>
   </div>
   - data-correct="1" の選択肢が正解
   ========================================================================== */
(function () {
  "use strict";

  var KEY = "qlQuizSound";
  var sound = localStorage.getItem(KEY) !== "off";
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null;

  function ensureCtx() {
    if (!AC) { return null; }
    if (!ctx) {
      try { ctx = new AC(); } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === "suspended" && ctx.resume) { ctx.resume(); }
    return ctx;
  }

  function tone(freq, delay, dur, type, vol) {
    var c = ensureCtx();
    if (!c || !sound) { return; }
    try {
      var t0 = c.currentTime + (delay || 0);
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = type || "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.2));
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + (dur || 0.2) + 0.05);
    } catch (e) { /* 音が出せない環境では黙ってスキップ */ }
  }

  // 正解：上がっていく明るい音（2音）
  function playCorrect() {
    tone(659.25, 0, 0.12, "sine", 0.16);
    tone(987.77, 0.1, 0.22, "sine", 0.16);
  }
  // 不正解：低いブザー音（2音）
  function playWrong() {
    tone(196, 0, 0.18, "sawtooth", 0.09);
    tone(146.83, 0.16, 0.3, "sawtooth", 0.09);
  }

  function correctLetter(buttons) {
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute("data-correct") === "1") {
        return buttons[i].getAttribute("data-letter") || "";
      }
    }
    return "";
  }

  var wraps = document.querySelectorAll(".qwrap");
  for (var w = 0; w < wraps.length; w++) {
    (function (wrap) {
      var fb = wrap.querySelector(".quiz-feedback");
      var buttons = wrap.querySelectorAll("button.qopt");
      for (var b = 0; b < buttons.length; b++) {
        (function (btn) {
          btn.addEventListener("click", function () {
            if (btn.disabled) { return; }
            ensureCtx(); // 初回クリックで音を出せるようにする（ブラウザ制約対策）
            var ok = btn.getAttribute("data-correct") === "1";

            // 全選択肢をロック
            for (var j = 0; j < buttons.length; j++) {
              buttons[j].disabled = true;
              buttons[j].setAttribute("aria-disabled", "true");
            }
            if (ok) {
              btn.classList.add("correct");
              if (fb) {
                fb.classList.add("ok");
                fb.textContent = "✅ 正解！その調子です。";
              }
              playCorrect();
            } else {
              btn.classList.add("wrong");
              for (var k = 0; k < buttons.length; k++) {
                if (buttons[k].getAttribute("data-correct") === "1") {
                  buttons[k].classList.add("reveal-correct");
                }
              }
              if (fb) {
                fb.classList.add("ng");
                fb.textContent = "❌ 不正解… 正解は " + (correctLetter(buttons) || "別の選択肢") + " です。";
              }
              playWrong();
            }
          });
        })(buttons[b]);
      }
    })(wraps[w]);
  }

  // サウンドON/OFFトグル
  var toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "quiz-sound-toggle";
  toggle.setAttribute("aria-label", "クイズの効果音を切り替える");
  toggle.textContent = sound ? "🔊 効果音ON" : "🔇 効果音OFF";
  toggle.addEventListener("click", function () {
    sound = !sound;
    localStorage.setItem(KEY, sound ? "on" : "off");
    toggle.textContent = sound ? "🔊 効果音ON" : "🔇 効果音OFF";
  });
  document.body.appendChild(toggle);
})();
