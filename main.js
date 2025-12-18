/**************************************************************
 * main.js
 * - レイアウト3追加（body.third-layout）
 * - 商品情報は商品情報枠（zoneState.info）を上から半分ずつで
 *   商品情報①/商品情報②に分割表示（レイアウト3のみ）
 **************************************************************/

const $ = (sel, root = document) => root.querySelector(sel);
const FX_RATE = 155;

const fmtJPY = (n) => "￥" + Number(n || 0).toLocaleString("ja-JP");
const num = (v) => {
  const x = Number(String(v ?? "").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};

const ALL_COLUMNS = [
  "商品名",
  "ブランド",
  "評価",
  "各種ASIN",
  "ASIN",
  "JAN",
  "SKU",
  "サイズ",
  "重量（容積重量）",
  "カテゴリ",
  "注意事項",
  "材質",
  // --- 主要指標（例） ---
  "販売価格（ドル）",
  "入金額（円）",
  "粗利益",
  "粗利益率",
  "30日販売数",
  "90日販売数",
  "180日販売数",
  "在庫数",
];

const DEFAULT_ZONE_STATE = {
  pool: [
    "粗利益",
    "粗利益率",
    "入金額（円）",
    "販売価格（ドル）",
    "30日販売数",
    "90日販売数",
    "180日販売数",
    "在庫数",
  ],
  info: [
    "商品名",
    "ブランド",
    "評価",
    "ASIN",
    "各種ASIN",
    "JAN",
    "SKU",
    "サイズ",
    "重量（容積重量）",
    "カテゴリ",
    "注意事項",
    "材質",
  ],
  center: [
    "粗利益",
    "粗利益率",
    "販売価格（ドル）",
    "入金額（円）",
    "30日販売数",
    "90日販売数",
    "180日販売数",
    "在庫数",
  ],
  table: [],
  hidden: [],
};

const STORAGE_KEY = "MES_AIA_ZONE_STATE_V1";

let zoneState = loadZoneState();

const zonePool = $("#zonePool");
const zoneInfo = $("#zoneInfo");
const zoneCenter = $("#zoneCenter");
const zoneTable = $("#zoneTable");
const zoneHidden = $("#zoneHidden");

const itemsContainer = $("#itemsContainer");
const emptyState = $("#emptyState");
const headerStatus = $("#headerStatus");

const asinCatalog = $("#asinCatalog");
const metricsBar = $("#metricsBar");
const btnToggleMetrics = $("#btnToggleMetrics");
const btnResetZones = $("#btnResetZones");

const sortCol = $("#sortCol");
const sortOrder = $("#sortOrder");
const btnApplySort = $("#btnApplySort");
const btnClearSort = $("#btnClearSort");

const cartSummary = $("#cartSummary");
const cartCount = $("#cartCount");
const cartTotalSales = $("#cartTotalSales");
const cartTotalCost = $("#cartTotalCost");
const cartTotalProfit = $("#cartTotalProfit");
const cartAvgMargin = $("#cartAvgMargin");

const cardState = new Map(); // asin -> { el, data, chart }
const cartState = []; // { asin, qty, sell, cost }

init();

function init() {
  renderTopZones();
  bindZoneDnD();
  renderAsinCatalog();
  bindTopControls();
  updateHeaderStatus();
  updateCartSummary();
}

function loadZoneState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_ZONE_STATE);
    const obj = JSON.parse(raw);
    return {
      pool: Array.isArray(obj.pool) ? obj.pool : structuredClone(DEFAULT_ZONE_STATE.pool),
      info: Array.isArray(obj.info) ? obj.info : structuredClone(DEFAULT_ZONE_STATE.info),
      center: Array.isArray(obj.center) ? obj.center : structuredClone(DEFAULT_ZONE_STATE.center),
      table: Array.isArray(obj.table) ? obj.table : [],
      hidden: Array.isArray(obj.hidden) ? obj.hidden : [],
    };
  } catch {
    return structuredClone(DEFAULT_ZONE_STATE);
  }
}

function saveZoneState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(zoneState));
}

/* =========================
   ASINカタログ
========================= */
function renderAsinCatalog() {
  if (!asinCatalog || typeof ASIN_DATA !== "object") return;

  asinCatalog.innerHTML = "";
  const keys = Object.keys(ASIN_DATA || {});
  keys.forEach((asin) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "asin-pill";
    btn.textContent = asin;
    btn.addEventListener("click", () => addCardByAsin(asin));
    asinCatalog.appendChild(btn);
  });
}

function addCardByAsin(asin) {
  const data = ASIN_DATA?.[asin];
  if (!data) return alert("データがありません: " + asin);

  if (cardState.has(asin)) {
    cardState.get(asin).el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const card = createProductCard(asin, data);
  itemsContainer.appendChild(card);

  emptyState.style.display = "none";
  cardState.set(asin, { el: card, data, chart: card.__chart || null });

  updateHeaderStatus();
}

function updateHeaderStatus() {
  const count = cardState.size;
  if (headerStatus) headerStatus.textContent = count ? `表示中: ${count} ASIN` : "";
}

/* =========================
   上部5枠：レンダリング
========================= */
function renderTopZones() {
  zonePool.innerHTML = "";
  zoneInfo.innerHTML = "";
  zoneCenter.innerHTML = "";
  zoneTable.innerHTML = "";
  zoneHidden.innerHTML = "";

  zoneState.pool.forEach((t) => zonePool.appendChild(makeMetricPill(t)));
  zoneState.info.forEach((t) => zoneInfo.appendChild(makeMetricPill(t)));
  zoneState.center.forEach((t) => zoneCenter.appendChild(makeMetricPill(t)));
  zoneState.table.forEach((t) => zoneTable.appendChild(makeMetricPill(t)));
  zoneState.hidden.forEach((t) => zoneHidden.appendChild(makeMetricPill(t)));

  // ソート候補
  if (sortCol) {
    sortCol.innerHTML = `<option value="">（なし）</option>` + ALL_COLUMNS.map((c) => `<option value="${c}">${c}</option>`).join("");
  }
}

function makeMetricPill(label) {
  const el = document.createElement("div");
  el.className = "metric-pill";
  el.textContent = label;
  el.draggable = true;
  el.dataset.key = label;
  return el;
}

/* =========================
   DnD（上部5枠）
========================= */
function bindZoneDnD() {
  const zones = [
    { el: zonePool, key: "pool" },
    { el: zoneInfo, key: "info" },
    { el: zoneCenter, key: "center" },
    { el: zoneTable, key: "table" },
    { el: zoneHidden, key: "hidden" },
  ];

  let dragKey = null;

  zones.forEach(({ el, key }) => {
    el.addEventListener("dragstart", (e) => {
      const target = e.target.closest(".metric-pill");
      if (!target) return;
      dragKey = target.dataset.key;
      e.dataTransfer.effectAllowed = "move";
    });

    el.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });

    el.addEventListener("drop", (e) => {
      e.preventDefault();
      const toZone = key;
      if (!dragKey) return;

      // どのゾーンにいたか探す
      const fromZone = Object.keys(zoneState).find((z) => zoneState[z].includes(dragKey));
      if (!fromZone) return;

      if (fromZone === toZone) return;

      // remove
      zoneState[fromZone] = zoneState[fromZone].filter((k) => k !== dragKey);
      // add
      if (!zoneState[toZone].includes(dragKey)) zoneState[toZone].push(dragKey);

      dragKey = null;
      saveZoneState();
      renderTopZones();
      rebuildAllCards(); // 反映
    });
  });
}

/* =========================
   上部コントロール
========================= */
function bindTopControls() {
  if (btnToggleMetrics && metricsBar) {
    btnToggleMetrics.addEventListener("click", () => {
      metricsBar.classList.toggle("collapsed");
    });
  }

  if (btnResetZones) {
    btnResetZones.addEventListener("click", () => {
      if (!confirm("配置を初期化しますか？")) return;
      zoneState = structuredClone(DEFAULT_ZONE_STATE);
      saveZoneState();
      renderTopZones();
      rebuildAllCards();
    });
  }

  if (btnApplySort) btnApplySort.addEventListener("click", applySort);
  if (btnClearSort) btnClearSort.addEventListener("click", clearSort);
}

function applySort() {
  const col = sortCol?.value || "";
  if (!col) return;

  const order = sortOrder?.value || "desc";

  const cards = Array.from(cardState.values());
  cards.sort((a, b) => {
    const av = num(a.data[col]);
    const bv = num(b.data[col]);
    return order === "asc" ? av - bv : bv - av;
  });

  // DOM並び替え
  cards.forEach((c) => itemsContainer.appendChild(c.el));
}

function clearSort() {
  // 追加順に戻す（ASIN_DATAのキー順）
  const keys = Object.keys(ASIN_DATA || {});
  keys.forEach((asin) => {
    const cs = cardState.get(asin);
    if (cs) itemsContainer.appendChild(cs.el);
  });
}

/* =========================
   カート集計
========================= */
function updateCartSummary() {
  const count = cartState.reduce((acc, it) => acc + (it.qty || 0), 0);
  const totalSales = cartState.reduce((acc, it) => acc + (it.qty || 0) * (it.sell || 0), 0);
  const totalCost = cartState.reduce((acc, it) => acc + (it.qty || 0) * (it.cost || 0), 0);
  const profitJPY = totalSales * FX_RATE - totalCost;
  const margin = totalSales > 0 ? (profitJPY / (totalSales * FX_RATE)) * 100 : 0;

  if (cartCount) cartCount.textContent = String(count);
  if (cartTotalSales) cartTotalSales.textContent = `$${totalSales.toFixed(2)}`;
  if (cartTotalCost) cartTotalCost.textContent = fmtJPY(totalCost);
  if (cartTotalProfit) cartTotalProfit.textContent = fmtJPY(profitJPY);
  if (cartAvgMargin) cartAvgMargin.textContent = `${margin.toFixed(1)}%`;
}

/* =========================
   カード再構築（上部5枠反映）
========================= */
function rebuildAllCards() {
  // 既存カードを上書き更新（項目リストだけ再構築）
  cardState.forEach((v) => {
    // 主要項目、商品情報、詳細テーブル
    const ctx = {
      pool: zoneState.pool,
      info: zoneState.info,
      center: zoneState.center,
      table: zoneState.table,
      hidden: zoneState.hidden,
    };

    if (document.body.classList.contains("third-layout")) {
      buildInfoGridSplit(
        v.el.querySelector(".js-infoGridA"),
        v.el.querySelector(".js-infoGridB"),
        ctx,
        v.data
      );
    } else {
      buildInfoGrid(v.el.querySelector(".js-infoGrid"), ctx, v.data);
    }

    buildCenterList(v.el.querySelector(".js-center"), ctx, v.data);
    buildDetailTable(v.el.querySelector(".js-detailTable"), ctx, v.data);
  });
}

/* =========================
   チャート
========================= */
function renderChart(canvas) {
  const labels = Array.from({ length: 180 }, (_, i) => `${180 - i}日`);
  const rank = labels.map(() => 52000 + (Math.random() - 0.5) * 8000);
  const sellers = labels.map(() => Math.max(1, Math.round(1 + Math.random() * 8)));
  const price = labels.map(() => 22 + (Math.random() - 0.5) * 8);

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "ランキング", data: rank, yAxisID: "yRank", borderWidth: 2, pointRadius: 0 },
        { label: "セラー数", data: sellers, yAxisID: "ySellers", borderWidth: 2, pointRadius: 0 },
        { label: "価格(USD)", data: price, yAxisID: "yPrice", borderWidth: 2, pointRadius: 0 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: {
        yRank: { position: "left", reverse: true },
        ySellers: { position: "right", grid: { drawOnChartArea: false } },
        yPrice: { position: "right", grid: { drawOnChartArea: false } },
      },
    },
  });

  return chart;
}

function updateChartVisibility(chart, showDS, showSP) {
  // 例：DS=ランキング＋セラー、SP=セラー＋価格
  if (!chart) return;

  const ds0 = 0; // rank
  const ds1 = 1; // sellers
  const ds2 = 2; // price

  if (showDS && !showSP) {
    chart.getDatasetMeta(ds0).hidden = false;
    chart.getDatasetMeta(ds1).hidden = false;
    chart.getDatasetMeta(ds2).hidden = true;
  } else if (!showDS && showSP) {
    chart.getDatasetMeta(ds0).hidden = true;
    chart.getDatasetMeta(ds1).hidden = false;
    chart.getDatasetMeta(ds2).hidden = false;
  } else if (showDS && showSP) {
    chart.getDatasetMeta(ds0).hidden = false;
    chart.getDatasetMeta(ds1).hidden = false;
    chart.getDatasetMeta(ds2).hidden = false;
  } else {
    chart.getDatasetMeta(ds0).hidden = true;
    chart.getDatasetMeta(ds1).hidden = true;
    chart.getDatasetMeta(ds2).hidden = true;
  }
  chart.update();
}

/* =========================
   商品情報：レンダリング
========================= */
function buildInfoGrid(root, ctx, data) {
  if (!root) return;
  root.innerHTML = "";
  (ctx.info || []).forEach((k) => {
    const kk = document.createElement("div");
    kk.className = "k";
    kk.textContent = k;

    const vv = document.createElement("div");
    vv.className = "v info-scroll";
    vv.textContent = String(data[k] ?? "");

    root.appendChild(kk);
    root.appendChild(vv);
  });
}

// レイアウト3専用：半分ずつに分割
function buildInfoGridSplit(rootA, rootB, ctx, data) {
  if (!rootA || !rootB) return;
  rootA.innerHTML = "";
  rootB.innerHTML = "";

  const keys = (ctx.info || []);
  const mid = Math.ceil(keys.length / 2);
  const left = keys.slice(0, mid);
  const right = keys.slice(mid);

  const build = (root, list) => {
    list.forEach((k) => {
      const kk = document.createElement("div");
      kk.className = "k";
      kk.textContent = k;

      const vv = document.createElement("div");
      vv.className = "v info-scroll";
      vv.textContent = String(data[k] ?? "");

      root.appendChild(kk);
      root.appendChild(vv);
    });
  };

  build(rootA, left);
  build(rootB, right);
}

/* =========================
   主要項目：レンダリング
========================= */
function buildCenterList(root, ctx, data) {
  if (!root) return;
  root.innerHTML = "";
  (ctx.center || []).forEach((k) => {
    const row = document.createElement("div");
    row.className = "metric-row";

    const l = document.createElement("div");
    l.className = "label";
    l.textContent = k;

    const v = document.createElement("div");
    v.className = "value";
    v.textContent = String(data[k] ?? "");

    row.appendChild(l);
    row.appendChild(v);
    root.appendChild(row);
  });
}

/* =========================
   詳細テーブル：レンダリング
========================= */
function buildDetailTable(table, ctx, data) {
  if (!table) return;

  const theadRow = table.querySelector("thead tr");
  const tbodyRow = table.querySelector("tbody tr");
  if (!theadRow || !tbodyRow) return;

  const cols = (ctx.table || []).filter(Boolean);
  theadRow.innerHTML = "";
  tbodyRow.innerHTML = "";

  if (!cols.length) {
    theadRow.innerHTML = `<th>（表示項目なし）</th>`;
    tbodyRow.innerHTML = `<td class="info-td"><div class="info-td-scroll">上部の「下段」枠に項目を移動すると、ここに出ます。</div></td>`;
    return;
  }

  cols.forEach((k) => {
    const th = document.createElement("th");
    th.textContent = k;
    theadRow.appendChild(th);

    const td = document.createElement("td");
    td.className = "info-td";
    const div = document.createElement("div");
    div.className = "info-td-scroll";
    div.textContent = String(data[k] ?? "");
    td.appendChild(div);
    tbodyRow.appendChild(td);
  });
}

/* =========================
   カード作成
========================= */
function createProductCard(asin, data) {
  const card = document.createElement("section");
  card.className = "product-card card";
  card.dataset.asin = asin;

  const isAltLayout = document.body.classList.contains("alt-layout");
  const isThirdLayout = document.body.classList.contains("third-layout");
  const isFourthLayout = document.body.classList.contains("fourth-layout");

  if (isThirdLayout) {
    card.innerHTML = `
      <div class="card-top">
        <div class="title">ASIN: ${asin}</div>
        <button class="remove" type="button">この行を削除</button>
      </div>

      <div class="layout3-grid">
        <!-- 商品画像 -->
        <div class="l3-image l3-block">
          <div class="head">商品画像</div>
          <div class="image-box">
            <img src="${data["商品画像"] || ""}" alt="商品画像" onerror="this.style.display='none';" />
          </div>
        </div>

        <!-- 商品情報① -->
        <div class="l3-infoA l3-block">
          <div class="head">商品情報①</div>
          <div class="info-grid js-infoGridA"></div>
        </div>

        <!-- 商品情報② -->
        <div class="l3-infoB l3-block">
          <div class="head">商品情報②</div>
          <div class="info-grid js-infoGridB"></div>
        </div>

        <!-- 主要項目 -->
        <div class="l3-center l3-block">
          <div class="head">主要項目</div>
          <div class="center-list js-center"></div>
        </div>

        <!-- カート（右：縦長） -->
        <div class="l3-buy">
          <div class="buy-title">サイズ</div>
          <select class="js-size">
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
          </select>

          <div class="buy-title" style="margin-top:10px;">数量</div>
          <select class="js-qty">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>

          <div class="buy-title" style="margin-top:10px;">販売価格（$）</div>
          <input class="js-sell" type="number" step="0.01" placeholder="例: 39.99" />

          <div class="buy-title" style="margin-top:10px;">仕入れ額（￥）</div>
          <input class="js-cost" type="number" step="1" placeholder="例: 3700" />

          <button class="cart-btn js-addCart" type="button" style="margin-top:12px;">カートに入れる</button>
        </div>

        <!-- keepa（小） -->
        <div class="l3-keepa l3-block">
          <div class="head">keepaグラフ</div>
          <div class="keepa-mini">
            <iframe class="js-keepaFrame" src="" loading="lazy" referrerpolicy="no-referrer"></iframe>
          </div>
        </div>

        <!-- 需要供給（大） -->
        <div class="l3-mes l3-block">
          <div class="head">需要供給グラフ（180日）</div>

          <div class="graph-options js-graphOptions" style="margin-bottom:10px;">
            <label><input type="checkbox" class="js-chkDS" checked />《需要＆供給》</label>
            <label><input type="checkbox" class="js-chkSP" />《供給＆価格》</label>
          </div>

          <div class="mes-big">
            <canvas class="js-chart"></canvas>
          </div>
        </div>
      </div>

      <div class="detail-wrap">
        <div class="detail-head"><div class="t">詳細テーブル</div></div>
        <div class="detail-scroll">
          <table class="detail-table js-detailTable">
            <thead><tr></tr></thead>
            <tbody><tr></tr></tbody>
          </table>
        </div>
      </div>
    `;
  } else if (isFourthLayout) {
    card.innerHTML = `
      <div class="card-top">
        <div class="title">ASIN: ${asin}</div>
        <button class="remove" type="button">この行を削除</button>
      </div>

      <div class="layout4-grid">
        <!-- 商品画像（上） -->
        <div class="l4-image l4-block">
          <div class="head">商品画像</div>
          <div class="image-box">
            <img src="${data["商品画像"] || ""}" alt="商品画像" onerror="this.style.display='none';" />
          </div>
        </div>

        <!-- 商品情報①（上） -->
        <div class="l4-info l4-block">
          <div class="head">商品情報①</div>
          <div class="info-grid js-infoGrid"></div>
        </div>

        <!-- 主要項目（上） -->
        <div class="l4-center l4-block">
          <div class="head">主要項目</div>
          <div class="center-list js-center"></div>
        </div>

        <!-- カート（右：縦長） -->
        <div class="l4-buy">
          <div class="buy-title">サイズ</div>
          <select class="js-size">
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
          </select>

          <div class="buy-title" style="margin-top:10px;">数量</div>
          <select class="js-qty">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>

          <div class="buy-title" style="margin-top:10px;">販売価格（$）</div>
          <input class="js-sell" type="number" step="0.01" placeholder="例: 39.99" />

          <div class="buy-title" style="margin-top:10px;">仕入れ額（￥）</div>
          <input class="js-cost" type="number" step="1" placeholder="例: 3700" />

          <button class="cart-btn js-addCart" type="button" style="margin-top:12px;">カートに入れる</button>
        </div>

        <!-- keepa（下：小） -->
        <div class="l4-keepa l4-block">
          <div class="head">keepaグラフ</div>
          <div class="keepa-mini">
            <iframe class="js-keepaFrame" src="" loading="lazy" referrerpolicy="no-referrer"></iframe>
          </div>
        </div>

        <!-- 需要供給（下：横長） -->
        <div class="l4-mes l4-block">
          <div class="head">需要供給グラフ（180日）</div>

          <div class="graph-options js-graphOptions" style="margin-bottom:10px;">
            <label><input type="checkbox" class="js-chkDS" checked />《需要＆供給》</label>
            <label><input type="checkbox" class="js-chkSP" />《供給＆価格》</label>
          </div>

          <div class="mes-wide">
            <canvas class="js-chart"></canvas>
          </div>
        </div>
      </div>

      <div class="detail-wrap">
        <div class="detail-head"><div class="t">詳細テーブル</div></div>
        <div class="detail-scroll">
          <table class="detail-table js-detailTable">
            <thead><tr></tr></thead>
            <tbody><tr></tr></tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    // 既存：alt / 通常
    card.innerHTML = isAltLayout
      ? `
      <div class="card-top">
        <div class="title">ASIN: ${asin}</div>
        <button class="remove" type="button">この行を削除</button>
      </div>

      <div class="alt-grid">
        <div class="alt-left">
          <div class="alt-image image-box">
            <img src="${data["商品画像"] || ""}" alt="商品画像" onerror="this.style.display='none';" />
          </div>

          <div class="buy-box">
            <div class="buy-title">サイズ</div>
            <select class="js-size">
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
            </select>

            <div class="buy-title" style="margin-top:10px;">数量</div>
            <select class="js-qty">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>

            <div class="buy-title" style="margin-top:10px;">販売価格（$）</div>
            <input class="js-sell" type="number" step="0.01" placeholder="例: 39.99" />

            <div class="buy-title" style="margin-top:10px;">仕入れ額（￥）</div>
            <input class="js-cost" type="number" step="1" placeholder="例: 3700" />

            <button class="cart-btn js-addCart" type="button" style="margin-top:12px;">カートに入れる</button>
          </div>

          <div class="alt-info info-box">
            <div class="info-grid js-infoGrid"></div>
          </div>
        </div>

        <div class="alt-center center-box">
          <div class="center-head">主要項目</div>
          <div class="center-list js-center"></div>
        </div>

        <div class="alt-graph graph-box">
          <div class="graph-head">
            <div class="graph-title">グラフ</div>
          </div>

          <div class="graph-options js-graphOptions">
            <label><input type="checkbox" class="js-chkDS" checked />《需要＆供給》</label>
            <label><input type="checkbox" class="js-chkSP" />《供給＆価格》</label>
          </div>

          <div class="graph-body">
            <div class="canvas-wrap">
              <canvas class="js-chart"></canvas>
            </div>
            <div class="keepa-wrap" style="display:none;">
              <iframe class="js-keepaFrame" src="" loading="lazy" referrerpolicy="no-referrer"></iframe>
            </div>
          </div>
        </div>

        <div class="detail-wrap">
          <div class="detail-head"><div class="t">詳細テーブル</div></div>
          <div class="detail-scroll">
            <table class="detail-table js-detailTable">
              <thead><tr></tr></thead>
              <tbody><tr></tr></tbody>
            </table>
          </div>
        </div>
      </div>
      `
      : `
      <div class="card-top">
        <div class="title">ASIN: ${asin}</div>
        <button class="remove" type="button">この行を削除</button>
      </div>

      <div class="summary-row">
        <div class="left-wrap">
          <div class="image-box">
            <img src="${data["商品画像"] || ""}" alt="商品画像" onerror="this.style.display='none';" />
            <div class="field">
              <label>サイズ</label>
              <select class="js-size">
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
              </select>
            </div>

            <div class="field">
              <label>数量</label>
              <select class="js-qty">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>

            <div class="field">
              <label>販売価格（$）</label>
              <input class="js-sell" type="number" step="0.01" placeholder="例: 39.99" />
            </div>

            <div class="field">
              <label>仕入れ額（￥）</label>
              <input class="js-cost" type="number" step="1" placeholder="例: 3700" />
            </div>

            <button class="cart-btn js-addCart" type="button">カートに入れる</button>
          </div>

          <div class="info-box">
            <div class="info-grid js-infoGrid"></div>
          </div>
        </div>

        <div class="center-box">
          <div class="center-head">主要項目</div>
          <div class="center-list js-center"></div>
        </div>

        <div class="graph-box">
          <div class="graph-head">
            <div class="graph-title">グラフ</div>
            <div class="switch">
              <button class="js-btnMes active" type="button">需要供給</button>
              <button class="js-btnKeepa" type="button">Keepa</button>
            </div>
          </div>

          <div class="graph-options js-graphOptions">
            <label><input type="checkbox" class="js-chkDS" checked />《需要＆供給》</label>
            <label><input type="checkbox" class="js-chkSP" />《供給＆価格》</label>
          </div>

          <div class="graph-body">
            <div class="canvas-wrap js-mesWrap">
              <canvas class="js-chart"></canvas>
            </div>
            <div class="keepa-wrap js-keepaWrap" style="display:none;">
              <iframe class="js-keepaFrame" src="" loading="lazy" referrerpolicy="no-referrer"></iframe>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-wrap">
        <div class="detail-head"><div class="t">詳細テーブル</div></div>
        <div class="detail-scroll">
          <table class="detail-table js-detailTable">
            <thead><tr></tr></thead>
            <tbody><tr></tr></tbody>
          </table>
        </div>
      </div>
      `;
  }

  // 共通バインド
  const btnRemove = card.querySelector(".remove");
  btnRemove?.addEventListener("click", () => {
    card.remove();
    cardState.delete(asin);
    updateHeaderStatus();
    if (!cardState.size) emptyState.style.display = "block";
  });

  // info / center / table
  const ctx = {
    pool: zoneState.pool,
    info: zoneState.info,
    center: zoneState.center,
    table: zoneState.table,
    hidden: zoneState.hidden,
  };

  if (isThirdLayout) {
    buildInfoGridSplit(card.querySelector(".js-infoGridA"), card.querySelector(".js-infoGridB"), ctx, data);
  } else {
    buildInfoGrid(card.querySelector(".js-infoGrid"), ctx, data);
  }
  buildCenterList(card.querySelector(".js-center"), ctx, data);
  buildDetailTable(card.querySelector(".js-detailTable"), ctx, data);

  // chart
  const canvas = card.querySelector(".js-chart");
  const chart = canvas ? renderChart(canvas) : null;
  card.__chart = chart;

  // chart toggles
  const chkDS = card.querySelector(".js-chkDS");
  const chkSP = card.querySelector(".js-chkSP");
  if (chkDS && chkSP && chart) {
    const apply = () => updateChartVisibility(chart, chkDS.checked, chkSP.checked);
    chkDS.addEventListener("change", apply);
    chkSP.addEventListener("change", apply);
    apply();
  } else if (chart) {
    updateChartVisibility(chart, true, false);
  }

  // keepa
  const keepaFrame = card.querySelector(".js-keepaFrame");
  if (keepaFrame) keepaFrame.src = `https://keepa.com/#!product/1-${asin}`;

  // 通常レイアウトのみ：トグル維持
  if (!isAltLayout && !isThirdLayout && !isFourthLayout) {
    const keepaWrap = card.querySelector(".js-keepaWrap");
    const mesWrap = card.querySelector(".js-mesWrap");
    const graphOptions = card.querySelector(".js-graphOptions");
    const btnMes = card.querySelector(".js-btnMes");
    const btnKeepa = card.querySelector(".js-btnKeepa");

    function setMode(mode) {
      if (!keepaWrap || !mesWrap || !graphOptions || !btnMes || !btnKeepa) return;
      if (mode === "MES") {
        btnMes.classList.add("active");
        btnKeepa.classList.remove("active");
        graphOptions.style.display = "flex";
        mesWrap.style.display = "block";
        keepaWrap.style.display = "none";
      } else {
        btnKeepa.classList.add("active");
        btnMes.classList.remove("active");
        graphOptions.style.display = "none";
        mesWrap.style.display = "none";
        keepaWrap.style.display = "block";
      }
    }
    btnMes.addEventListener("click", () => setMode("MES"));
    btnKeepa.addEventListener("click", () => setMode("KEEPA"));
    setMode("MES");
  }

  // cart
  const btnAdd = card.querySelector(".js-addCart");
  btnAdd?.addEventListener("click", () => {
    const qty = Number(card.querySelector(".js-qty")?.value || 1);
    const sell = Number(card.querySelector(".js-sell")?.value || 0);
    const cost = Number(card.querySelector(".js-cost")?.value || 0);

    cartState.push({ asin, qty, sell, cost });
    updateCartSummary();
    alert("カートに追加しました");
  });

  return card;
}
