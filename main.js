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
   - pool: 未配置
   - info: 商品情報
   - center: 主要項目
   - table: 下段
   - hidden: 非表示
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

  // 仮の初期：主要項目に見せたいもの（必要なら自由に入替）
  zoneState.center = [
    tokM("粗利益"),
    tokM("粗利益率"),
    tokM("入金額（円）"),
    tokM("30日販売数"),
    tokM("予測30日販売数"),
  ].filter((t) => tokenLabelMap.has(t));

  // 下段（テーブル）
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

// 並び替えルール（単一）
let sortColToken = ""; // token
let sortOrder = "desc";

// 表示：keepa or mes (カード単位)
const graphModeByAsin = new Map(); // asin -> "MES"|"KEEPA"

// カート
const cart = new Map(); // asin -> {qty, sell, cost}

/* =========================
   初期化
========================= */
let sortRules = [];

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
  // ページ側に存在する枠だけ初期化（layout4 などでDOM差異があっても壊れないように）
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

  // 並び替え候補：center/table/poolにあるメトリクスのみ
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

    // ★tokenに ":" が含まれるため split(":") で壊れないように
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
  // 重複禁止
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

  // DOM並べ替えだけ（カード内は必要時に更新）
  asins.forEach((asin) => {
    const card = cardMap.get(asin);
    if (card) itemsContainer.appendChild(card);
  });

  // 表示項目の再構築
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

        <!-- カート -->
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

        <!-- keepa（小） -->
        <div class="l3-keepa l3-block">
          <div class="head">keepaグラフ</div>
          <div class="keepa-mini">
            <iframe class="js-keepaFrame" src="" loading="lazy"></iframe>
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
    `;
  } else if (isFourthLayout) {
    card.innerHTML = `
      <div class="card-top">
        <div class="title">ASIN: ${asin}</div>
        <button class="remove" type="button">この行を削除</button>
      </div>

      <div class="layout4-grid">
        <!-- 商品画像 -->
        <div class="l4-image l4-block">
          <div class="head">商品画像</div>
          <div class="image-box">
            <img src="${data["商品画像"] || ""}" alt="商品画像" onerror="this.style.display='none';" />
          </div>
        </div>

        <!-- 商品情報① -->
        <div class="l4-info l4-block">
          <div class="head">商品情報①</div>
          <div class="info-grid js-infoGrid"></div>
        </div>

        <!-- 主要項目 -->
        <div class="l4-center l4-block">
          <div class="head">主要項目</div>
          <div class="center-list js-center"></div>
        </div>

        <!-- カート -->
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

        <!-- keepa（小） -->
        <div class="l4-keepa l4-block">
          <div class="head">keepaグラフ</div>
          <div class="keepa-mini">
            <iframe class="js-keepaFrame" src="" loading="lazy"></iframe>
          </div>
        </div>

        <!-- 需要供給（横長） -->
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
          <table class="detail-table">
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
    const keepaUrl = data["keepaURL"] || data["KeepaURL"] || data["keepa"] || "";
    if (keepaUrl) keepaFrame.src = keepaUrl;
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
  const chart = renderChart(canvas);
  card.__chart = chart;

  // チェックボックス
  const chkDS = card.querySelector(".js-chkDS");
  const chkSP = card.querySelector(".js-chkSP");
  if (chkDS && chkSP) {
    const redraw = () => updateChart(chart, data, { mode: chkSP.checked ? "SP" : "DS" });
    chkDS.addEventListener("change", () => {
      if (chkDS.checked) chkSP.checked = false;
      redraw();
    });
    chkSP.addEventListener("change", () => {
      if (chkSP.checked) chkDS.checked = false;
      redraw();
    });
    // 初回
    redraw();
  } else {
    // layout3 / layout4 は「需要＆供給」固定のまま
    updateChart(chart, data, { mode: "DS" });
  }
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
        { label: "ランキング", data: [], tension: 0.2 },
        { label: "セラー数", data: [], tension: 0.2 },
        { label: "価格(USD)", data: [], tension: 0.2 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: false } },
    },
  });
}

function updateChart(chart, data, { mode }) {
  if (!chart) return;

  // ダミー：ASIN_DATA 側のキーに合わせて拾う
  const days = 180;
  const labels = Array.from({ length: days }, (_, i) => `${days - i}`);

  const rank = Array.from({ length: days }, () => Math.max(1, Math.round(Math.random() * 50000)));
  const sellers = Array.from({ length: days }, () => Math.round(Math.random() * 40));
  const price = Array.from({ length: days }, () => Math.round(10 + Math.random() * 60));

  chart.data.labels = labels;

  if (mode === "SP") {
    chart.data.datasets[0].label = "セラー数";
    chart.data.datasets[0].data = sellers;
    chart.data.datasets[1].label = "価格(USD)";
    chart.data.datasets[1].data = price;
    chart.data.datasets[2].label = "ランキング";
    chart.data.datasets[2].data = rank;
  } else {
    chart.data.datasets[0].label = "ランキング";
    chart.data.datasets[0].data = rank;
    chart.data.datasets[1].label = "セラー数";
    chart.data.datasets[1].data = sellers;
    chart.data.datasets[2].label = "価格(USD)";
    chart.data.datasets[2].data = price;
  }

  chart.update();
}
