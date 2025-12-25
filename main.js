/**************************************************************
 * main.js（更新版）
 * - グラフの疑似データ生成を「相関あり」に改善：
 *   1) ランキング（需要）が上がる（＝数字は小さくなる）→ 価格は上がりやすい
 *   2) セラー数（供給）が増える → 価格は下がりやすい
 *   3) ランキングが下がる（＝数字が大きくなる）→ セラー数は減りやすい / 価格は上がりにくい
 * - X軸（180日）の目盛りを見やすく：月境界＋約30日ごと＋最終日を表示
 **************************************************************/

const $ = (sel, root = document) => root.querySelector(sel);
const FX_RATE = 155;

const fmtJPY = (n) => "￥" + Number(n || 0).toLocaleString("ja-JP");
const num = (v) => {
  const x = Number(String(v ?? "").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const fmtUSD = (v) => {
  const x = num(v);
  if (!x) return "$0.00";
  return "$" + x.toFixed(2);
};

const tokI = (id) => `I:${id}`;
const tokM = (id) => `M:${id}`;

/* =========================
   指標（候補）
========================= */
const METRICS_ALL = [
  { id: "過去3月FBA最安値", label: "過去3ヶ月FBA最安値", sourceKey: "過去3月FBA最安値" },
  { id: "FBA最安値", label: "FBA最安値", sourceKey: "FBA最安値" },

  { id: "粗利益率予測", label: "粗利益率予測", sourceKey: "粗利益率予測" },
  { id: "入金額予測", label: "入金額予測（円）", sourceKey: "入金額予測" },
  { id: "粗利益予測", label: "粗利益予測（1個）", sourceKey: "粗利益予測" },

  { id: "粗利益", label: "粗利益", sourceKey: "粗利益" },
  { id: "粗利益率", label: "粗利益率", sourceKey: "粗利益率" },

  { id: "販売額（ドル）", label: "販売額（ドル）", sourceKey: "販売額（ドル）" },
  { id: "入金額（円）", label: "入金額（円）", sourceKey: "入金額（円）" },
  { id: "入金額計（円）", label: "入金額計（円）", sourceKey: "入金額計（円）" },

  { id: "30日販売数", label: "30日販売数", sourceKey: "30日販売数" },
  { id: "90日販売数", label: "90日販売数", sourceKey: "90日販売数" },
  { id: "180日販売数", label: "180日販売数", sourceKey: "180日販売数" },
  { id: "予測30日販売数", label: "予測30日販売数", sourceKey: "予測30日販売数" },

  { id: "複数在庫指数45日分", label: "複数在庫指数45日分", sourceKey: "複数在庫指数45日分" },
  { id: "複数在庫指数60日分", label: "複数在庫指数60日分", sourceKey: "複数在庫指数60日分" },

  { id: "ライバル偏差1", label: "ライバル偏差1", sourceKey: "ライバル偏差1" },
  { id: "ライバル偏差2", label: "ライバル偏差2", sourceKey: "ライバル偏差2" },
  { id: "ライバル増加率", label: "ライバル増加率", sourceKey: "ライバル増加率" },

  { id: "在庫数", label: "在庫数", sourceKey: "在庫数" },
  { id: "返品率", label: "返品率", sourceKey: "返品率" },
];

/* =========================
   商品情報（候補）※初期に置く
========================= */
const INFO_DEFAULT = [
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
];

const INFO_ALL = [
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
  "メーカー",
  "仕入先",
  "製造国",
  "電池",
  "対象年齢",
  "梱包サイズ",
];

const tokenLabelMap = new Map();
const tokenSourceMap = new Map();

for (const m of METRICS_ALL) {
  tokenLabelMap.set(tokM(m.id), m.label);
  tokenSourceMap.set(tokM(m.id), m.sourceKey);
}
for (const k of INFO_ALL) {
  tokenLabelMap.set(tokI(k), k);
  tokenSourceMap.set(tokI(k), k);
}

const labelOf = (token) => tokenLabelMap.get(token) || token;
const sourceKeyOf = (token) => tokenSourceMap.get(token) || token;

/* =========================
   zoneState（共通5枠）
========================= */
const zoneState = {
  pool: [],
  info: [],
  center: [],
  table: [],
  hidden: [],
};

function defaultZoneState() {
  const infoTokens = INFO_DEFAULT.map(tokI);
  const metricTokens = METRICS_ALL.map((m) => tokM(m.id));

  zoneState.info = [...infoTokens];

  zoneState.center = [
    tokM("粗利益"),
    tokM("粗利益率"),
    tokM("入金額（円）"),
    tokM("30日販売数"),
    tokM("予測30日販売数"),
  ].filter((t) => tokenLabelMap.has(t));

  zoneState.table = [
    tokM("過去3月FBA最安値"),
    tokM("FBA最安値"),
    tokM("90日販売数"),
    tokM("180日販売数"),
    tokM("在庫数"),
    tokM("返品率"),
  ].filter((t) => tokenLabelMap.has(t));

  const used = new Set([...zoneState.info, ...zoneState.center, ...zoneState.table]);
  zoneState.hidden = [];
  zoneState.pool = metricTokens
    .filter((t) => !used.has(t))
    .concat(INFO_ALL.map(tokI).filter((t) => !used.has(t)));
}

defaultZoneState();

/* =========================
   DOM
========================= */
const zonePool = $("#zonePool");
const zoneInfo = $("#zoneInfo");
const zoneCenter = $("#zoneCenter");
const zoneTable = $("#zoneTable");
const zoneHidden = $("#zoneHidden");

const itemsContainer = $("#itemsContainer");
const emptyState = $("#emptyState");

const metricsBar = $("#metricsBar");
const metricsCollapseBtn = $("#btnToggleMetrics");
const headerStatus = $("#headerStatus");

const sortColSel = $("#sortCol");
const sortOrderSel = $("#sortOrder");
const btnApplySort = $("#btnApplySort");
const btnClearSort = $("#btnClearSort");
const btnResetZones = $("#btnResetZones");

const asinCatalog = $("#asinCatalog");

const cartCountEl = $("#cartCount");
const cartTotalSalesEl = $("#cartTotalSales");
const cartTotalCostEl = $("#cartTotalCost");
const cartTotalProfitEl = $("#cartTotalProfit");
const cartAvgMarginEl = $("#cartAvgMargin");

/* =========================
   状態
========================= */
const activeAsins = new Set();
const cardMap = new Map();

let sortColToken = "";
let sortOrder = "desc";

const graphModeByAsin = new Map(); // asin -> "MES"|"KEEPA"
const cart = new Map(); // asin -> {qty, sell, cost}

/* =========================
   初期化
========================= */
init();

function init() {
  initPoolUI();
  initCatalog();
  initSortUI();
  initActions();
  updateCartSummary();
  updateHeaderStatus();
  renderTopZones();
}

function initPoolUI() {
  if (zonePool) attachZoneDnD(zonePool, { zoneKey: "pool" });
  if (zoneInfo) attachZoneDnD(zoneInfo, { zoneKey: "info" });
  if (zoneCenter) attachZoneDnD(zoneCenter, { zoneKey: "center" });
  if (zoneTable) attachZoneDnD(zoneTable, { zoneKey: "table" });
  if (zoneHidden) attachZoneDnD(zoneHidden, { zoneKey: "hidden" });
}

function initActions() {
  metricsCollapseBtn?.addEventListener("click", () => {
    metricsBar?.classList.toggle("collapsed");
    metricsCollapseBtn.textContent = metricsBar?.classList.contains("collapsed") ? "展開" : "折りたたみ";
  });

  btnResetZones?.addEventListener("click", () => {
    defaultZoneState();
    renderTopZones();
    refreshSortRuleOptions();
    rerenderAllCards();
  });
}

function initCatalog() {
  if (!asinCatalog || !window.ASIN_DATA) return;

  asinCatalog.innerHTML = "";
  Object.keys(window.ASIN_DATA).forEach((asin) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "asin-pill";
    b.textContent = asin;
    b.addEventListener("click", () => addAsin(asin));
    asinCatalog.appendChild(b);
  });
}

function initSortUI() {
  refreshSortRuleOptions();

  btnApplySort?.addEventListener("click", () => {
    sortColToken = sortColSel.value || "";
    sortOrder = sortOrderSel.value || "desc";
    rerenderAllCards(true);
  });

  btnClearSort?.addEventListener("click", () => {
    sortColToken = "";
    sortColSel.value = "";
    rerenderAllCards(true);
  });
}

function refreshSortRuleOptions() {
  if (!sortColSel) return;
  sortColSel.innerHTML = `<option value="">（なし）</option>`;

  const all = new Set([...zoneState.pool, ...zoneState.center, ...zoneState.table, ...zoneState.hidden, ...zoneState.info]);
  [...all]
    .filter((t) => String(t).startsWith("M:"))
    .forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = labelOf(t);
      sortColSel.appendChild(opt);
    });
}

/* =========================
   上部5枠の描画
========================= */
function renderTopZones() {
  if (!zonePool || !zoneInfo || !zoneCenter || !zoneTable || !zoneHidden) return;

  zonePool.innerHTML = "";
  zoneInfo.innerHTML = "";
  zoneCenter.innerHTML = "";
  zoneTable.innerHTML = "";
  zoneHidden.innerHTML = "";

  zoneState.pool.forEach((t) => zonePool.appendChild(makePill(t)));
  zoneState.info.forEach((t) => zoneInfo.appendChild(makePill(t)));
  zoneState.center.forEach((t) => zoneCenter.appendChild(makePill(t)));
  zoneState.table.forEach((t) => zoneTable.appendChild(makePill(t)));
  zoneState.hidden.forEach((t) => zoneHidden.appendChild(makePill(t)));

  refreshSortRuleOptions();
}

function makePill(token) {
  const pill = document.createElement("div");
  pill.className = "metric-pill";
  pill.draggable = true;
  pill.dataset.token = token;
  pill.textContent = labelOf(token);

  pill.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", `item:${token}`);
    e.dataTransfer.effectAllowed = "move";
  });

  return pill;
}

/* =========================
   DnD（共通5枠）重複不可
========================= */
function attachZoneDnD(zoneEl, { zoneKey }) {
  if (!zoneEl) return;

  zoneEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });

  zoneEl.addEventListener("drop", (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;

    const first = raw.indexOf(":");
    if (first < 0) return;
    const kind = raw.slice(0, first);
    const token = raw.slice(first + 1);
    if (kind !== "item" || !token) return;

    moveTokenToZone(token, zoneKey);
    renderTopZones();
    rerenderAllCards();
  });
}

function moveTokenToZone(token, toZone) {
  for (const z of Object.keys(zoneState)) {
    const idx = zoneState[z].indexOf(token);
    if (idx >= 0) zoneState[z].splice(idx, 1);
  }
  zoneState[toZone].push(token);
}

/* =========================
   ASIN追加/削除
========================= */
function addAsin(asin) {
  if (activeAsins.has(asin)) return;
  const data = window.ASIN_DATA?.[asin];
  if (!data) return;

  activeAsins.add(asin);

  const card = createProductCard(asin, data);
  cardMap.set(asin, card);

  itemsContainer.appendChild(card);

  emptyState.style.display = activeAsins.size ? "none" : "block";

  updateHeaderStatus();
  rerenderAllCards(true);
}

function removeAsin(asin) {
  activeAsins.delete(asin);
  const el = cardMap.get(asin);
  if (el) el.remove();
  cardMap.delete(asin);

  if (cart.has(asin)) cart.delete(asin);
  updateCartSummary();

  emptyState.style.display = activeAsins.size ? "none" : "block";
  updateHeaderStatus();
}

function updateHeaderStatus() {
  if (!headerStatus) return;
  headerStatus.textContent = `表示中: ${activeAsins.size}件 / カート: ${cart.size}件`;
}

/* =========================
   カート集計
========================= */
function updateCartSummary() {
  let itemCount = 0;
  let sales = 0;
  let cost = 0;

  for (const [, it] of cart.entries()) {
    const qty = num(it.qty);
    const s = num(it.sell);
    const c = num(it.cost);
    itemCount += qty;
    sales += s * qty;
    cost += c * qty;
  }

  const profitJPY = sales * FX_RATE - cost;
  const margin = sales > 0 ? (profitJPY / (sales * FX_RATE)) * 100 : 0;

  if (cartCountEl) cartCountEl.textContent = String(itemCount);
  if (cartTotalSalesEl) cartTotalSalesEl.textContent = fmtUSD(sales);
  if (cartTotalCostEl) cartTotalCostEl.textContent = fmtJPY(cost);
  if (cartTotalProfitEl) cartTotalProfitEl.textContent = fmtJPY(profitJPY);
  if (cartAvgMarginEl) cartAvgMarginEl.textContent = (margin || 0).toFixed(1) + "%";
}

/* =========================
   並び替え・再描画
========================= */
function rerenderAllCards(applySort = false) {
  if (!itemsContainer) return;

  let asins = [...activeAsins];
  if (applySort && sortColToken) {
    asins.sort((a, b) => {
      const da = window.ASIN_DATA?.[a] || {};
      const db = window.ASIN_DATA?.[b] || {};
      const key = sourceKeyOf(sortColToken);
      const va = num(da[key]);
      const vb = num(db[key]);
      return sortOrder === "asc" ? va - vb : vb - va;
    });
  }

  asins.forEach((asin) => {
    const card = cardMap.get(asin);
    if (card) itemsContainer.appendChild(card);
  });

  activeAsins.forEach((asin) => {
    const card = cardMap.get(asin);
    const data = window.ASIN_DATA?.[asin] || {};
    if (card) applyZoneRenderToCard(card, asin, data);
  });
}

/* =========================
   カード生成
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
        <div class="l3-image l3-block">
          <div class="head">商品画像</div>
          <div class="image-box">
            <img src="${data["商品画像"] || ""}" alt="商品画像" onerror="this.style.display='none';" />
          </div>
        </div>

        <div class="l3-infoA l3-block">
          <div class="head">商品情報①</div>
          <div class="info-grid js-infoGridA"></div>
        </div>

        <div class="l3-infoB l3-block">
          <div class="head">商品情報②</div>
          <div class="info-grid js-infoGridB"></div>
        </div>

        <div class="l3-center l3-block">
          <div class="head">主要項目</div>
          <div class="center-list js-center"></div>
        </div>

        <div class="l3-buy">
          <div class="buy-title">数量</div>
          <select class="js-qty">
            <option value="1" selected>1</option>
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

        <div class="l3-keepa l3-block">
          <div class="head">keepaグラフ</div>
          <div class="keepa-mini">
            <iframe class="js-keepaFrame" src="" loading="lazy"></iframe>
          </div>
        </div>

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
    `;
  } else if (isFourthLayout) {
    card.innerHTML = `
      <div class="card-top">
        <div class="title">ASIN: ${asin}</div>
        <button class="remove" type="button">この行を削除</button>
      </div>

      <div class="layout4-grid">
        <div class="l4-image l4-block">
          <div class="head">商品画像</div>
          <div class="image-box">
            <img src="${data["商品画像"] || ""}" alt="商品画像" onerror="this.style.display='none';" />
          </div>
        </div>

        <div class="l4-info l4-block">
          <div class="head">商品情報①</div>
          <div class="info-grid js-infoGrid"></div>
        </div>

        <div class="l4-center l4-block">
          <div class="head">主要項目</div>
          <div class="center-list js-center"></div>
        </div>

        <div class="l4-buy">
          <div class="buy-title">数量</div>
          <select class="js-qty">
            <option value="1" selected>1</option>
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

        <div class="l4-keepa l4-block">
          <div class="head">keepaグラフ</div>
          <div class="keepa-mini">
            <iframe class="js-keepaFrame" src="" loading="lazy"></iframe>
          </div>
        </div>

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
    `;
  } else {
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
            <div class="switch">
              <button class="js-btnMes active" type="button">需要供給</button>
              <button class="js-btnKeepa" type="button">keepa</button>
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
              <iframe class="js-keepaFrame" src="" loading="lazy"></iframe>
            </div>
          </div>
        </div>

        <div class="alt-buy buy-box">
          <div class="buy-title">数量</div>
          <select class="js-qty">
            <option value="1" selected>1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>

          <div class="buy-title">販売価格（$）</div>
          <input class="js-sell" type="number" step="0.01" placeholder="例: 39.99" />

          <div class="buy-title">仕入れ額（￥）</div>
          <input class="js-cost" type="number" step="1" placeholder="例: 3700" />

          <button class="cart-btn js-addCart" type="button">カートに入れる</button>
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
              <label>数量</label>
              <select class="js-qty">
                <option value="1" selected>1</option>
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
              <button class="js-btnKeepa" type="button">keepa</button>
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
              <iframe class="js-keepaFrame" src="" loading="lazy"></iframe>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-wrap">
        <div class="detail-head">
          <div class="t">下段（カスタム）</div>
        </div>
        <div class="detail-scroll">
          <table class="detail-table js-detailTable">
            <thead><tr></tr></thead>
            <tbody><tr></tr></tbody>
          </table>
        </div>
      </div>
    `;
  }

  card.querySelector(".remove").addEventListener("click", () => removeAsin(asin));

  card.querySelector(".js-addCart")?.addEventListener("click", () => {
    const qty = num(card.querySelector(".js-qty")?.value || 1);
    const sell = num(card.querySelector(".js-sell")?.value || 0);
    const cost = num(card.querySelector(".js-cost")?.value || 0);
    cart.set(asin, { qty, sell, cost });
    updateCartSummary();
    updateHeaderStatus();
  });

  const keepaFrame = card.querySelector(".js-keepaFrame");
  if (keepaFrame) {
    const keepaUrl = data["keepaURL"] || data["KeepaURL"] || data["keepa"] || "";
    if (keepaUrl) keepaFrame.src = keepaUrl;
  }

  const btnMes = card.querySelector(".js-btnMes");
  const btnKeepa = card.querySelector(".js-btnKeepa");
  const graphOptions = card.querySelector(".js-graphOptions");
  const mesWrap = card.querySelector(".js-mesWrap");
  const keepaWrap = card.querySelector(".js-keepaWrap");

  if (btnMes && btnKeepa && graphOptions && mesWrap && keepaWrap) {
    const setMode = (mode) => {
      graphModeByAsin.set(asin, mode);
      if (mode === "MES") {
        btnMes.classList.add("active");
        btnKeepa.classList.remove("active");
        graphOptions.style.display = "";
        mesWrap.style.display = "block";
        keepaWrap.style.display = "none";
      } else {
        btnKeepa.classList.add("active");
        btnMes.classList.remove("active");
        graphOptions.style.display = "none";
        mesWrap.style.display = "none";
        keepaWrap.style.display = "block";
      }
    };
    btnMes.addEventListener("click", () => setMode("MES"));
    btnKeepa.addEventListener("click", () => setMode("KEEPA"));
    setMode("MES");
  }

  applyZoneRenderToCard(card, asin, data);
  return card;
}

/* =========================
   zones → カードへ反映
========================= */
function applyZoneRenderToCard(card, asin, data) {
  const isThirdLayout = document.body.classList.contains("third-layout");

  if (isThirdLayout) {
    buildInfoGridSplit(card.querySelector(".js-infoGridA"), card.querySelector(".js-infoGridB"), data);
  } else {
    buildInfoGrid(card.querySelector(".js-infoGrid"), data);
  }

  buildCenterList(card.querySelector(".js-center"), data);
  buildDetailTable(card.querySelector(".js-detailTable"), data);

  const canvas = card.querySelector(".js-chart");
  const chart = renderChart(canvas);
  card.__chart = chart;

  const chkDS = card.querySelector(".js-chkDS"); // 《需要＆供給》
  const chkSP = card.querySelector(".js-chkSP"); // 《供給＆価格》

  const redraw = () => {
    const ds = chkDS ? !!chkDS.checked : true;
    const sp = chkSP ? !!chkSP.checked : false;
    updateChart(chart, data, { ds, sp });
  };

  if (chkDS) chkDS.addEventListener("change", redraw);
  if (chkSP) chkSP.addEventListener("change", redraw);

  if (chkDS) chkDS.checked = true;
  if (chkSP) chkSP.checked = false;

  redraw();
}

/* =========================
   商品情報
========================= */
function buildInfoGrid(root, data) {
  if (!root) return;
  root.innerHTML = "";

  for (const token of zoneState.info) {
    if (!String(token).startsWith("I:")) continue;
    const key = sourceKeyOf(token);
    const k = labelOf(token);
    const v = data[key] ?? "";

    const kEl = document.createElement("div");
    kEl.className = "k";
    kEl.textContent = k;

    const vEl = document.createElement("div");
    vEl.className = "v info-scroll";
    vEl.textContent = String(v ?? "");

    root.appendChild(kEl);
    root.appendChild(vEl);
  }
}

function buildInfoGridSplit(rootA, rootB, data) {
  if (!rootA || !rootB) return;
  rootA.innerHTML = "";
  rootB.innerHTML = "";

  const tokens = zoneState.info.filter((t) => String(t).startsWith("I:"));
  const half = Math.ceil(tokens.length / 2);
  const partA = tokens.slice(0, half);
  const partB = tokens.slice(half);

  const fill = (root, list) => {
    list.forEach((token) => {
      const key = sourceKeyOf(token);
      const k = labelOf(token);
      const v = data[key] ?? "";

      const kEl = document.createElement("div");
      kEl.className = "k";
      kEl.textContent = k;

      const vEl = document.createElement("div");
      vEl.className = "v info-scroll";
      vEl.textContent = String(v ?? "");

      root.appendChild(kEl);
      root.appendChild(vEl);
    });
  };

  fill(rootA, partA);
  fill(rootB, partB);
}

/* =========================
   主要項目
========================= */
function buildCenterList(root, data) {
  if (!root) return;
  root.innerHTML = "";

  for (const token of zoneState.center) {
    if (!String(token).startsWith("M:")) continue;
    const key = sourceKeyOf(token);

    const row = document.createElement("div");
    row.className = "metric-row";

    const l = document.createElement("div");
    l.className = "label";
    l.textContent = labelOf(token);

    const v = document.createElement("div");
    v.className = "value";
    v.textContent = String(data[key] ?? "");

    row.appendChild(l);
    row.appendChild(v);
    root.appendChild(row);
  }
}

/* =========================
   下段（テーブル）
========================= */
function buildDetailTable(table, data) {
  if (!table) return;

  const headRow = table.querySelector("thead tr");
  const bodyRow = table.querySelector("tbody tr");
  if (!headRow || !bodyRow) return;

  headRow.innerHTML = "";
  bodyRow.innerHTML = "";

  const tokens = zoneState.table.filter((t) => String(t).startsWith("M:"));
  tokens.forEach((token) => {
    const th = document.createElement("th");
    th.textContent = labelOf(token);
    headRow.appendChild(th);

    const td = document.createElement("td");
    td.textContent = String(data[sourceKeyOf(token)] ?? "");
    bodyRow.appendChild(td);
  });
}

/* =========================
   グラフ（Chart.js）
========================= */
function renderChart(canvas) {
  if (!canvas) return null;

  const ctx = canvas.getContext("2d");
  return new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        // 0: 価格（オレンジ）
        {
          label: "価格 (USD)",
          data: [],
          tension: 0,
          yAxisID: "yPrice",
          pointRadius: 0,
          borderColor: "#ff7a00",
        },
        // 1: ランキング（緑）
        {
          label: "ランキング (BSR)",
          data: [],
          tension: 0,
          yAxisID: "yRank",
          pointRadius: 0,
          borderColor: "#3aa85b",
        },
        // 2: セラー数（紫）
        {
          label: "セラー数",
          data: [],
          tension: 0,
          yAxisID: "ySellers",
          pointRadius: 0,
          borderColor: "#6a5acd",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const label = ctx.dataset?.label || "";
              const v = ctx.parsed?.y;
              if (label.includes("価格")) return `${label}: $${Number(v).toFixed(2)}`;
              if (label.includes("ランキング")) return `${label}: ${Number(v).toLocaleString("en-US")}`;
              if (label.includes("セラー数")) return `${label}: ${Number(v)}`;
              return `${label}: ${v}`;
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "日付（過去180日）" },
          ticks: {
            autoSkip: false,
            maxRotation: 0,
            callback: function (value, index, ticks) {
              // updateChart内で chart.__majorTickIndexSet を作る
              const set = this.chart?.__majorTickIndexSet;
              if (set && set.has(index)) return this.chart.data.labels[index];
              return "";
            },
          },
        },
        yPrice: {
          position: "left",
          title: { display: true, text: "価格 (USD)" },
          ticks: { callback: (v) => `$${v}` },
          grid: { drawOnChartArea: true },
        },
        yRank: {
          position: "right",
          title: { display: true, text: "ランキング（低いほど良い）" },
          reverse: true,
          grid: { drawOnChartArea: false },
          ticks: { callback: (v) => Number(v).toLocaleString("en-US") },
        },
        ySellers: {
          position: "right",
          offset: true,
          title: { display: true, text: "セラー数" },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

/* =========================
   グラフデータ生成（相関あり・Keepa寄せ）
   要望のイメージ：
   - ランキングが上がる(=BSRが小さくなる) → 価格も上がりやすい
   - ただしセラー数が増えると価格が下がりやすい
   - ランキングが下がる(=BSRが大きくなる) → セラー数が減り、価格が高くなりやすい（供給減で粘る）
========================= */
function updateChart(chart, data, { ds = true, sp = false } = {}) {
  if (!chart) return;

  const days = 180;

  // ===== 日付ラベル（実日付） =====
  const today = new Date();
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    return d;
  });
  const labels = dates.map((d) => `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, "0")}`);

  // ===== 見やすい目盛り：月初 + 30日ごと + 末尾 =====
  const major = new Set();
  major.add(0);
  major.add(days - 1);
  for (let i = 0; i < days; i++) {
    const d = dates[i];
    if (d.getDate() === 1) major.add(i); // 月初
    if (i % 30 === 0) major.add(i); // 30日ごと
  }
  chart.__majorTickIndexSet = major;

  // ===== utility =====
  const numLocal = (v) => {
    const x = Number(String(v ?? "").replace(/[^\d.\-]/g, ""));
    return Number.isFinite(x) ? x : 0;
  };
  const clamp = (x, min, max) => Math.min(max, Math.max(min, x));
  const seedFromString = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) || 1;
  };
  const mulberry32 = (a) => () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const smooth = (arr, w = 3) => {
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      let s = 0,
        c = 0;
      for (let j = i - Math.floor(w / 2); j <= i + Math.floor(w / 2); j++) {
        if (j >= 0 && j < arr.length) {
          s += arr[j];
          c++;
        }
      }
      out.push(s / c);
    }
    return out;
  };

  const asin = data?.ASIN || data?.asin || "";
  const rand = mulberry32(seedFromString(`${asin}-coupled`));

  const getBasePrice = () => {
    const candidates = [
      data["カートボックス価格"],
      data["販売額（ドル）"],
      data["FBA最安値"],
      data["過去3月FBA最安値"],
    ];
    for (const c of candidates) {
      const v = numLocal(c);
      if (v > 0) return v;
    }
    return 29.99;
  };

  const basePrice = getBasePrice();

  // ===== 需要(demand) の潜在状態（0..1）
  // 需要が高いほどランキングは良い（BSR小）＆価格上がりやすい
  let demand = clamp(0.45 + (rand() * 0.25 - 0.125), 0.2, 0.85);

  // ===== 供給(sellers) 初期
  let sellersNow = Math.round(6 + rand() * 8); // 6..14

  // ===== 価格 初期
  let priceNow = basePrice * (0.92 + rand() * 0.2); // baseの±

  // ===== 価格変動の「段差イベント」（Keepaっぽい）
  const stepEvents = [];
  const stepCount = 7 + Math.floor(rand() * 10); // 7..16
  for (let k = 0; k < stepCount; k++) {
    const at = Math.floor(rand() * (days - 10)) + 5;
    // demand連動を強めたいので、イベントは小さめ
    const mag = (rand() * 0.09 - 0.045); // -4.5%..+4.5%
    stepEvents.push({ at, mag });
  }
  stepEvents.sort((a, b) => a.at - b.at);

  // ===== lag（セラー数が需要/価格に追随する遅れ）
  const demandLag = Array(days).fill(demand);

  const price = [];
  const sellers = [];
  const rank = [];

  // ランキング（BSR）レンジ（商品ごとにばらす）
  const rankBase = Math.round(800 + rand() * 25000);     // 平均位置
  const rankSpan = Math.round(6000 + rand() * 65000);    // 変動幅

  // セラー数レンジ
  const sellersMin = 1;
  const sellersMax = 60;

  for (let i = 0; i < days; i++) {
    // --- 需要のゆらぎ（ゆっくり変化＋たまにショック）
    let drift = (rand() * 0.06 - 0.03);          // -0.03..+0.03
    drift *= 0.10;                               // かなりゆっくり
    demand = clamp(demand + drift, 0.12, 0.92);

    // 月初などでイベントっぽいショック
    if (dates[i].getDate() === 1 && rand() < 0.45) {
      demand = clamp(demand + (rand() * 0.18 - 0.06), 0.12, 0.92);
    }
    // たまに強いショック
    if (rand() < 0.015) {
      demand = clamp(demand + (rand() < 0.5 ? -1 : 1) * (0.08 + rand() * 0.18), 0.12, 0.92);
    }
    demandLag[i] = demand;

    // --- ランキング生成：需要が高いほど「小さく（良く）」なる
    // keepaっぽいギザギザ（ノイズ＋スパイク）
    const noise = (rand() * 2 - 1) * 0.08; // -0.08..0.08
    const demandFactor = clamp(1.0 - demand, 0.05, 0.95); // demand↑で小さく
    let bsr = rankBase + rankSpan * demandFactor;
    bsr *= 1 + noise;

    // スパイク（売れた/切れた感）
    if (rand() < 0.04) {
      bsr *= rand() < 0.55 ? (1.35 + rand() * 0.9) : (0.35 + rand() * 0.45);
    }
    bsr = clamp(bsr, 1, 200000);
    rank.push(bsr);

    // --- セラー数：需要が高いと増えやすいが、反応は遅い
    // 追随：30日前の需要 + 現在価格の高さが「参入」を呼ぶ
    const lagIdx = Math.max(0, i - 20 - Math.floor(rand() * 10)); // 約20〜30日遅れ
    const demandRef = demandLag[lagIdx];
    const pricePremium = clamp((priceNow / basePrice) - 1, -0.3, 0.6); // 高値ほど参入増

    // 参入圧（＋）と撤退圧（−）
    let sellerDrift = 0;
    sellerDrift += (demandRef - 0.45) * 2.2;       // 需要が高いと増える
    sellerDrift += pricePremium * 2.0;             // 価格が高いと増える
    sellerDrift -= (demandRef < 0.25 ? 0.8 : 0.0); // 需要低いと減る

    // 小刻み変動
    if (rand() < 0.35) sellersNow += Math.sign(sellerDrift) * (rand() < 0.6 ? 0 : 1);
    if (rand() < 0.12) sellersNow += Math.round(rand() * 2 - 1);

    // 大きめの変化（まとまった参入/撤退）
    if (rand() < 0.04) sellersNow += Math.round(sellerDrift * (0.8 + rand() * 0.8));

    sellersNow = clamp(sellersNow, sellersMin, sellersMax);
    sellers.push(Math.round(sellersNow));

    // --- 価格：需要↑(ランキング良い)で上がり、セラー↑で下がる
    // （要求イメージの核）
    // ランキング良さ（良い=小さい）を0..1へ正規化
    const bsrNorm = clamp((Math.log(bsr + 1) - Math.log(1)) / (Math.log(200000) - Math.log(1)), 0, 1); // 0:良,1:悪
    const rankGood = 1 - bsrNorm; // 1:良い

    // セラー多さ（0..1）
    const sellersNorm = clamp((sellersNow - sellersMin) / (sellersMax - sellersMin), 0, 1);

    // 基本の価格変化率：需要（rankGood）で上、セラーで下
    let pct = 0;
    pct += (rankGood - 0.5) * 0.030;     // 需要効果（最大±1.5%/日くらいの上限へ）
    pct -= (sellersNorm - 0.25) * 0.020; // 供給効果（多いほど下げ）

    // 段差イベント（Keepa感）
    while (stepEvents.length && stepEvents[0].at === i) {
      const ev = stepEvents.shift();
      priceNow *= 1 + ev.mag;
    }

    // 価格の段差っぽい「据え置き」：たまに変えない
    if (rand() < 0.35) pct *= 0.0; // 据え置き日

    // 競争が激しい（セラー多）時は下げ圧を追加
    if (sellersNow >= 18 && rand() < 0.55) pct -= 0.006 * (0.6 + rand());

    // 供給が少ない（セラー少）時は上げ圧（粘り）
    if (sellersNow <= 4 && rand() < 0.45) pct += 0.007 * (0.6 + rand());

    // ノイズ（微）
    pct += (rand() * 0.002 - 0.001);

    priceNow *= 1 + pct;

    // 価格の下限/上限（商品ごと）
    const minP = basePrice * 0.70;
    const maxP = basePrice * 1.55;
    priceNow = clamp(priceNow, minP, maxP);

    // Keepaっぽい段差感（1セント刻み）
    price.push(Math.round(priceNow * 100) / 100);
  }

  // rankは少しだけ滑らかに（ギザギザは残す）
  const rankSm = smooth(rank, 3).map((x) => Math.round(x));

  // 反映
  chart.data.labels = labels;
  chart.data.datasets[0].data = price;
  chart.data.datasets[1].data = rankSm;
  chart.data.datasets[2].data = sellers;

  // ✅ 表示制御（両方ONなら3つ全部）
  const showRank = ds;
  const showPrice = sp;
  const showSellers = ds || sp;

  chart.data.datasets[0].hidden = !showPrice;
  chart.data.datasets[1].hidden = !showRank;
  chart.data.datasets[2].hidden = !showSellers;

  chart.update();
}
