/* Quant Learning — アニメーション図（Plotly）
   HTML 例:
   <div class="plotbox">
     <div id="chart-slope" class="plotly-chart"></div>
     <div class="plotctl">
       <button type="button" class="plot-play" data-target="chart-slope">▶ 再生</button>
       <span class="plot-status"></span>
     </div>
   </div>
   図の定義は末尾の CH（id名キー）に登録。Plotly は「▶再生」時に読み込む。 */
(function () {
  "use strict";

  var CDN = "https://cdn.plot.ly/plotly-2.32.0.min.js";
  var loading = false;
  var waiting = [];

  function loadPlotly(cb) {
    if (window.Plotly) { cb(); return; }
    waiting.push(cb);
    if (loading) { return; }
    loading = true;
    var s = document.createElement("script");
    s.src = CDN;
    s.onload = function () {
      loading = false;
      var q = waiting; waiting = [];
      for (var i = 0; i < q.length; i++) { q[i](); }
    };
    s.onerror = function () { loading = false; waiting = []; };
    document.head.appendChild(s);
  }

  var COL_INK = "#16263B";
  var COL_BRASS = "#A8793B";
  var COL_RED = "#B4432F";
  var COL_GREEN = "#1E6F50";

  function baseLayout(extra) {
    var L = {
      margin: { l: 46, r: 16, t: 44, b: 40 },
      paper_bgcolor: "#FFFFFF",
      plot_bgcolor: "#FFFFFF",
      font: { color: COL_INK, size: 13 },
      showlegend: false,
      annotations: []
    };
    for (var k in (extra || {})) { L[k] = extra[k]; }
    return L;
  }
  function annotation(text) {
    return [{
      xref: "paper", yref: "paper",
      x: 0.01, y: 1.14, xanchor: "left", yanchor: "top",
      showarrow: false, text: text, font: { size: 14, color: COL_INK }
    }];
  }

  /* ---------- ① 微分：h を小さくすると傾きが 6 に近づく ---------- */
  function slopeDef() {
    var xs = [], ys = [];
    for (var x = 1.5; x <= 4.5; x += 0.012) { xs.push(+x.toFixed(4)); ys.push(x * x); }
    var hs = [1.0, 0.6, 0.3, 0.15, 0.08, 0.04, 0.02, 0.01, 0.005, 0.001];
    function line(i) {
      var h = hs[i];
      return { x: [3, 3 + h], y: [9, (3 + h) * (3 + h)], mode: "lines", line: { color: COL_RED, width: 3 } };
    }
    function pt(i) {
      var h = hs[i];
      return { x: [3 + h], y: [(3 + h) * (3 + h)], mode: "markers", marker: { color: COL_RED, size: 9 } };
    }
    function status(i) {
      var h = hs[i];
      return "h=" + h.toFixed(3) + " → 傾き ≈ " + (((3 + h) * (3 + h) - 9) / h).toFixed(4);
    }
    return {
      init: function () {
        return {
          data: [
            { x: xs, y: ys, mode: "lines", line: { color: COL_INK, width: 3 } },
            line(0), pt(0)
          ],
          layout: baseLayout({
            xaxis: { range: [1.5, 4.6], title: "x" },
            yaxis: { range: [0, 22], title: "y = x²" },
            annotations: annotation(status(0))
          })
        };
      },
      count: hs.length,
      status: status,
      tick: function (i) {
        return {
          sets: [{ index: 1, data: line(i) }, { index: 2, data: pt(i) }],
          layout: { annotations: annotation(status(i)) }
        };
      }
    };
  }

  /* ---------- ② 積分：長方形を増やすと面積が 1/3 に近づく ---------- */
  function riemannDef() {
    var ns = [2, 4, 8, 16, 32, 64, 128, 512];
    var xs = [], ys = [];
    for (var t = 0; t <= 1.001; t += 0.005) { xs.push(t); ys.push(t * t); }
    function bars(i) {
      var n = ns[i], w = 1 / n, bx = [], by = [];
      for (var k = 0; k < n; k++) { bx.push((k + 0.5) * w); by.push((k * w) * (k * w)); }
      return { x: bx, y: by, type: "bar", width: w * 0.98, marker: { color: COL_BRASS, opacity: 0.55 } };
    }
    function area(i) {
      var n = ns[i], s = 0;
      for (var k = 0; k < n; k++) { var l = k / n; s += (l * l) * (1 / n); }
      return s;
    }
    function status(i) {
      return "長方形の数 n=" + ns[i] + " → 面積 ≈ " + area(i).toFixed(4) + "（本当の値 1/3 ≈ 0.3333）";
    }
    return {
      init: function () {
        return {
          data: [bars(0), { x: xs, y: ys, mode: "lines", line: { color: COL_INK, width: 3 } }],
          layout: baseLayout({
            xaxis: { range: [0, 1.1], title: "x" },
            yaxis: { range: [0, 1.1], title: "y = x²" },
            barmode: "overlay",
            annotations: annotation(status(0))
          })
        };
      },
      count: ns.length,
      status: status,
      tick: function (i) {
        return {
          sets: [{ index: 0, data: bars(i) }],
          layout: { annotations: annotation(status(i)) }
        };
      }
    };
  }

    /* ---------- ③ テイラー展開：年数が経つと近似がズレる ---------- */
  function taylorDef() {
    var ts = [], exact = [], approx = [];
    for (var t = 0; t <= 20.0001; t += 0.2) {
      ts.push(+t.toFixed(2));
      exact.push(Math.pow(1.05, t));
      approx.push(1 + 0.05 * t);
    }
    function status(t) {
      return "t=" + t + " 年 → 正確=" + Math.pow(1.05, t).toFixed(3) +
             " / 近似=" + (1 + 0.05 * t).toFixed(3) +
             " / ズレ=" + (Math.pow(1.05, t) - (1 + 0.05 * t)).toFixed(3);
    }
    return {
      init: function () {
        return {
          data: [
            { x: ts, y: exact, mode: "lines", name: "正確な値（1.05のt乗）", line: { color: COL_INK, width: 3 } },
            { x: ts, y: approx, mode: "lines", name: "近似（1 + 0.05×t）", line: { color: COL_RED, width: 3, dash: "dot" } },
            { x: [1], y: [1.05], mode: "markers", marker: { color: COL_INK, size: 10 } },
            { x: [1], y: [1.05], mode: "markers", marker: { color: COL_RED, size: 10 } }
          ],
          layout: baseLayout({
            xaxis: { range: [0, 21], title: "年数 t" },
            yaxis: { range: [0.9, 3.1], title: "お金の倍率" },
            annotations: annotation(status(1))
          })
        };
      },
      count: 20,
      status: status,
      tick: function (i) {
        var t = i + 1;
        return {
          sets: [
            { index: 2, data: { x: [t], y: [Math.pow(1.05, t)] } },
            { index: 3, data: { x: [t], y: [1 + 0.05 * t] } }
          ],
          layout: { annotations: annotation(status(t)) }
        };
      }
    };
  }

  /* ---------- ④ バイト代ヒートマップ（多変数：時給×時間） ---------- */
  function wageDef() {
    var wages = [];
    for (var w = 900; w <= 1600; w += 100) { wages.push(w); }
    var hours = [];
    for (var h = 1; h <= 12; h++) { hours.push(h); }
    var z = [];
    for (var i = 0; i < hours.length; i++) {
      var row = [];
      for (var j = 0; j < wages.length; j++) { row.push(wages[j] * hours[i]); }
      z.push(row);
    }
    return {
      init: function () {
        return {
          data: [{
            z: z, x: wages, y: hours, type: "heatmap",
            colorscale: [[0, "#FBF3E2"], [0.35, "#EACB94"], [0.7, "#C58B3E"], [1, "#7A5420"]],
            colorbar: { title: { text: "バイト代(円)" } }
          }],
          layout: {
            margin: { l: 46, r: 20, t: 40, b: 46 },
            paper_bgcolor: "#FFFFFF", plot_bgcolor: "#FFFFFF",
            font: { color: COL_INK, size: 13 },
            xaxis: { title: "時給（円/時間）", dtick: 100 },
            yaxis: { title: "働いた時間（時間）", dtick: 1 }
          }
        };
      }
    };
  }

  /* ---------- ⑤ 現在価値：遠いお金ほど価値が下がる ---------- */
  function pvDef() {
    var rates = [0.01, 0.03, 0.05, 0.10];
    var names = ["1%", "3%", "5%", "10%"];
    var colors = [COL_INK, COL_BRASS, COL_GREEN, COL_RED];
    var lines = [];
    for (var r = 0; r < rates.length; r++) {
      var xs = [], ys = [];
      for (var t = 1; t <= 20; t++) { xs.push(t); ys.push(100 / Math.pow(1 + rates[r], t)); }
      lines.push({ x: xs, y: ys, mode: "lines", name: "金利 " + names[r], line: { color: colors[r], width: 2.5 } });
    }
    function status(t) {
      return "「" + t + "年後にもらう100万円」のいまの価値 ≈ " +
             (100 / Math.pow(1.05, t)).toFixed(1) + " 万円（金利5%の線上）";
    }
    return {
      init: function () {
        return {
          data: lines.concat([
            { x: [1], y: [100 / 1.05], mode: "markers", marker: { color: COL_GREEN, size: 11 } }
          ]),
          layout: {
            margin: { l: 52, r: 16, t: 44, b: 46 },
            paper_bgcolor: "#FFFFFF", plot_bgcolor: "#FFFFFF",
            font: { color: COL_INK, size: 13 },
            xaxis: { range: [0, 21], title: "受け取るまでの年数 t" },
            yaxis: { range: [0, 105], title: "いまの価値（万円）" },
            legend: { orientation: "h", y: 1.14, x: 0 }
          }
        };
      },
      count: 20,
      status: status,
      tick: function (i) {
        var t = i + 1;
        return {
          sets: [{ index: 4, data: { x: [t], y: [100 / Math.pow(1.05, t)] } }]
        };
      }
    };
  }

  /* ---------- 図の登録（id 名で呼び出し） ---------- */
  var CH = {
    "chart-slope": slopeDef(),
    "chart-riemann": riemannDef(),
    "chart-taylor": taylorDef(),
    "chart-wage": wageDef(),
    "chart-pv": pvDef()
  };

  /* ---------- ▶再生 コントローラー ---------- */
  var buttons = document.querySelectorAll(".plot-play");
  for (var b = 0; b < buttons.length; b++) {
    (function (btn) {
      var targetId = btn.getAttribute("data-target");
      var def = CH[targetId];
      if (!def) { return; }
      var box = btn.closest ? btn.closest(".plotbox") : null;
      var statusEl = box ? box.querySelector(".plot-status") : null;
      var timer = null;
      var running = false;
      var idx = 0;

      function paint(i) {
        idx = i;
        var upd = def.tick(i);
        var el = document.getElementById(targetId);
        for (var s = 0; s < upd.sets.length; s++) {
          Plotly.restyle(el, upd.sets[s].data, upd.sets[s].index);
        }
        Plotly.relayout(el, upd.layout);
        if (statusEl) { statusEl.textContent = def.status(i); }
      }
      function stop() {
        if (timer) { clearInterval(timer); timer = null; }
        running = false;
        btn.textContent = "▶ 再生";
      }
      function step() {
        if (idx + 1 >= def.count) { stop(); btn.textContent = "↺ もう一度"; return; }
        paint(idx + 1);
      }
      btn.addEventListener("click", function () {
        loadPlotly(function () {
          var el = document.getElementById(targetId);
          if (!el) { return; }
          if (running) { stop(); return; }
          if (!btn.getAttribute("data-rendered")) {
            var base = def.init();
            Plotly.newPlot(el, base.data, base.layout, { responsive: true, displayModeBar: false });
            btn.setAttribute("data-rendered", "1");
            if (statusEl) { statusEl.textContent = def.status(0); }
          }
          running = true;
          idx = 0;
          btn.textContent = "⏸ 一時停止";
          timer = setInterval(step, 850);
        });
      });
    })(buttons[b]);
  }

  // 自動表示（plotbox に data-auto 属性がある図は、▶なしで最初から描画）
  var autos = document.querySelectorAll(".plotbox[data-auto]");
  for (var a = 0; a < autos.length; a++) {
    (function (box) {
      var el = box.querySelector(".plotly-chart");
      if (!el) { return; }
      var def = CH[el.id];
      if (!def || !def.init) { return; }
      loadPlotly(function () {
        var base = def.init();
        Plotly.newPlot(el, base.data, base.layout, { responsive: true, displayModeBar: false });
        var st = box.querySelector(".plot-status");
        if (st && def.status) { st.textContent = def.status(0); }
      });
    })(autos[a]);
  }
})();

