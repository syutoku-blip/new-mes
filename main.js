/* =========================
   DOM
========================= */
const asinInput = document.getElementById("asinInput");
const loadBtn = document.getElementById("loadBtn");
const headerStatus = document.getElementById("headerStatus");
const asinCatalog = document.getElementById("asinCatalog");

const summaryCard = document.getElementById("summaryCard");
const placeholderCard = document.getElementById("placeholder");
const detailCard = document.getElementById("detailCard");

const prodImage = document.getElementById("prodImage");
const qtySelect = document.getElementById("qtySelect");
const sellPriceInput = document.getElementById("sellPriceInput");
const addToCartBtn = document.getElementById("addToCartBtn");

const basicTitle = document.getElementById("basicTitle");
const basicBrand = document.getElementById("basicBrand");
const basicRating = document.getElementById("basicRating");
const basicASIN = document.getElementById("basicASIN");
const basicAsinGroup = document.getElementById("basicAsinGroup");
const basicJAN = document.getElementById("basicJAN");
const basicSKU = document.getElementById("basicSKU");
const basicSize = document.getElementById("basicSize");
const basicWeight = document.getElementById("basicWeight");
const basicMaterial = document.getElementById("basicMaterial");
const basicCatParent = document.getElementById("basicCatParent");
const basicCatChild = document.getElementById("basicCatChild");
const basicWarning = document.getElementById("basicWarning");

const centerMetricsContainer = document.getElementById("centerMetricsContainer");

const btnMesGraph = document.getElementById("btnMesGraph");
const btnKeepaGraph = document.getElementById("btnKeepaGraph");
const graphOptions = document.getElementById("graphOptions");
const mesGraphWrap = document.getElementById("mesGraphWrap");
const keepaGraphWrap = document.getElementById("keepaGraphWrap");
const keepaIframe = document.getElementById("keepaIframe");

const chkDemandSupply = document.getElementById("chkDemandSupply");
const chkSupplyPrice = document.getElementById("chkSupplyPrice");
const mainChartCanvas = document.getElementById("mainChart");
let mainChartInstance = null;

const detailHeaderRow = document.getElementById("detailHeaderRow");
const detailBodyRow = document.getElementById("detailBodyRow");
const detailHiddenBar = document.getElementById("detailHiddenBar");

/* Metrics pool zones */
const metricsPoolZone = document.getElementById("metricsPoolZone");
const metricsCenterZone = document.getElementById("metricsCenterZone");
const metricsTableZone = document.getElementById("metricsTableZone");
const metricsHiddenZone = document.getElementById("metricsHiddenZone");
const metricsResetBtn = document.getElementById("metricsResetBtn");

let lastDetailData = null;

/* =========================
   Warning tags
========================= */
function renderWarningTags(container, rawText) {
  container.innerHTML = "";
  const text = (rawText || "").trim();
  if (!text) {
    container.textContent = "－";
    return;
  }

  const tags = [];
  const pushIfIncluded = (keyword, cls) => {
    if (text.includes(keyword)) tags.push({ label: keyword, cls });
  };

  pushIfIncluded("輸出不可", "warning-export-ban");
  pushIfIncluded("知財", "warning-ip");
  pushIfIncluded("大型", "warning-large");
  pushIfIncluded("出荷禁止", "warning-ship-ban");
  pushIfIncluded("承認要", "warning-approval");
  pushIfIncluded("バリエーション", "warning-variation");

  const wrap = document.createElement("div");
  wrap.className = "warning-tags";

  if (!tags.length) {
    const span = document.createElement("span");
    span.className = "warning-tag warning-plain";
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
   Chart (MES)
========================= */
function createPRNG(seedStr) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i);
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

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

function renderChart(asin) {
  const series = getDemandSupplySeries(asin);
  if (mainChartInstance) mainChartInstance.destroy();

  const ctx = mainChartCanvas.getContext("2d");
  mainChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: series.labels,
      datasets: [
        {
          label: "ランキング（小さいほど上位）",
          data: series.ranking,
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.25,
          borderColor: "#60a5fa",
          yAxisID: "yRank"
        },
        {
          label: "セラー数",
          data: series.sellers,
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.25,
          borderColor: "#22c55e",
          yAxisID: "ySeller"
        },
        {
          label: "価格（USD）",
          data: series.price,
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.25,
          borderColor: "#f97316",
          yAxisID: "yPrice"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          labels: { font: { size: 9 }, boxWidth: 18, boxHeight: 8, padding: 6 }
        },
        tooltip: {
          titleFont: { size: 10 },
          bodyFont: { size: 10 },
          callbacks: {
            label: (ctx) => {
              if (ctx.dataset.yAxisID === "yPrice") return `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`;
              return `${ctx.dataset.label}: ${ctx.parsed.y}`;
            }
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

  chkDemandSupply.checked = true;
  chkSupplyPrice.checked = false;
  updateChartVisibility();
}

function updateChartVisibility() {
  if (!mainChartInstance) return;

  const demandOn = chkDemandSupply.checked;
  const supplyOn = chkSupplyPrice.checked;

  const showRank = demandOn || (!demandOn && !supplyOn);
  const showSeller = demandOn || supplyOn;
  const showPrice = supplyOn;

  mainChartInstance.data.datasets[0].hidden = !showRank;
  mainChartInstance.data.datasets[1].hidden = !showSeller;
  mainChartInstance.data.datasets[2].hidden = !showPrice;
  mainChartInstance.update();
}

chkDemandSupply.addEventListener("change", updateChartVisibility);
chkSupplyPrice.addEventListener("change", updateChartVisibility);

/* =========================
   Graph switch (MES / Keepa)
========================= */
function setGraphMode(mode) {
  if (mode === "MES") {
    btnMesGraph.classList.add("active");
    btnKeepaGraph.classList.remove("active");
    graphOptions.style.display = "flex";
    mesGraphWrap.style.display = "block";
    keepaGraphWrap.style.display = "none";
  } else {
    btnKeepaGraph.classList.add("active");
    btnMesGraph.classList.remove("active");
    graphOptions.style.display = "none";
    mesGraphWrap.style.display = "none";
    keepaGraphWrap.style.display = "flex";
  }
}

btnMesGraph.addEventListener("click", () => setGraphMode("MES"));
btnKeepaGraph.addEventListener("click", () => {
  setGraphMode("KEEPA");
  const asin = (basicASIN.textContent || "").trim();
  if (asin) keepaIframe.src = `https://keepa.com/#!product/1-${asin}`;
});

/* =========================
   Cart
========================= */
addToCartBtn.addEventListener("click", () => {
  const asin = (basicASIN.textContent || "").trim();
  const qty = Number(qtySelect.value || 1);
  const price = Number(sellPriceInput.value || 0);

  if (!asin) return alert("ASINが未選択です");
  if (!price || price <= 0) return alert("販売価格（$）を入力してください");

  const payload = { asin, qty, price, total: +(qty * price).toFixed(2) };
  console.log("ADD_TO_CART", payload);
  alert(`カートに追加しました\nASIN: ${asin}\n数量: ${qty}\n価格: $${price}\n小計: $${payload.total}`);
});

/* =========================
   Metrics pool (DnD)
   ★Keepa削除 / サイズ感削除
========================= */
const METRICS_STORAGE_KEY = "MES_AI_METRICS_ZONES_V4";

/* 左枠にある項目はプールに出さない（=ここに含めない） */
const METRICS_ALL = [
  { id: "FBA最安値", label: "FBA最安値", sourceKey: "FBA最安値" },
  { id: "過去3月FBA最安値", label: "過去3ヶ月FBA最安値", sourceKey: "過去3月FBA最安値" },
  { id: "粗利益率予測", label: "粗利益率予測", sourceKey: "粗利益率予測" },
  { id: "粗利益予測", label: "粗利益予測（1個あたり）", sourceKey: "粗利益予測" },
  { id: "予測30日販売数", label: "予測30日販売数", sourceKey: "予測30日販売数" },

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

  { id: "大型", label: "大型判定", sourceKey: "大型" },
  { id: "請求重量", label: "請求重量", sourceKey: "請求重量" },
  /* 容積重量は左枠に表示するので「指標としては残すか？」→今回は残しておく（必要なら後で外せる） */
  { id: "容積重量", label: "容積重量", sourceKey: "容積重量" },

  { id: "想定送料", label: "想定送料", sourceKey: "想定送料" },
  { id: "送料", label: "送料", sourceKey: "送料" },
  { id: "関税", label: "関税", sourceKey: "関税" }

  /* ★Keepaリンク削除 */
  /* ★サイズ感削除 */
];

const DEFAULT_ZONES = {
  pool: [
    "90日販売数","180日販売数","複数在庫指数45日分","複数在庫指数60日分",
    "ライバル偏差1","ライバル偏差2","ライバル増加率",
    "入金額計（円）","仕入合計","仕入計","容積重量","請求重量","送料"
  ],
  center: ["FBA最安値","過去3月FBA最安値","粗利益率予測","粗利益予測","予測30日販売数"],
  table: ["30日販売数","在庫数","返品率","販売額（ドル）","入金額（円）","仕入れ目安単価","想定送料","関税","大型"],
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

function loadZones(){
  try{
    const raw = localStorage.getItem(METRICS_STORAGE_KEY);
    if(!raw) return structuredCloneSafe(DEFAULT_ZONES);
    return sanitizeZones(JSON.parse(raw));
  }catch{
    return structuredCloneSafe(DEFAULT_ZONES);
  }
}

function saveZones(){
  localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(ZONES));
}

let ZONES = loadZones();

function removeFromAllZones(id){
  ["pool","center","table","hidden"].forEach(z => {
    ZONES[z] = ZONES[z].filter(x => x !== id);
  });
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
  applyMetricsLayout(lastDetailData);
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

    pill.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", id);
      e.dataTransfer.effectAllowed = "move";
    });

    pill.addEventListener("dragover", (e) => {
      e.preventDefault();
      pill.classList.add("drop-before");
    });

    pill.addEventListener("dragleave", () => pill.classList.remove("drop-before"));

    pill.addEventListener("drop", (e) => {
      e.preventDefault();
      pill.classList.remove("drop-before");
      const draggedId = e.dataTransfer.getData("text/plain");
      if(!draggedId || draggedId === id) return;
      moveMetric(draggedId, zoneName, id);
    });

    el.appendChild(pill);
  });
}

function attachZoneDrop(listEl, zoneName){
  const zoneBox = listEl.parentElement;
  zoneBox.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });
  zoneBox.addEventListener("drop", (e) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if(!draggedId) return;
    moveMetric(draggedId, zoneName, null);
  });
}

function renderAllZones(){
  ZONES = sanitizeZones(ZONES);
  renderZone(metricsPoolZone, "pool");
  renderZone(metricsCenterZone, "center");
  renderZone(metricsTableZone, "table");
  renderZone(metricsHiddenZone, "hidden");
}

metricsResetBtn.addEventListener("click", () => {
  ZONES = structuredCloneSafe(DEFAULT_ZONES);
  saveZones();
  renderAllZones();
  applyMetricsLayout(lastDetailData);
});

/* =========================
   Center metrics render
========================= */
function renderCenterMetrics(data){
  centerMetricsContainer.innerHTML = "";
  const ids = ZONES.center;

  if(!ids.length){
    const row = document.createElement("div");
    row.className = "center-row";
    row.innerHTML = `<div class="center-row-label">表示する指標が未設定</div>
                     <div class="center-row-value" style="font-weight:700;color:#9ca3af;">上の指標プールからドラッグ</div>`;
    centerMetricsContainer.appendChild(row);
    return;
  }

  ids.forEach(id => {
    const m = metricById(id);
    if(!m) return;

    const row = document.createElement("div");
    row.className = "center-row";

    const l = document.createElement("div");
    l.className = "center-row-label";
    l.textContent = m.label;

    const v = document.createElement("div");
    v.className = "center-row-value";
    v.textContent = (data && data[m.sourceKey] != null && data[m.sourceKey] !== "") ? data[m.sourceKey] : "－";

    row.appendChild(l);
    row.appendChild(v);
    centerMetricsContainer.appendChild(row);
  });
}

/* =========================
   Table build
========================= */
let detailColumns = [];
let detailDragId = null;

function buildDetailColumnsFromZones(){
  const tableIds = ZONES.table;
  const cols = [];

  tableIds.forEach(metricId => {
    const m = metricById(metricId);
    if(!m) return;
    cols.push({ id: m.sourceKey, label: m.label, sub:"", visible:true });
  });

  const prev = new Map(detailColumns.map(c => [c.id, c.visible]));
  cols.forEach(c => { if(prev.has(c.id)) c.visible = prev.get(c.id); });

  detailColumns = cols;
}

function visibleCols(){ return detailColumns.filter(c => c.visible !== false); }

function buildDetailHeader(){
  detailHeaderRow.innerHTML = "";

  visibleCols().forEach(col => {
    const th = document.createElement("th");
    th.draggable = true;

    const inner = document.createElement("div");
    inner.className = "th-inner";

    const label = document.createElement("span");
    label.className = "th-label";
    label.textContent = col.label;
    inner.appendChild(label);

    const toggle = document.createElement("button");
    toggle.className = "th-toggle";
    toggle.textContent = "−";
    toggle.title = "この列を非表示";
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      col.visible = false;
      rebuildDetailTable(lastDetailData);
    });
    inner.appendChild(toggle);

    th.appendChild(inner);
    detailHeaderRow.appendChild(th);

    th.addEventListener("dragstart", () => { detailDragId = col.id; });
    th.addEventListener("dragover", (e) => { e.preventDefault(); th.classList.add("drag-over"); });
    th.addEventListener("dragleave", () => th.classList.remove("drag-over"));
    th.addEventListener("drop", (e) => {
      e.preventDefault();
      th.classList.remove("drag-over");
      const targetId = col.id;
      if(!detailDragId || detailDragId === targetId) return;

      const src = detailColumns.findIndex(c => c.id === detailDragId);
      const dst = detailColumns.findIndex(c => c.id === targetId);
      if(src === -1 || dst === -1) return;

      const [moved] = detailColumns.splice(src, 1);
      detailColumns.splice(dst, 0, moved);

      detailDragId = null;
      rebuildDetailTable(lastDetailData);
    });
  });
}

function renderDetailHiddenBar(){
  const hidden = detailColumns.filter(c => !c.visible);
  detailHiddenBar.innerHTML = "";
  if(!hidden.length){
    detailHiddenBar.style.display = "none";
    return;
  }
  detailHiddenBar.style.display = "flex";

  hidden.forEach(col => {
    const pill = document.createElement("div");
    pill.className = "detail-hidden-pill";
    pill.innerHTML = `<span>${col.label}</span>`;
    const btn = document.createElement("button");
    btn.textContent = "＋";
    btn.title = "この列を再表示";
    btn.addEventListener("click", () => {
      col.visible = true;
      rebuildDetailTable(lastDetailData);
    });
    pill.appendChild(btn);
    detailHiddenBar.appendChild(pill);
  });
}

function fillDetailRow(data){
  detailBodyRow.innerHTML = "";
  if(!data) return;

  visibleCols().forEach(col => {
    const td = document.createElement("td");
    const value = data[col.id];
    td.textContent = (value === undefined || value === "" || value === null) ? "－" : value;
    detailBodyRow.appendChild(td);
  });
}

function rebuildDetailTable(data){
  lastDetailData = data;
  buildDetailColumnsFromZones();
  buildDetailHeader();
  fillDetailRow(data);
  renderDetailHiddenBar();
}

/* =========================
   Apply metrics layout
========================= */
function applyMetricsLayout(data){
  renderCenterMetrics(data || {});
  rebuildDetailTable(data || {});
}

/* =========================
   Render detail view
   ★重量（容積重量）に変更
========================= */
function pickNumberLike(v){
  if(v == null) return "";
  const s = String(v).trim();
  if(!s) return "";
  return s.replace(/[^\d.]/g, "");
}
function fmtKg(v){
  const s = String(v ?? "").trim();
  if(!s) return "";
  return s.includes("kg") ? s : `${s}kg`;
}

function renderDetail(asin, data){
  prodImage.src = data["商品画像"] || "";
  basicTitle.textContent = data["品名"] || "";
  basicBrand.textContent = data["ブランド"] || "";
  basicRating.textContent = data["レビュー評価"] || "";
  basicASIN.textContent = asin;

  const jpAsin = data["日本ASIN"] || "－";
  const usAsin = data["アメリカASIN"] || asin;
  basicAsinGroup.textContent = `日本: ${jpAsin} / US: ${usAsin}`;

  basicJAN.textContent = data["JAN"] || "－";
  basicSKU.textContent = data["SKU"] || "－";
  basicSize.textContent = data["サイズ"] || "－";
  basicMaterial.textContent = data["材質"] || "－";
  basicCatParent.textContent = data["親カテゴリ"] || "";
  basicCatChild.textContent = data["サブカテゴリ"] || "";

  // ★ 重量（容積重量）表示： 実重量（容積重量）
  const realW = data["重量（kg）"] ?? data["重量kg"] ?? data["重量"] ?? "";
  const volW  = data["容積重量"] ?? "";
  const realWText = realW ? fmtKg(realW) : "－";
  const volWText  = volW ? fmtKg(volW) : "－";
  basicWeight.textContent = `${realWText}（${volWText}）`;

  renderWarningTags(basicWarning, data["注意事項（警告系）"]);

  // 販売価格デフォルト（任意）
  const defaultPrice = data["販売額（ドル）"];
  if (defaultPrice && !sellPriceInput.value) {
    const num = pickNumberLike(defaultPrice);
    if (num) sellPriceInput.value = num;
  }

  summaryCard.style.display = "grid";
  placeholderCard.style.display = "none";
  detailCard.style.display = "block";

  applyMetricsLayout(data);

  setGraphMode("MES");
  renderChart(asin);
}

function clearView(msg){
  summaryCard.style.display = "none";
  detailCard.style.display = "none";
  placeholderCard.style.display = "block";
  if(msg){
    const body = placeholderCard.querySelector(".card-body");
    if(body) body.textContent = msg;
  }
}

function loadAsin(){
  const asin = asinInput.value.trim().toUpperCase();
  if(!asin) return clearView("ASINを入力してください。");
  const data = ASIN_DATA?.[asin];
  if(!data) return clearView(`ASIN「${asin}」のデータがありません。上のラベルから登録済みASINを確認してください。`);
  renderDetail(asin, data);
}

loadBtn.addEventListener("click", loadAsin);
asinInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter"){ e.preventDefault(); loadAsin(); }
});

/* =========================
   Catalog（ASIN表示の詰まり修正はCSSでも対応）
========================= */
function initCatalog(){
  const asins = Object.keys(ASIN_DATA || {});
  headerStatus.textContent = `登録ASIN数：${asins.length}件`;

  asinCatalog.innerHTML = "";
  if(!asins.length) return;

  const label = document.createElement("span");
  label.className = "asin-catalog-label";
  label.textContent = "データがあるASIN：";
  asinCatalog.appendChild(label);

  asins.forEach(a => {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = a;
    pill.addEventListener("click", () => {
      asinInput.value = a;
      loadAsin();
    });
    asinCatalog.appendChild(pill);
  });
}

/* =========================
   Init
========================= */
document.addEventListener("DOMContentLoaded", () => {
  attachZoneDrop(metricsPoolZone, "pool");
  attachZoneDrop(metricsCenterZone, "center");
  attachZoneDrop(metricsTableZone, "table");
  attachZoneDrop(metricsHiddenZone, "hidden");

  renderAllZones();
  initCatalog();
});
