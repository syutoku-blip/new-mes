/**************************************************************
 * main.js
 * - レイアウト3/4対応
 * - Keepaっぽい「階段状の価格」「セラー数は緩やか」「ランキングは上下＋急落」を再現
 * - チェックは排他にせず、両方ONで「需要＆供給＆価格（3つ）」表示
 *   ✅《需要＆供給》 = ランキング＋セラー数
 *   ✅《供給＆価格》 = セラー数＋価格
 *   ✅両方ON         = ランキング＋セラー数＋価格
 * - 縦軸/横軸にタイトル＆単位を表示
 * - 180日分の横軸（日付）を見やすく間引き表示
 **************************************************************/

const $ = (sel, root = document) => root.querySelector(sel);
const FX_RATE = 155;

const fmtJPY = (n) => "￥" + Number(n || 0).toLocaleString("ja-JP");
const num = (v) => {
  const x = Number(String(v ?? "").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const fmtKg = (v) => {
  const x = num(v);
  if (!x) return "";
  return x.toFixed(2) + "kg";
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
const cardMap = new Map(); // asin -> element

let sortColToken = ""; // token
let sortOrder = "desc";

const graphModeByAsin = new Map(); // asin -> "MES"|"KEEPA"
const cart = new Map(); // asin -> {qty, sell, cost}

/* =========================
   Keepaっぽいダミー系列（ASINごとに固定）
========================= */
const seriesByAsin = new Map(); // asin -> {labels, dates, rank[], sellers[], price[]}

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

  for (const [asin, it] of cart.entries()) {
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

  // remove
  card.querySelector(".remove").addEventListener("click", () => {
    removeAsin(asin);
  });

  // cart add
  card.querySelector(".js-addCart")?.addEventListener("click", () => {
    const qty = num(card.querySelector(".js-qty")?.value || 1);
    const sell = num(card.querySelector(".js-sell")?.value || 0);
    const cost = num(card.querySelector(".js-cost")?.value || 0);
    cart.set(asin, { qty, sell, cost });
    updateCartSummary();
    updateHeaderStatus();
  });

  // keepa url (iframe)
  const keepaFrame = card.querySelector(".js-keepaFrame");
  if (keepaFrame) {
    const keepaUrl = data["keepaURL"] || data["KeepaURL"] || data["keepa"] || data["Keepaリンク"] || "";
    if (keepaUrl && String(keepaUrl).startsWith("http")) keepaFrame.src = keepaUrl;
  }

  // graph switch (alt/通常のみ)
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

  // 初回描画
  applyZoneRenderToCard(card, asin, data);

  return card;
}

/* =========================
   zones → カードへ反映
========================= */
function applyZoneRenderToCard(card, asin, data) {
  const ctx = { asin };
  const isThirdLayout = document.body.classList.contains("third-layout");

  // info
  if (isThirdLayout) {
    buildInfoGridSplit(card.querySelector(".js-infoGridA"), card.querySelector(".js-infoGridB"), ctx, data);
  } else {
    buildInfoGrid(card.querySelector(".js-infoGrid"), ctx, data);
  }

  // center / table
  buildCenterList(card.querySelector(".js-center"), ctx, data);
  buildDetailTable(card.querySelector(".js-detailTable"), ctx, data);

  // chart
  const canvas = card.querySelector(".js-chart");
  let chart = card.__chart;
  if (!chart) {
    chart = renderChart(canvas);
    card.__chart = chart;
  }

  // ✅チェック挙動（排他にしない）
  const chkDS = card.querySelector(".js-chkDS");
  const chkSP = card.querySelector(".js-chkSP");

  const applyCheckState = () => {
    // どちらもOFFなら、既定でDSをONに戻す（空グラフ回避）
    if (chkDS && chkSP && !chkDS.checked && !chkSP.checked) chkDS.checked = true;

    const showRank = !!chkDS?.checked;          // 需要＆供給 → ランキング
    const showPrice = !!chkSP?.checked;         // 供給＆価格 → 価格
    const showSellers = !!(chkDS?.checked || chkSP?.checked); // どちらでもセラー数は出す（Keepaイメージに合わせる）

    updateChart(chart, asin, data, { showRank, showSellers, showPrice });
  };

  if (chkDS && chkSP) {
    chkDS.addEventListener("change", applyCheckState);
    chkSP.addEventListener("change", applyCheckState);
  }

  // 初回
  applyCheckState();
}

/* =========================
   商品情報：通常（1枠）
========================= */
function buildInfoGrid(root, ctx, data) {
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
    const isTags = Array.isArray(v);
    if (isTags) {
      vEl.className = "v v-tags";
      v.forEach((t) => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = String(t);
        vEl.appendChild(span);
      });
    } else {
      vEl.className = "v info-scroll";
      vEl.textContent = String(v ?? "");
    }

    root.appendChild(kEl);
    root.appendChild(vEl);
  }
}

/* =========================
   商品情報：レイアウト3（2分割）
========================= */
function buildInfoGridSplit(rootA, rootB, ctx, data) {
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
      const isTags = Array.isArray(v);
      if (isTags) {
        vEl.className = "v v-tags";
        v.forEach((t) => {
          const span = document.createElement("span");
          span.className = "tag";
          span.textContent = String(t);
          vEl.appendChild(span);
        });
      } else {
        vEl.className = "v info-scroll";
        vEl.textContent = String(v ?? "");
      }

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
function buildCenterList(root, ctx, data) {
  if (!root) return;
  root.innerHTML = "";

  for (const token of zoneState.center) {
    if (!String(token).startsWith("M:")) continue;
    const key = sourceKeyOf(token);
    const label = labelOf(token);
    const value = data[key];

    const row = document.createElement("div");
    row.className = "metric-row";

    const l = document.createElement("div");
    l.className = "label";
    l.textContent = label;

    const v = document.createElement("div");
    v.className = "value";
    v.textContent = String(value ?? "");

    row.appendChild(l);
    row.appendChild(v);
    root.appendChild(row);
  }
}

/* =========================
   下段（テーブル）
========================= */
function buildDetailTable(table, ctx, data) {
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

/* ============================================================
   グラフ（Chart.js）
   - 3軸：価格(左) / セラー数(右) / ランキング(右・オフセット)
   - Keepaっぽく：価格＆セラー数は「階段」、ランキングは上下＋急落
============================================================ */

function renderChart(canvas) {
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");

  return new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        // ランキング（緑）右軸
        {
          label: "ランキング(BSR)",
          data: [],
          yAxisID: "yRank",
          tension: 0.15,
          pointRadius: 0,
          borderWidth: 2,
        },
        // セラー数（紫）右軸
        {
          label: "セラー数",
          data: [],
          yAxisID: "ySellers",
          stepped: true,
          tension: 0,
          pointRadius: 0,
          borderWidth: 2,
        },
        // 価格（オレンジ）左軸
        {
          label: "価格(USD)",
          data: [],
          yAxisID: "yPrice",
          stepped: true,
          tension: 0,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: true },
        tooltip: { enabled: true },
      },
      scales: {
        x: {
          title: { display: true, text: "日付（直近180日）" },
          ticks: {
            maxRotation: 0,
            autoSkip: false,
            callback: (value, index, ticks) => {
              // 間引き：12〜14本くらいの目盛りにする
              const n = ticks.length || 180;
              const step = Math.max(1, Math.round(n / 12));
              if (index === 0 || index === n - 1 || index % step === 0) return String(this.getLabelForValue ? this.getLabelForValue(value) : "");
              return "";
            },
          },
        },
        yPrice: {
          position: "left",
          title: { display: true, text: "価格（USD）" },
          ticks: {
            callback: (v) => "$" + Number(v).toFixed(0),
          },
          grid: { drawOnChartArea: true },
        },
        ySellers: {
          position: "right",
          title: { display: true, text: "セラー数（出品者数）" },
          beginAtZero: true,
          suggestedMax: 20,
          grid: { drawOnChartArea: false },
          ticks: { precision: 0 },
        },
        yRank: {
          position: "right",
          offset: true,
          title: { display: true, text: "ランキング（BSR：小さいほど売れてる）" },
          beginAtZero: false,
          reverse: true, // Keepaっぽく「良い（小さい）」が上に来る
          grid: { drawOnChartArea: false },
          ticks: {
            callback: (v) => {
              const x = Math.round(Number(v));
              if (x >= 1000000) return (x / 1000000).toFixed(1) + "M";
              if (x >= 1000) return (x / 1000).toFixed(0) + "k";
              return String(x);
            },
          },
        },
      },
    },
  });
}

/* -------------------------
   180日ラベル（日付）生成
-------------------------- */
function buildDateLabels(days = 180) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const labels = [];
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    dates.push(d);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    labels.push(`${m}/${day}`);
  }
  return { labels, dates };
}

/* -------------------------
   乱数（ASINシードで固定）
-------------------------- */
function makeSeededRng(seedStr) {
  // xmur3 + mulberry32
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }
  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const seedFn = xmur3(seedStr);
  return mulberry32(seedFn());
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/* -------------------------
   「リアル寄り」系列生成
   - 価格：小刻みではなく「段差」で推移（±数%）
   - セラー数：基本は緩やか（±0〜2の変動）
   - ランキング：上下＋ときどき急落（売れた日）→また戻る
   - 相関イメージ：
     ランキングが上がる（悪化=数値が大きくなる）→価格も上がりやすい
     セラー増→価格下げ圧
     ランキングが下がる（改善=数値が小さくなる）→セラー減→価格高めに
-------------------------- */
function generateKeepaLikeSeries(asin, data, days = 180) {
  const rng = makeSeededRng(String(asin));

  // base price：カートボックス or 販売額（ドル）を優先
  const basePrice =
    num(data["カートボックス価格"]) ||
    num(data["販売額（ドル）"]) ||
    num(data["FBA最安値"]) ||
    29.99;

  // base sellers：一般的に 2〜15 くらいが多いイメージ（商品次第）
  // 30日販売数が多いほど競合が増えやすい、という簡易仮説で微調整
  const sales30 = num(data["30日販売数"]) || 50;
  const baseSellers = clamp(Math.round(3 + sales30 / 25 + rng() * 2), 2, 18);

  // base rank：売れ行きが良いほど小さくなる（カテゴリによるが 5k〜200k の帯を想定）
  // 例として 30日販売数 100 => 15k〜40k あたりに寄せる
  const baseRank = clamp(Math.round(180000 / Math.sqrt(sales30 + 5) + rng() * 8000), 1500, 250000);

  const { labels, dates } = buildDateLabels(days);

  const rank = new Array(days);
  const sellers = new Array(days);
  const price = new Array(days);

  // 状態
  let r = baseRank;
  let s = baseSellers;
  let p = basePrice;

  // 価格とセラーは「段差」を作るため、数日ホールドする
  let holdPriceDays = 0;
  let holdSellersDays = 0;

  for (let i = 0; i < days; i++) {
    // ---- ランキング：緩やかな漂い + ノイズ + たまに売れて急落（改善）
    const drift = (rng() - 0.5) * (baseRank * 0.03); // 緩いドリフト
    const noise = (rng() - 0.5) * (baseRank * 0.02); // 日々ノイズ

    // 売れた日（急落）：3〜7%の確率
    const saleEvent = rng() < clamp(0.03 + sales30 / 8000, 0.03, 0.07);
    const drop = saleEvent ? (0.20 + rng() * 0.35) : 0; // 20〜55%改善

    // ランキング悪化（値が大きくなる）方向にも少し戻る圧（平均回帰）
    const meanRevert = (baseRank - r) * 0.06;

    r = r + drift + noise + meanRevert;
    if (saleEvent) r = r * (1 - drop);

    // 下限上限
    r = clamp(Math.round(r), 500, 350000);
    rank[i] = r;

    // ---- セラー：基本ゆっくり（競争の増減）
    // ランキングが「悪化」してる（数値↑）とセラーが少し減り、
    // ランキングが「改善」してる（数値↓）とセラーが増える、を薄く入れる
    // （ユーザー要望のイメージに合わせて逆寄りに：改善→セラー減 も起こりやすく）
    const rankDelta = i > 0 ? (rank[i] - rank[i - 1]) : 0; // +なら悪化
    const desireSellers = baseSellers
      + (rankDelta < 0 ? -0.25 : 0.15); // 改善(↓)なら減りやすい / 悪化(↑)なら増えやすい

    if (holdSellersDays <= 0) {
      // 3〜7日ホールド
      holdSellersDays = 3 + Math.floor(rng() * 5);
      const step = (rng() - 0.5) * 1.5; // -0.75〜+0.75
      const move = (desireSellers - s) * 0.35 + step;
      s = clamp(Math.round(s + move), 1, 25);
    } else {
      holdSellersDays--;
    }
    sellers[i] = s;

    // ---- 価格：段差推移（Keepaっぽい）
    // イメージ：
    // ・ランキング悪化(数値↑) → 価格上がりやすい
    // ・セラー増 → 価格下がりやすい
    // ・ランキング改善(数値↓) → セラー減 → 価格高めに、も自然に混ざる
    if (holdPriceDays <= 0) {
      // 2〜6日ホールド
      holdPriceDays = 2 + Math.floor(rng() * 5);

      const rankEffect = clamp(rankDelta / (baseRank * 0.08), -1.2, 1.2); // 悪化で+寄り
      const sellersEffect = clamp((s - baseSellers) / 10, -1.2, 1.2); // セラー多いと+寄り

      // 価格変動：悪化で上、セラー多いで下
      const pct =
        (rankEffect * 0.015)          // 最大で±1.8%くらい
        - (sellersEffect * 0.018)     // 最大で±2.1%くらい
        + ((rng() - 0.5) * 0.01);     // 微ノイズ

      // 変動幅を現実寄りに抑える（1回の段差で±0〜5%程度）
      const pctClamped = clamp(pct, -0.05, 0.05);
      p = p * (1 + pctClamped);

      // 価格の下限/上限（極端防止）
      p = clamp(p, basePrice * 0.65, basePrice * 1.45);

      // 2桁
      p = Math.round(p * 100) / 100;
    } else {
      holdPriceDays--;
    }
    price[i] = p;
  }

  return { labels, dates, rank, sellers, price };
}

/* -------------------------
   更新（表示切替）
-------------------------- */
function updateChart(chart, asin, data, { showRank, showSellers, showPrice }) {
  if (!chart) return;

  // 系列をASINごとに固定（毎回ランダムに変わらない）
  if (!seriesByAsin.has(asin)) {
    seriesByAsin.set(asin, generateKeepaLikeSeries(asin, data, 180));
  }
  const s = seriesByAsin.get(asin);

  chart.data.labels = s.labels;

  // datasets: [rank, sellers, price]
  const dsRank = chart.data.datasets[0];
  const dsSellers = chart.data.datasets[1];
  const dsPrice = chart.data.datasets[2];

  dsRank.data = s.rank;
  dsSellers.data = s.sellers;
  dsPrice.data = s.price;

  // 表示ON/OFF
  dsRank.hidden = !showRank;
  dsSellers.hidden = !showSellers;
  dsPrice.hidden = !showPrice;

  // 価格軸のレンジを、表示時だけ寄せる（見やすく）
  if (showPrice) {
    const minP = Math.min(...s.price);
    const maxP = Math.max(...s.price);
    chart.options.scales.yPrice.suggestedMin = Math.floor(minP - 1);
    chart.options.scales.yPrice.suggestedMax = Math.ceil(maxP + 1);
  } else {
    chart.options.scales.yPrice.suggestedMin = undefined;
    chart.options.scales.yPrice.suggestedMax = undefined;
  }

  // セラー軸も寄せる（基本変動は小さいので）
  if (showSellers) {
    const minS = Math.min(...s.sellers);
    const maxS = Math.max(...s.sellers);
    chart.options.scales.ySellers.suggestedMin = Math.max(0, minS - 2);
    chart.options.scales.ySellers.suggestedMax = maxS + 2;
  }

  // ランキング軸も寄せる（右軸 reverse なので min/maxの意味が直感と逆になるが suggested を置くだけでOK）
  if (showRank) {
    const minR = Math.min(...s.rank);
    const maxR = Math.max(...s.rank);
    // reverse=true でもレンジは同じ指定でOK
    chart.options.scales.yRank.suggestedMin = minR;
    chart.options.scales.yRank.suggestedMax = maxR;
  }

  chart.update();
}
