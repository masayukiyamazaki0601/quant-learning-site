/* ==========================================================================
   Quant Learning Site — 共通ナビゲーション
   1) index.html   : #toc-root に4フェーズ×13ユニットの目次を描画
   2) 統計値の埋め込み（#stat-*）
   3) ユニットページ : 上部ユニット切替タブ + 下部「前へ/次へ」
   4) 図のクリック拡大（.figure svg）
   すべて js/data.js の QUANT データを唯一の情報源とする
   ========================================================================== */
(function () {
  "use strict";

  var D = window.QUANT;
  if (!D) { return; }

  function isPublic(u) { return u && (u.status === "done" || u.status === "wip"); }
  function chip(u, currentFile) {
    var cls = "unit-chip";
    var inner;
    if (u.file === currentFile) { cls += " active"; }
    if (isPublic(u)) {
      inner = '<a href="' + u.file + '" class="' + cls + '">Unit ' + D.pad(u.n) + " " + u.title + "</a>";
    } else {
      cls += " plan";
      inner = '<span class="' + cls + '">Unit ' + D.pad(u.n) + " " + u.title + "（予定）</span>";
    }
    return inner;
  }
  function row(u, currentFile) {
    var isCur = u.file === currentFile;
    var title;
    if (isPublic(u)) {
      title = '<a href="' + u.file + '">' + u.title + "</a>";
    } else {
      title = u.title;
    }
    return '<div class="urow">' +
           '<div class="u-no' + (isPublic(u) ? "" : " plan-u") + '">' + D.pad(u.n) + "</div>" +
           "<div>" +
           '<div class="u-t">' + title + '<span class="u-tag ' + u.status + '">' + D.statusLabel(u.status) + "</span></div>" +
           '<div class="u-topics">' + u.topics + "</div>" +
           "</div></div>";
  }

  /* ---------- 1) index: 目次描画 ---------- */
  var root = document.getElementById("toc-root");
  if (root) {
    var html = "";
    for (var pi = 0; pi < D.phases.length; pi++) {
      var ph = D.phases[pi];
      var us = D.byPhase(ph.id);
      html += '<div class="toc-chapter">';
      html += '<div class="toc-chapter-head">';
      html += '<span class="phase-badge">' + ph.badge + "</span>";
      html += "<h3>" + ph.title + '<span class="meta">' + ph.weeks + " / " + ph.en + "</span></h3>";
      html += '<span class="toc-overview"><a href="' + ph.file + '">フェーズ概要を開く →</a></span>';
      html += "</div>";
      for (var ui = 0; ui < us.length; ui++) { html += row(us[ui]); }
      html += "</div>";
    }
    root.innerHTML = html;
  }

  /* ---------- 2) stats ---------- */
  function setText(id, txt) {
    var el = document.getElementById(id);
    if (el) { el.textContent = txt; }
  }
  setText("stat-phases", D.phases.length);
  setText("stat-units", D.units.length);
  setText("stat-hours", "15–20");
  setText("stat-total", "780–1040");

  /* ---------- 3) unit pages: tabs & pager ---------- */
  var currentFile = document.body.getAttribute("data-file");
  var current = D.find(currentFile);
  var tabs = document.getElementById("lesson-tabs");
  var pager = document.getElementById("pager");

  if (currentFile && current) {
    var list = D.byPhase(current.p);

    if (tabs) {
      var t = "";
      for (var ti = 0; ti < list.length; ti++) { t += chip(list[ti], currentFile); }
      tabs.innerHTML = t;
    }

    if (pager) {
      var all = D.units;
      var idxAll = -1;
      for (var ai = 0; ai < all.length; ai++) { if (all[ai].file === currentFile) { idxAll = ai; break; } }
      var prev = null, next = null;
      if (idxAll >= 0) {
        for (var b = idxAll - 1; b >= 0; b--) {
          if (isPublic(all[b])) { prev = all[b]; break; }
        }
        for (var f = idxAll + 1; f < all.length; f++) {
          if (isPublic(all[f])) { next = all[f]; break; }
        }
      }
      var out = "";
      if (prev) {
        out += '<a class="btn btn-secondary" href="' + prev.file + '">&larr; 前へ：' + prev.title + "</a>";
      } else {
        out += '<a class="btn btn-secondary" href="index.html">&larr; カリキュラムへ</a>';
      }
      if (next) {
        out += '<a class="btn btn-primary pager-next" href="' + next.file + '">次へ：' + next.title + " →</a>";
      }
      pager.innerHTML = out;
    }
  }

  /* ---------- 4) figure zoom ---------- */
  function zoomClose() {
    var z = document.getElementById("fig-zoom");
    if (z && z.parentNode) { z.parentNode.removeChild(z); }
    document.removeEventListener("keydown", zoomEsc);
  }
  function zoomEsc(e) { if (e.key === "Escape") { zoomClose(); } }

  var zoomSvgs = document.querySelectorAll(".figure svg");
  for (var zi = 0; zi < zoomSvgs.length; zi++) {
    (function (svg) {
      svg.style.cursor = "zoom-in";
      svg.addEventListener("click", function (e) {
        e.preventDefault();
        if (document.getElementById("fig-zoom")) { return; }
        var fig = svg.closest ? svg.closest(".figure") : null;
        var wrap = document.createElement("div");
        wrap.id = "fig-zoom";
        wrap.className = "fig-zoom";
        var img = svg.cloneNode(true);
        img.removeAttribute("tabindex");
        wrap.appendChild(img);
        if (fig) {
          var cap = fig.querySelector(".figure-caption");
          if (cap) {
            var c = document.createElement("p");
            c.className = "fig-zoom-cap";
            c.textContent = cap.textContent;
            wrap.appendChild(c);
          }
        }
        var close = document.createElement("button");
        close.type = "button";
        close.className = "fig-zoom-close";
        close.setAttribute("aria-label", "拡大表示を閉じる");
        close.textContent = "×";
        wrap.appendChild(close);
        document.body.appendChild(wrap);
        close.addEventListener("click", function (ev) { ev.stopPropagation(); zoomClose(); });
        wrap.addEventListener("click", function (ev) { if (ev.target === wrap) { zoomClose(); } });
        document.addEventListener("keydown", zoomEsc);
      });
    })(zoomSvgs[zi]);
  }
})();
