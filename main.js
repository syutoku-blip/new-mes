/* =========================================================
   MES-AI-A main.js (FULL)
   - ASINクリックでカード追加（複数可）
   - 指標プール：ドラッグ&ドロップ（挿入位置対応）
   - 真ん中枠 / 下段テーブル：同一指標はどちらか一方のみ
   - プール折りたたみ/展開（localStorage）
   - ソート（真ん中枠の指標から複数条件）
   - カート：数量/販売価格$/仕入れ額¥ → 集計（sticky表示はCSS）
   - グラフ：MES-AI-A(ランキング/セラー数/価格) + Keepa切替
   - 日本最安値：ホバーで Amazon/Yahoo/楽天 内訳ツールチップ
   - 重量：データ側「重量kg」で取得、表示「重量（容積重量）」
   - 指標プールに「容積重量」は出さない（左枠にあるため）
   - ★起動処理：DOMContentLoaded済みでも確実に初期化（ASIN一覧復活）
========================================================= */

/* =========================
   DOM
========================= */
const headerStatus = document.getElementById("headerStatus");
const asinCatalog = document.getElementById("asinCatalog");
const emptyState = document.getElementById("emptyState");
const itemsContainer = document.getElementById("itemsContainer");

const metricsBarEl = document.querySelector(".metrics-bar");
const metricsCollapseBtn = document.getElementById("metricsCollapseBtn");

const metricsPoolZone = document.getElementById("metricsPoolZone");
const metricsCenterZone = document.getElementById("metricsCenterZone");
const metricsTableZone = document.getElementById("metricsTableZone");
const metricsHiddenZone = document.getElementById("metricsHiddenZone");

const metricsResetBtn = document.getElementById("metricsResetBtn");
const clearCardsBtn = document.getElementById("clearCardsBtn");
const clearCartBtn = document.getElementById("clearCartBtn");

const sortControls = document.getElementById("sortControls");
const addSortRuleBtn = document.getElementById("addSortRuleBtn");
const applySortBtn = document.getElementById("applySortBtn");
const clearSortBtn = document.getElementById("clearSortBtn");

/* cart summary */
const cartTotalCostEl = document.getElementById("cartTotalCost");
const cartTotalRevenueEl = document.getElementById("cartTotalRevenue");
const cartTotalProfitEl = document.getElementById("cartTotalProfit");
const cartAsinCountEl = document.getElementById("cartAsinCount");
const cartItemCountEl = document.getElementById("cartItemCount");

/* =========================
   Globals
========================= */
const cardState = new Map(); // asin -> { el, data, chart, state, centerBox, tableEl }
const cart = new Map();      // asin -> { qty, sellUSD, costJPY }
const FX_USDJPY = 150;       // 固定（必要なら将来UI化）

/* =========================
   Utils
========================= */
function yen(n){
  const v = Math.round(Number(n || 0));
  return "￥" + v.toLocaleString("ja-JP");
}
function num(n){
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}
function createPRNG(seedStr) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i);
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}
function fmtKg(v){
  const s = String(v ?? "").trim();
  if(!s) return "";
  return s.toLowerCase().includes("kg") ? s : `${s}kg`;
}

/* "26%" "6,200円" "$39.99" "+0.5" "1.20kg" -> number */
function toSortableNumber(value){
  if (value == null) return NaN;
  const s = String(value).trim();
  if (!s) return NaN;

  const cleaned = s
    .replace(/[,￥円$％%]/g, "")
    .replace(/kg/gi, "")
    .replace(/[^\d.+-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/* =========================
   Cart summary
========================= */
function updateCartSummary(){
  let totalCost = 0;
  let totalRevenue = 0;
  let asinCount = 0;
  let itemCount = 0;

  cart.forEach((v) => {
    asinCount += 1;
    itemCount += v.qty;
    totalCost += v.qty * v.costJPY;
    totalRevenue += v.qty * v.sellUSD * FX_USDJPY;
  });

  const profit = totalRevenue - totalCost;

  cartTotalCostEl.textContent = yen(totalCost);
  cartTotalRevenueEl.textContent = yen(totalRevenue);
  cartTotalProfitEl.textContent = yen(profit);
  cartAsinCountEl.textContent = `${asinCount}`;
  cartItemCountEl.textContent = `${itemCount}`;
}

/* =========================
   Warning tags
========================= */
function renderWarningTags(container, rawText) {
  container.innerHTML = "";
  const text = (rawText || "").trim();
  if (!text) { container.textContent = "－"; return; }

  const tags = [];
  const pushIfIncluded = (keyword, cls) => { if (text.includes(keyword)) tags.push({ label: keyword, cls }); };

  pushIfIncluded("輸出不可", "warning-export-ban");
  pushIfIncluded("知財", "warning-ip");
  pushIfIncluded("大型", "warning-large");

  const wrap = document.createElement("div");
  wrap.className = "warning-tags";

  if (!tags.length) {
    const span = document.createElement("span");
    span.className = "warning-tag warning-large";
    span.textContent = text;
    wrap.appendChild(span);
  } else {
    tags.forEach(t => {
      const span = document.createElement("span");
      span.className = "warning-tag " + t.cls;
      span.textContent = t.label;
      wrap.appendChild(span);
    });
  }

  container.appendChild(wrap);
}

/* =========================
   Chart (MES-AI-A)
========================= */
function getDemandSupplySeries(asin) {
  const rand = createPRNG(asin);
  const days = 180;
  const labels = [];
  const ranking = [];
  const sellers = [];
  const price = [];

  let rank = 60000 * (0.6 + rand() * 0.4);
  let seller = 5 + Math.round(rand() * 5);
  let p = 25 + rand() * 30;

  for (let i = days - 1; i >= 0; i--) {
    labels.push(`${i}日前`);

    rank += (rand() - 0.5) * 4000;
    rank = Math.max(5000, Math.min(80000, rank));

    seller += (rand() - 0.5) * 2;
    seller = Math.max(1, Math.min(25, seller));

    p += (rand() - 0.5) * 2;
    p = Math.max(10, Math.min(80, p));

    ranking.push(Math.round(rank));
    sellers.push(Number(seller.toFixed(1)));
    price.push(Number(p.toFixed(2)));
  }

  return {
    labels: labels.reverse(),
    ranking: ranking.reverse(),
    sellers: sellers.reverse(),
    price: price.reverse()
  };
}

function renderChart(canvasEl, asin) {
  const series = getDemandSupplySeries(asin);
  const ctx = canvasEl.getContext("2d");

  return new Chart(ctx, {
    type: "line",
    data: {
      labels: series.labels,
      datasets: [
        { label: "ランキング", data: series.ranking, borderWidth: 4, pointRadius: 0, tension: 0.25, borderColor: "#60a5fa", yAxisID: "yRank" },
        { label: "セラー数", data: series.sellers, borderWidth: 4, pointRadius: 0, tension: 0.25, borderColor: "#22c55e", yAxisID: "ySeller" },
        { label: "価格(USD)", data: series.price, borderWidth: 4, pointRadius: 0, tension: 0.25, borderColor: "#f97316", yAxisID: "yPrice" }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top", labels: { font: { size: 9 }, boxWidth: 18, boxHeight: 8, padding: 6 } },
        tooltip: {
          titleFont: { size: 10 },
          bodyFont: { size: 10 },
          callbacks: {
            label: (ctx) => ctx.dataset.yAxisID === "yPrice"
              ? `${ctx.dataset.label}: $${Number(ctx.parsed.y).toFixed(2)}`
              : `${ctx.dataset.label}: ${ctx.parsed.y}`
          }
        }
      },
      scales: {
        x: { ticks: { font: { size: 9 }, maxTicksLimit: 9 }, grid: { display: false } },
        yRank: { reverse: true, title: { display: true, text: "ランキング", font: { size: 9 } }, ticks: { font: { size: 9 } } },
        ySeller: { position: "right", title: { display: true, text: "セラー数", font: { size: 9 } }, ticks: { font: { size: 9 } }, grid: { drawOnChartArea: false } },
        yPrice: { position: "right", offset: true, title: { display: true, text: "価格(USD)", font: { size: 9 } }, ticks: { font: { size: 9 } }, grid: { drawOnChartArea: false } }
      }
    }
  });
}

/* チェックボックス表示切替 */
function updateChartVisibility(chart, demandSupplyOn, supplyPriceOn) {
  if(!demandSupplyOn && !supplyPriceOn) demandSupplyOn = true;

  const showRank = demandSupplyOn;
  const showSeller = demandSupplyOn || supplyPriceOn;
  const showPrice = supplyPriceOn;

  chart.data.datasets[0].hidden = !showRank;
  chart.data.datasets[1].hidden = !showSeller;
  chart.data.datasets[2].hidden = !showPrice;
  chart.update();
}

/* =========================
   Metrics pool (Drag & Drop)
========================= */
const METRICS_STORAGE_KEY = "MES_AI_METRICS_ZONES_V8";
const SORT_STORAGE_KEY = "MES_AI_SORT_RULES_V1";
const METRICS_COLLAPSE_KEY = "MES_AI_METRICS_COLLAPSED_V1";

let METRICS_COLLAPSED = localStorage.getItem(METRICS_COLLAPSE_KEY) === "1";

const METRICS_ALL = [
  { id: "FBA最安値", label: "FBA最安値", sourceKey: "FBA最安値" },
  { id: "過去3月FBA最安値", label: "過去3ヶ月FBA最安値", sourceKey: "過去3月FBA最安値" },
  { id: "粗利益率予測", label: "粗利益率予測", sourceKey: "粗利益率予測" },
  { id: "粗利益予測", label: "粗利益予測（1個）", sourceKey: "粗利益予測" },
  { id: "予測30日販売数", label: "予測30日販売数", sourceKey: "予測30日販売数" },

  { id: "日本最安値", label: "日本最安値", sourceKey: "日本最安値" },

  { id: "30日販売数", label: "30日販売数（実績）", sourceKey: "30日販売数" },
  { id: "90日販売数", label: "90日販売数（実績）", sourceKey: "90日販売数" },
  { id: "180日販売数", label: "180日販売数（実績）", sourceKey: "180日販売数" },

  { id: "在庫数", label: "在庫数", sourceKey: "在庫数" },
  { id: "返品率", label: "返品率", sourceKey: "返品率" },
  { id: "販売額（ドル）", label: "販売額（USD）", sourceKey: "販売額（ドル）" },
  { id: "入金額（円）", label: "入金額（円）", sourceKey: "入金額（円）" },
  { id: "入金額計（円）", label: "入金額計（円）", sourceKey: "入金額計（円）" },

  { id: "仕入れ目安単価", label: "仕入れ目安単価", sourceKey: "仕入れ目安単価" },
  { id: "仕入合計", label: "仕入合計", sourceKey: "仕入合計" },
  { id: "仕入計", label: "仕入計", sourceKey: "仕入計" },

  { id: "複数在庫指数45日分", label: "複数在庫指数（45日）", sourceKey: "複数在庫指数45日分" },
  { id: "複数在庫指数60日分", label: "複数在庫指数（60日）", sourceKey: "複数在庫指数60日分" },
  { id: "ライバル偏差1", label: "ライバル偏差×1", sourceKey: "ライバル偏差1" },
  { id: "ライバル偏差2", label: "ライバル偏差×2", sourceKey: "ライバル偏差2" },
  { id: "ライバル増加率", label: "ライバル増加率", sourceKey: "ライバル増加率" },

  { id: "請求重量", label: "請求重量", sourceKey: "請求重量" },
  { id: "想定送料", label: "想定送料", sourceKey: "想定送料" },
  { id: "送料", label: "送料", sourceKey: "送料" },
  { id: "関税", label: "関税", sourceKey: "関税" }
];

const DEFAULT_ZONES = {
  pool: [
    "日本最安値",
    "90日販売数","180日販売数",
    "複数在庫指数45日分","複数在庫指数60日分",
    "ライバル偏差1","ライバル偏差2","ライバル増加率",
    "入金額計（円）","仕入合計","仕入計",
    "請求重量","送料"
  ],
  center: ["FBA最安値","過去3月FBA最安値","粗利益率予測","粗利益予測","予測30日販売数"],
  table: ["30日販売数","在庫数","返品率","販売額（ドル）","入金額（円）","仕入れ目安単価","想定送料","関税"],
  hidden: []
};

function structuredCloneSafe(obj){ return JSON.parse(JSON.stringify(obj)); }
function metricById(id){ return METRICS_ALL.find(m => m.id === id); }

function sanitizeZones(zones){
  const allIds = METRICS_ALL.map(m => m.id);
  const z = { pool:[], center:[], table:[], hidden:[] };

  ["pool","center","table","hidden"].forEach(k => {
    z[k] = Array.isArray(zones?.[k]) ? zones[k].filter(id => allIds.includes(id)) : [];
  });

  const total = z.pool.length + z.center.length + z.table.length + z.hidden.length;
  if (total === 0) return structuredCloneSafe(DEFAULT_ZONES);

  const used = new Set([...z.pool, ...z.center, ...z.table, ...z.hidden]);
  allIds.forEach(id => { if (!used.has(id)) z.pool.push(id); });

  const seen = new Set();
  ["pool","center","table","hidden"].forEach(k => {
    z[k] = z[k].filter(id => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  });

  return z;
}

let ZONES = (function loadZones(){
  try{
    const raw = localStorage.getItem(METRICS_STORAGE_KEY);
    if(!raw) return structuredCloneSafe(DEFAULT_ZONES);
    return sanitizeZones(JSON.parse(raw));
  }catch{
    return structuredCloneSafe(DEFAULT_ZONES);
  }
})();

function saveZones(){
  localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(ZONES));
}

function removeFromAllZones(id){
  ["pool","center","table","hidden"].forEach(z => {
    ZONES[z] = ZONES[z].filter(x => x !== id);
  });
}

function getBeforeIdInZone(containerEl, clientX, clientY){
  const pills = [...containerEl.querySelectorAll(".metric-pill")];
  if(!pills.length) return null;

  let best = null;
  let bestDist = Infinity;

  for(const p of pills){
    const r = p.getBoundingClientRect();
    const cx = (r.left + r.right) / 2;
    const cy = (r.top + r.bottom) / 2;
    const d = Math.hypot(clientX - cx, clientY - cy);
    if(d < bestDist){
      bestDist = d;
      best = p;
    }
  }
  if(!best) return null;

  const r = best.getBoundingClientRect();
  const dropOnLeft = clientX < (r.left + r.right) / 2;
  if(dropOnLeft) return best.dataset.metricId;

  const idx = pills.indexOf(best);
  if(idx >= 0 && idx + 1 < pills.length){
    return pills[idx + 1].dataset.metricId;
  }
  return null;
}

function moveMetric(id, toZone, beforeId){
  removeFromAllZones(id);

  const list = ZONES[toZone];
  if(!beforeId) list.push(id);
  else{
    const idx = list.indexOf(beforeId);
    if(idx === -1) list.push(id);
    else list.splice(idx, 0, id);
  }

  saveZones();
  renderAllZones();
  rerenderAllCards();
  renderSortUI();
}

function renderZone(el, zoneName){
  el.innerHTML = "";
  ZONES[zoneName].forEach(id => {
    const m = metricById(id);
    if(!m) return;

    const pill = document.createElement("div");
    pill.className = "metric-pill";
    pill.textContent = m.label;
    pill.draggable = true;
    pill.dataset.metricId = id;

    pill.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", id);
      e.dataTransfer.effectAllowed = "move";
    });

    el.appendChild(pill);
  });
}

function attachZoneDrop(zoneListEl, zoneName){
  const zoneBox = zoneListEl.parentElement;

  zoneBox.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });

  zoneBox.addEventListener("drop", (e) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if(!draggedId) return;

    const beforeId = getBeforeIdInZone(zoneListEl, e.clientX, e.clientY);
    moveMetric(draggedId, zoneName, beforeId);
  });
}

function renderAllZones(){
  ZONES = sanitizeZones(ZONES);
  renderZone(metricsPoolZone, "pool");
  renderZone(metricsCenterZone, "center");
  renderZone(metricsTableZone, "table");
  renderZone(metricsHiddenZone, "hidden");
}

metricsResetBtn?.addEventListener("click", () => {
  ZONES = structuredCloneSafe(DEFAULT_ZONES);
  saveZones();
  renderAllZones();
  rerenderAllCards();
  renderSortUI();
});

/* =========================
   Sort (multi rules on CENTER metrics)
========================= */
let sortRules = [];

function saveSortRules(){
  localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sortRules));
}
function loadSortRules(){
  try{
    const raw = localStorage.getItem(SORT_STORAGE_KEY);
    sortRules = raw ? JSON.parse(raw) : [];
    if(!Array.isArray(sortRules)) sortRules = [];
  }catch{
    sortRules = [];
  }
}

function getCenterMetricOptions(){
  return ZONES.center
    .map(id => metricById(id))
    .filter(Boolean)
    .map(m => ({ id: m.id, label: m.label, sourceKey: m.sourceKey }));
}

function renderSortUI(){
  if(!sortControls) return;

  const options = getCenterMetricOptions();
  sortControls.innerHTML = "";

  if (!options.length){
    const div = document.createElement("div");
    div.style.fontSize = "11px";
    div.style.color = "#6b7280";
    div.textContent = "真ん中枠に指標がありません。プールから真ん中枠へドラッグするとソートできます。";
    sortControls.appendChild(div);
    return;
  }

  if (!sortRules.length){
    sortRules = [{ metricId: options[0].id, dir: "desc" }];
    saveSortRules();
  }

  sortRules.forEach((rule, idx) => {
    const row = document.createElement("div");
    row.className = "sort-row";

    const sel = document.createElement("select");
    options.forEach(o => {
      const op = document.createElement("option");
      op.value = o.id;
      op.textContent = o.label;
      sel.appendChild(op);
    });
    sel.value = rule.metricId;

    const dir = document.createElement("select");
    dir.className = "sort-dir";
    dir.innerHTML = `
      <option value="desc">高い順</option>
      <option value="asc">低い順</option>
    `;
    dir.value = rule.dir;

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "削除";
    del.addEventListener("click", () => {
      sortRules.splice(idx, 1);
      saveSortRules();
      renderSortUI();
    });

    sel.addEventListener("change", () => {
      rule.metricId = sel.value;
      saveSortRules();
    });
    dir.addEventListener("change", () => {
      rule.dir = dir.value;
      saveSortRules();
    });

    row.appendChild(sel);
    row.appendChild(dir);
    row.appendChild(del);
    sortControls.appendChild(row);
  });
}

function applyCardSort(){
  if (cardState.size <= 1) return;

  const opts = getCenterMetricOptions();
  const optById = new Map(opts.map(o => [o.id, o]));

  const rules = sortRules
    .map(r => ({ ...r, opt: optById.get(r.metricId) }))
    .filter(r => r.opt);

  if (!rules.length) return;

  const cards = [...cardState.values()];

  cards.sort((A, B) => {
    for (const r of rules){
      const aRaw = A.data?.[r.opt.sourceKey];
      const bRaw = B.data?.[r.opt.sourceKey];

      const a = toSortableNumber(aRaw);
      const b = toSortableNumber(bRaw);

      const aNan = Number.isNaN(a);
      const bNan = Number.isNaN(b);
      if (aNan && bNan) continue;
      if (aNan) return 1;
      if (bNan) return -1;

      if (a === b) continue;
      return (r.dir === "asc") ? (a - b) : (b - a);
    }
    return 0;
  });

  const frag = document.createDocumentFragment();
  cards.forEach(c => frag.appendChild(c.el));
  itemsContainer.appendChild(frag);
}

addSortRuleBtn?.addEventListener("click", () => {
  const opts = getCenterMetricOptions();
  if (!opts.length) return alert("真ん中枠に指標を入れてください");
  sortRules.push({ metricId: opts[0].id, dir: "desc" });
  saveSortRules();
  renderSortUI();
});

applySortBtn?.addEventListener("click", () => applyCardSort());

clearSortBtn?.addEventListener("click", () => {
  sortRules = [];
  saveSortRules();
  renderSortUI();
});

/* =========================
   Center/Table rendering
========================= */
function buildCenterMetrics(container, data){
  container.innerHTML = "";
  const ids = ZONES.center;

  if(!ids.length){
    const row = document.createElement("div");
    row.className = "center-row";
    row.innerHTML = `<div style="color:#6b7280;font-weight:900;">未設定</div>
                     <div style="color:#9ca3af;font-weight:800;">プールからドラッグ</div>`;
    container.appendChild(row);
    return;
  }

  ids.forEach(id => {
    const m = metricById(id);
    if(!m) return;

    const row = document.createElement("center-row");
    row.className = "center-row";

    const l = document.createElement("div");
    l.className = "center-row-label";
    l.textContent = m.label;

    const v = document.createElement("div");
    v.className = "center-row-value";

    const raw = (data && data[m.sourceKey] != null && data[m.sourceKey] !== "") ? data[m.sourceKey] : "－";

    if (m.id === "日本最安値" && raw !== "－") {
      const a = data["日本最安値_Amazon"] ?? "－";
      const y = data["日本最安値_yahoo"] ?? "－";
      const r = data["日本最安値_楽天"] ?? "－";

      const span = document.createElement("span");
      span.className = "has-tip";
      span.textContent = raw;
      span.setAttribute("data-tip", `Amazon　${a}\nyahoo　　${y}\n楽天　　　${r}`);
      v.appendChild(span);
    } else {
      v.textContent = raw;
    }

    row.appendChild(l);
    row.appendChild(v);
    container.appendChild(row);
  });
}

function buildTableColumnsFromZones(){
  return ZONES.table
    .map(metricId => metricById(metricId))
    .filter(Boolean)
    .map(m => ({ id: m.sourceKey, label: m.label, metricId: m.id }));
}

function buildDetailTable(tableEl, data, state){
  const headerRow = tableEl.querySelector("tr[data-role='header']");
  const bodyRow = tableEl.querySelector("tr[data-role='body']");
  headerRow.innerHTML = "";
  bodyRow.innerHTML = "";

  state.cols.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col.label;
    th.draggable = true;
    headerRow.appendChild(th);

    th.addEventListener("dragstart", () => { state.dragId = col.id; });
    th.addEventListener("dragover", (e) => { e.preventDefault(); th.classList.add("drag-over"); });
    th.addEventListener("dragleave", () => th.classList.remove("drag-over"));
    th.addEventListener("drop", (e) => {
      e.preventDefault();
      th.classList.remove("drag-over");
      const targetId = col.id;
      const src = state.cols.findIndex(c => c.id === state.dragId);
      const dst = state.cols.findIndex(c => c.id === targetId);
      if(src === -1 || dst === -1 || src === dst) return;

      const [moved] = state.cols.splice(src, 1);
      state.cols.splice(dst, 0, moved);
      state.dragId = null;

      buildDetailTable(tableEl, data, state);
    });
  });

  state.cols.forEach(col => {
    const td = document.createElement("td");
    const value = data[col.id];
    const raw = (value === undefined || value === "" || value === null) ? "－" : value;

    if(col.metricId === "日本最安値" && raw !== "－"){
      const a = data["日本最安値_Amazon"] ?? "－";
      const y = data["日本最安値_yahoo"] ?? "－";
      const r = data["日本最安値_楽天"] ?? "－";

      const span = document.createElement("span");
      span.className = "has-tip";
      span.textContent = raw;
      span.setAttribute("data-tip", `Amazon　${a}\nyahoo　　${y}\n楽天　　　${r}`);
      td.appendChild(span);
    }else{
      td.textContent = raw;
    }

    bodyRow.appendChild(td);
  });
}

function rerenderAllCards(){
  cardState.forEach((v) => {
    buildCenterMetrics(v.centerBox, v.data);
    v.state.cols = buildTableColumnsFromZones();
    buildDetailTable(v.tableEl, v.data, v.state);
  });
}

/* =========================
   Card creation
========================= */
function createProductCard(asin, data){
  const card = document.createElement("section");
  card.className = "product-card card";
  card.dataset.asin = asin;

  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <div class="card-title">ASIN: ${asin}</div>
      <button class="ghost-btn js-removeCard" type="button">この行を削除</button>
    </div>

    <div class="summary-row">
      <!-- LEFT -->
      <div class="summary-column">
        <div class="summary-left">
          <div class="summary-image-box">
            <img class="js-prodImage" alt="商品画像" />

            <div class="qty-row">
              <span>数量</span>
              <select class="js-qtySelect">
                <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                <option value="4">4</option><option value="5">5</option>
              </select>
            </div>

            <div class="price-row">
              <span>販売価格 ($)</span>
              <input class="js-sellPrice" type="number" step="0.01" placeholder="例: 39.99" />
            </div>

            <div class="cost-row">
              <span>仕入れ額 (￥)</span>
              <input class="js-costJpy" type="number" step="1" placeholder="例: 3700" />
            </div>

            <button class="cart-btn js-addCart" type="button">カートに入れる</button>
          </div>

          <div class="summary-basic">
            <div class="summary-title js-title"></div>

            <div class="basic-row"><div class="basic-label">ブランド</div><div class="basic-value js-brand"></div></div>
            <div class="basic-row"><div class="basic-label">評価</div><div class="basic-value js-rating"></div></div>
            <div class="basic-row"><div class="basic-label">ASIN</div><div class="basic-value js-asin"></div></div>
            <div class="basic-row"><div class="basic-label">各種ASIN</div><div class="basic-value js-asins"></div></div>
            <div class="basic-row"><div class="basic-label">JAN</div><div class="basic-value js-jan"></div></div>
            <div class="basic-row"><div class="basic-label">SKU</div><div class="basic-value js-sku"></div></div>
            <div class="basic-row"><div class="basic-label">サイズ</div><div class="basic-value js-size"></div></div>
            <div class="basic-row"><div class="basic-label">重量（容積重量）</div><div class="basic-value js-weight"></div></div>
            <div class="basic-row"><div class="basic-label">材質</div><div class="basic-value js-material"></div></div>
            <div class="basic-row">
              <div class="basic-label">カテゴリ</div>
              <div class="basic-value"><span class="js-catP"></span> / <span class="js-catC"></span></div>
            </div>
            <div class="basic-row">
              <div class="basic-label">注意事項</div>
              <div class="basic-value js-warning"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- CENTER -->
      <div class="summary-column">
        <div style="font-size:12px;font-weight:900;margin-bottom:6px;">主要指標</div>
        <div class="js-center"></div>
        <div style="margin-top:8px;font-size:10px;color:#6b7280;font-weight:800;">
          ※ 値はダミーデータ（実運用はAPI/シート連携）
        </div>
      </div>

      <!-- RIGHT -->
      <div class="summary-column">
        <div class="summary-right">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <div style="font-size:12px;font-weight:900;color:#1d4ed8;">グラフ（180日）</div>
            <div style="display:flex;gap:6px;">
              <button class="graph-switch-btn active js-btnMes" type="button">MES-AI-A</button>
              <button class="graph-switch-btn js-btnKeepa" type="button">Keepa</button>
            </div>
          </div>

          <div class="graph-options js-graphOptions">
            <label><input type="checkbox" class="js-chkDS" checked />《需要＆供給》</label>
            <label><input type="checkbox" class="js-chkSP" />《供給＆価格》</label>
          </div>

          <div class="graph-body">
            <div class="graph-canvas-wrap js-mesWrap">
              <canvas class="js-chart"></canvas>
            </div>
            <div class="keepa-wrap js-keepaWrap" style="display:none;">
              <iframe class="js-keepaFrame" src="" frameborder="0" loading="lazy"></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="detail-wrap">
      <div style="padding:10px 12px;font-weight:900;font-size:12px;border-bottom:1px solid #e5e7eb;background:#f9fafb;">
        下段テーブル（その他の指標）
        <span style="font-weight:800;color:#6b7280;font-size:11px;margin-left:8px;">
          指標プールで「下段テーブル」に入れた項目が列になります
        </span>
      </div>
      <div class="detail-scroll">
        <table class="detail-table js-detailTable">
          <thead><tr data-role="header"></tr></thead>
          <tbody><tr data-role="body"></tr></tbody>
        </table>
      </div>
    </div>
  `;

  /* remove card */
  card.querySelector(".js-removeCard").addEventListener("click", () => {
    if(cart.has(asin)){
      cart.delete(asin);
      updateCartSummary();
    }
    const st = cardState.get(asin);
    try{ st?.chart?.destroy(); }catch{}
    cardState.delete(asin);
    card.remove();

    if(cardState.size === 0){
      emptyState.style.display = "block";
    }
  });

  /* base fill */
  const img = card.querySelector(".js-prodImage");
  img.src = data["商品画像"] || "";
  img.onerror = () => { img.style.display = "none"; };

  card.querySelector(".js-title").textContent = data["品名"] || "";
  card.querySelector(".js-brand").textContent = data["ブランド"] || "";
  card.querySelector(".js-rating").textContent = data["レビュー評価"] || "";
  card.querySelector(".js-asin").textContent = asin;

  const jpAsin = data["日本ASIN"] || "－";
  const usAsin = data["アメリカASIN"] || asin;
  card.querySelector(".js-asins").textContent = `日本: ${jpAsin} / US: ${usAsin}`;

  card.querySelector(".js-jan").textContent = data["JAN"] || "－";
  card.querySelector(".js-sku").textContent = data["SKU"] || "－";
  card.querySelector(".js-size").textContent = data["サイズ"] || "－";

  // ★重量：データ側は「重量kg」
  const realW = data["重量kg"] ?? data["重量（kg）"] ?? data["重量（kg)"] ?? data["重量"] ?? "";
  const volW  = data["容積重量"] ?? "";
  const realWText = realW ? fmtKg(realW) : "－";
  const volWText  = volW ? fmtKg(volW) : "－";
  card.querySelector(".js-weight").textContent = `${realWText}（${volWText}）`;

  card.querySelector(".js-material").textContent = data["材質"] || "－";
  card.querySelector(".js-catP").textContent = data["親カテゴリ"] || "－";
  card.querySelector(".js-catC").textContent = data["サブカテゴリ"] || "－";
  renderWarningTags(card.querySelector(".js-warning"), data["注意事項（警告系）"]);

  /* default price & cost */
  const sellPriceInput = card.querySelector(".js-sellPrice");
  const costJpyInput = card.querySelector(".js-costJpy");

  if (data["販売額（ドル）"]) {
    const s = String(data["販売額（ドル）"]).replace(/[^\d.]/g, "");
    if (s) sellPriceInput.value = s;
  }
  if (data["仕入れ目安単価"]) {
    const c = String(data["仕入れ目安単価"]).replace(/[^\d]/g, "");
    if (c) costJpyInput.value = c;
  }

  /* cart */
  const qtySelect = card.querySelector(".js-qtySelect");
  card.querySelector(".js-addCart").addEventListener("click", () => {
    const qty = Math.max(1, Number(qtySelect.value || 1));
    const sellUSD = num(sellPriceInput.value);
    const costJPY = num(costJpyInput.value);

    if (sellUSD <= 0) return alert("販売価格（$）を入力してください");
    if (costJPY <= 0) return alert("仕入れ額（￥）を入力してください");

    cart.set(asin, { qty, sellUSD, costJPY });
    updateCartSummary();
  });

  /* center + table */
  const centerBox = card.querySelector(".js-center");
  buildCenterMetrics(centerBox, data);

  const state = { cols: buildTableColumnsFromZones(), dragId: null };
  const tableEl = card.querySelector(".js-detailTable");
  buildDetailTable(tableEl, data, state);

  /* chart */
  const canvas = card.querySelector(".js-chart");
  const chart = renderChart(canvas, asin);

  const chkDS = card.querySelector(".js-chkDS");
  const chkSP = card.querySelector(".js-chkSP");
  const refreshVis = () => updateChartVisibility(chart, chkDS.checked, chkSP.checked);

  chkDS.addEventListener("change", refreshVis);
  chkSP.addEventListener("change", refreshVis);
  updateChartVisibility(chart, true, false);

  /* keepa switch */
  const btnMes = card.querySelector(".js-btnMes");
  const btnKeepa = card.querySelector(".js-btnKeepa");
  const mesWrap = card.querySelector(".js-mesWrap");
  const keepaWrap = card.querySelector(".js-keepaWrap");
  const keepaFrame = card.querySelector(".js-keepaFrame");
  const graphOptions = card.querySelector(".js-graphOptions");

  function setMode(mode){
    if(mode === "MES"){
      btnMes.classList.add("active");
      btnKeepa.classList.remove("active");
      graphOptions.style.display = "flex";
      mesWrap.style.display = "block";
      keepaWrap.style.display = "none";
    }else{
      btnKeepa.classList.add("active");
      btnMes.classList.remove("active");
      graphOptions.style.display = "none";
      mesWrap.style.display = "none";
      keepaWrap.style.display = "block";
      keepaFrame.src = `https://keepa.com/#!product/1-${asin}`;
    }
  }
  btnMes.addEventListener("click", () => setMode("MES"));
  btnKeepa.addEventListener("click", () => setMode("KEEPA"));

  /* store */
  cardState.set(asin, { el: card, data, chart, state, centerBox, tableEl });
  return card;
}

/* =========================
   Add/clear cards
========================= */
function addAsin(asin){
  const a = String(asin || "").trim().toUpperCase();
  if(!a) return;

  const data = window.ASIN_DATA?.[a];
  if(!data) return alert(`ASIN「${a}」のデータがありません`);

  if(cardState.has(a)){
    cardState.get(a).el.scrollIntoView({ behavior:"smooth", block:"start" });
    return;
  }

  const card = createProductCard(a, data);
  itemsContainer.appendChild(card);

  emptyState.style.display = "none";
  card.scrollIntoView({ behavior:"smooth", block:"start" });

  if(sortRules.length) applyCardSort();
}

function clearAllCards(){
  itemsContainer.innerHTML = "";
  cardState.forEach(v => { try{ v.chart.destroy(); }catch{} });
  cardState.clear();
  emptyState.style.display = "block";
}

clearCardsBtn?.addEventListener("click", clearAllCards);

clearCartBtn?.addEventListener("click", () => {
  cart.clear();
  updateCartSummary();
});

/* =========================
   Catalog
========================= */
function initCatalog(){
  const asins = Object.keys(window.ASIN_DATA || {});
  if(headerStatus) headerStatus.textContent = `登録ASIN数：${asins.length}件`;

  if(!asinCatalog) return;
  asinCatalog.innerHTML = "";

  if(!asins.length) return;

  const label = document.createElement("span");
  label.textContent = "データがあるASIN：";
  label.style.background = "transparent";
  label.style.cursor = "default";
  label.style.fontWeight = "900";
  label.style.border = "none";
  label.style.padding = "0";
  asinCatalog.appendChild(label);

  asins.forEach(a => {
    const pill = document.createElement("span");
    pill.textContent = a;
    pill.addEventListener("click", () => addAsin(a));
    asinCatalog.appendChild(pill);
  });
}

/* =========================
   Collapse metrics bar
========================= */
function initCollapse(){
  if(!metricsBarEl || !metricsCollapseBtn) return;

  if (METRICS_COLLAPSED) {
    metricsBarEl.classList.add("collapsed");
    metricsCollapseBtn.textContent = "広げる";
  } else {
    metricsCollapseBtn.textContent = "折りたたむ";
  }

  metricsCollapseBtn.addEventListener("click", () => {
    METRICS_COLLAPSED = !METRICS_COLLAPSED;
    localStorage.setItem(METRICS_COLLAPSE_KEY, METRICS_COLLAPSED ? "1" : "0");
    metricsBarEl.classList.toggle("collapsed", METRICS_COLLAPSED);
    metricsCollapseBtn.textContent = METRICS_COLLAPSED ? "広げる" : "折りたたむ";
  });
}

/* =========================
   Boot (★ここが重要：ASINが消える問題の根本修正)
========================= */
function bootApp(){
  // DnD attach
  attachZoneDrop(metricsPoolZone, "pool");
  attachZoneDrop(metricsCenterZone, "center");
  attachZoneDrop(metricsTableZone, "table");
  attachZoneDrop(metricsHiddenZone, "hidden");

  renderAllZones();

  loadSortRules();
  renderSortUI();

  initCollapse();
  initCatalog();        // ← ASINクリック場所はここで生成
  updateCartSummary();

  // buttons not wired earlier
  metricsResetBtn?.addEventListener("click", () => {
    ZONES = structuredCloneSafe(DEFAULT_ZONES);
    saveZones();
    renderAllZones();
    rerenderAllCards();
    renderSortUI();
  });
}

// DOMContentLoadedが既に終わっている環境でも確実に起動させる
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootApp);
} else {
  bootApp();
}
