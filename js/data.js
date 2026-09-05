/* ==========================================================================
   Quant Learning Site — カリキュラム・データ（目次の一元管理）
   - 1ユニット = 1週間。4フェーズ × 13ユニット = 52ページ
   - 各要素: "タイトル|このユニットで扱うトピック"
   - 状態: plan=予定 / wip=制作中 / done=公開中（第3要素で指定、省略時は plan）
   ユニットのファイル名は自動生成: p{phase}-{nn}.html
   ========================================================================== */
window.QUANT = (function () {
  "use strict";

  var PHASES = [
    { id: 1, badge: "PHASE 01", weeks: "第1〜13週", en: "Foundations",
      title: "数学・統計・Python・市場の土台", file: "phase-1.html" },
    { id: 2, badge: "PHASE 02", weeks: "第14〜26週", en: "Stochastic Calculus & Derivatives",
      title: "確率解析とデリバティブ価格理論", file: "phase-2.html" },
    { id: 3, badge: "PHASE 03", weeks: "第27〜39週", en: "Risk, Time Series, ML & C++",
      title: "時系列・リスク管理・機械学習・C++", file: "phase-3.html" },
    { id: 4, badge: "PHASE 04", weeks: "第40〜52週", en: "Capstone & Career",
      title: "統合Capstoneとキャリア準備", file: "phase-4.html" }
  ];

  var P1 = [
    "学習の設計と開発環境|クオンツとは・1年52週の計画・Python/Git環境構築",
    "1変数微積分と市場の全体像|微分・積分・Taylor展開 ・ 株式/債券/FX/先物/オプション市場",
    "多変数微積分と時間の価値|偏微分・多重積分 ・ 割引率・現在価値・利回り",
    "線形代数(1)と債券計算|行列・連立方程式・固有値 ・ デュレーション ・ NumPy",
    "線形代数(2)とリターンの統計|対角化・SVD ・ 単利/複利/ログリターン ・ Pandas",
    "条件付き確率・ベイズとデータ取得|条件付き確率・ベイズ ・ yfinance ・ 可視化",
    "分布・期待値とポートフォリオ|主要な分布・期待値・分散・共分散・相関",
    "大数の法則・中心極限定理と分散効果|CLT・大数の法則 ・ ポートフォリオのリスク",
    "推定と先物・先渡|点推定・区間推定 ・ 先物・先渡の仕組み",
    "仮説検定とオプションの基本|t検定 ・ オプションの定義・ペイオフ ・ プット・コール・パリティ",
    "線形回帰と実データ分析|最小二乗法・回帰診断 ・ 相関・βの計算",
    "統計の実践・分析レポート課題|データ分析レポート作成 ・ 検定の実践",
    "フェーズ1の総復習と確認|修了チェック ・ 穴埋め演習"
  ];

  var P2 = [
    "二項モデルと無裁定の考え方|複製ポートフォリオ ・ リスク中立測度（Shreve I）",
    "多期間二項モデルとマルチンゲール|CRRモデル ・ マルチンゲール ・ Black-Scholesへの収束",
    "アメリカン・オプションと早期行使|二項ツリーの実装 ・ 早期行使の価値",
    "ブラウン運動とマルチンゲール|確率過程の言葉づかい ・ 株価の確率モデル予備",
    "伊藤のレンマと幾何ブラウン運動|確率積分の直観 ・ 株価の連続時間モデル",
    "測度変換とリスク中立評価|ギルサノフの定理 ・ マルチンゲール表現",
    "Black-Scholesと偏微分方程式|BS式の導出 ・ 熱方程式 ・ Feynman–Kac",
    "Greeksとインプライド・ボラティリティ|デルタ/ガンマ/ベガ ・ ニュートン法 ・ スマイル",
    "モンテカルロ法による価格付け|乱数生成 ・ 収束と誤差評価",
    "分散低減法|対称変量 ・ 制御変量 ・ 比較実験",
    "有限差分法|陰解法 ・ Crank–Nicolson の概念",
    "パス依存型オプション|アジアン・バリア ・ 数値スキーム",
    "フェーズ2の総復習・エンジン検証|BS価格エンジン完成 ・ 4手法の相互検証"
  ];

  var P3 = [
    "時系列の基礎（定常性と自己相関）|ACF ・ ランダムウォーク ・ データの見方",
    "ARIMAモデル|推定 ・ 診断 ・ 予測",
    "GARCHとボラティリティ予測|ボラティリティ・クラスタリング ・ 予測の検証",
    "VaRと期待ショートフォール|3手法の比較 ・ リスク量のバックテスト",
    "共和分とペアトレード|統計的裁定 ・ 実装と検証",
    "ポートフォリオ最適化|平均分散 ・ cvxpy ・ 制約付き最適化",
    "因子モデルとPCA|スタイル因子 ・ リスク分解",
    "バックテストの正しい設計|リーク ・ サバイバーシップ ・ 多重比較 ・ 取引コスト",
    "機械学習の基礎と評価|過学習 ・ 交差検証 ・ walk-forward検証",
    "決定木と勾配ブースティング|LightGBM ・ 特徴量エンジニアリング",
    "C++入門|メモリとポインタ ・ クラス ・ ユニットテスト",
    "C++で価格エンジンを作る|STL ・ 設計パターン ・ 性能比較",
    "フェーズ3の総復習|修了チェック ・ 総合検証"
  ];

  var P4 = [
    "戦略のポートフォリオ化|戦略間相関 ・ リスクパリティ ・ ドローダウン管理",
    "マーケットマイクロストラクチャー|オーダーブック ・ 執行コスト ・ 最適執行",
    "論文再現プロジェクト|モメンタム（Jegadeesh & Titman）の再現",
    "機械学習戦略の本実装|最終的なwalk-forward ・ コスト込み評価",
    "Capstoneの設計|要件定義 ・ データ基盤 ・ アーキテクチャ",
    "Capstone: データ層|ETL自動化 ・ SQL ・ 前処理パイプライン",
    "Capstone: リサーチ層|複数戦略の実装 ・ パラメータ探索",
    "Capstone: 検証・リスク層|バックテスト ・ リスクレポート",
    "Capstone: 表示・API|ダッシュボード ・ 自動更新",
    "面接対策(1) 数学・確率|確率クイズ ・ ブレインストーム質問",
    "面接対策(2) コーディングと金融|コーディング問題 ・ 金融センス質問",
    "アウトプット整備|ブログ ・ GitHub ・ 自己紹介",
    "最終プレゼンと次年度計画|1年の振り返り ・ 次の学習計画"
  ];

  function pad(n) { return (n < 10) ? "0" + n : "" + n; }

  var UNITS = [];
  function register(list, pid) {
    for (var i = 0; i < list.length; i++) {
      var parts = list[i].split("|");
      UNITS.push({
        p: pid,
        n: i + 1,
        file: "p" + pid + "-" + pad(i + 1) + ".html",
        title: parts[0],
        topics: parts[1] || "",
        status: parts[2] || "plan"
      });
    }
  }
  register(P1, 1); register(P2, 2); register(P3, 3); register(P4, 4);

  function byPhase(pid) {
    var out = [];
    for (var i = 0; i < UNITS.length; i++) { if (UNITS[i].p === pid) { out.push(UNITS[i]); } }
    return out;
  }
  function find(file) {
    for (var i = 0; i < UNITS.length; i++) { if (UNITS[i].file === file) { return UNITS[i]; } }
    return null;
  }
  function statusLabel(s) {
    if (s === "done") { return "公開中"; }
    if (s === "wip") { return "制作中"; }
    return "予定";
  }

  return { phases: PHASES, units: UNITS, byPhase: byPhase, find: find,
           statusLabel: statusLabel, pad: pad };
})();
