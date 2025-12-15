/* ========= DOM参照 ========= */
const asinInput = document.getElementById("asinInput");
const loadBtn = document.getElementById("loadBtn");
const headerStatus = document.getElementById("headerStatus");
const asinCatalog = document.getElementById("asinCatalog");

const summaryCard = document.getElementById("summaryCard");
const placeholderCard = document.getElementById("placeholder");
const detailCard = document.getElementById("detailCard");

const prodImage = document.getElementById("prodImage");
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

const chkDemandSupply = document.getElementById("chkDemandSupply");
const chkSupplyPrice = document.getElementById("chkSupplyPrice");
const mainChartCanvas = document.getElementById("mainChart");
let mainChartInstance = null;

const detailHeaderRow = document.getElementById("detailHeaderRow");
const detailBodyRow   = document.getElementById("detailBodyRow");
const detailHiddenBar = document.getElementById("detailHiddenBar");

/* 指標プール */
const metricsPoolZone   = document.getElementById("metricsPoolZone");
const metricsCenterZone = document.getElementById("metricsCenterZone");
const metricsTableZone  = document.getElementById("metricsTableZone");
const metricsHiddenZone = document.getElementById("metricsHiddenZone");
const metricsResetBtn   = document.getElementById("metricsResetBtn");

let lastDetailData = null;

/* ========= 注意事項タグ ========= */
function renderWarningTags(container, rawText) {
  container.innerHTML = "";
  const text = (rawText || "").trim();
  if (!text) { container.textContent = "－"; return; }

  const tags = [];
  const pushIfIncluded = (keyword, className) => {
    if (text.includes(keyword)) tags.push({ label: keyword, cls: className });
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

/* ========= 需給チャート用：疑似乱数 ========= */
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
        { label: "ランキング（小さいほど上位）", data: series.ranking, borderWidth: 3, pointRadius: 0, tension: 0.25, borderColor: "#60a5fa", yAxisID: "yRank" },
        { label: "セラー数", data: series.sellers, borderWidth: 3, pointRadius: 0, tension: 0.25, borderColor: "#22c55e", yAxisID: "ySeller" },
        { label: "価格（USD）", data: series.price, borderWidth: 3, pointRadius: 0, tension: 0.25, borderColor: "#f97316", yAxisID: "yPrice" }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      spanGaps: true,
      layout: { padding: { left: 0, right: 4, top: 2, bottom: 4 } },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top", labels: { font: { size: 9 }, boxWidth: 20, boxHeight: 9, padding: 6 } },
        tooltip: {
          titleFont: { size: 10 }, bodyFont: { size: 10 },
          callbacks: {
            label: (ctx) => ctx.dataset.yAxisID === "yPrice"
              ? `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`
              : `${ctx.dataset.label}: ${ctx.parsed.y}`
          }
        }
      },
      scales: {
        x: { ticks: { font: { size: 9 }, maxTicksLimit: 9 }, grid: { display: false } },
        yRank: { reverse: true, title: { display: true, text: "ランキング", font: { size: 9 } }, ticks: { font: { size: 9 } }, grid: { drawBorder: false } },
        ySeller: { position: "right", title: { display: true, text: "セラー数", font: { size: 9 } }, ticks: { font: { size: 9 } }, grid: { drawOnChartArea: false, drawBorder: false } },
        yPrice: { position: "right", offset: true, title: { display: true, text: "価格(USD)", font: { size: 9 } }, ticks: { font: { size: 9 } }, grid: { drawOnChartArea: false, drawBorder: false } }
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

/* ========= 指標D&D（プール→center/table/hidden + 枠内並び替え） ========= */

const METRICS_STORAGE_KEY = "MES_AI_METRICS_ZONES_V2";

/* 左枠にある項目はプールに入れない前提（ここに含めない） */
const METRICS_ALL = [
  { id: "FBA最安値",         label: "FBA最安値",               sourceKey: "FBA最安値" },
  { id: "過去3月FBA最安値",   label: "過去3ヶ月FBA最安値",       sourceKey: "過去3月FBA最安値" },
  { id: "粗利益率予測",       label: "粗利益率予測",             sourceKey: "粗利益率予測" },
  { id: "粗利益予測",         label: "粗利益額（1個あたり）",     sourceKey: "粗利益予測" },
  { id: "予測30日販売数",     label: "予測30日販売数",           sourceKey: "予測30日販売数" },

  { id: "30日販売数",         label: "30日販売数（実績）",       sourceKey: "30日販売数" },
  { id: "90日販売数",         label: "90日販売数（実績）",       sourceKey: "90日販売数" },
  { id: "180日販売数",        label: "180日販売数（実績）",      sourceKey: "180日販売数" },

  { id: "在庫数",             label: "在庫数",                   sourceKey: "在庫数" },
  { id: "返品率",             label: "返品率",                   sourceKey: "返品率" },
  { id: "販売額（ドル）",     label: "販売額（USD）",            sourceKey: "販売額（ドル）" },
  { id: "入金額（円）",       label: "入金額（円）",             sourceKey: "入金額（円）" },
  { id: "入金額計（円）",     label: "入金額計（円）",           sourceKey: "入金額計（円）" },

  { id: "仕入れ目安単価",     label: "仕入れ目安単価",           sourceKey: "仕入れ目安単価" },
  { id: "仕入合計",           label: "仕入合計",                 sourceKey: "仕入合計" },
  { id: "仕入計",             label: "仕入計",                   sourceKey: "仕入計" },

  { id: "複数在庫指数45日分", label: "複数在庫指数（45日）",      sourceKey: "複数在庫指数45日分" },
  { id: "複数在庫指数60日分", label: "複数在庫指数（60日）",      sourceKey: "複数在庫指数60日分" },
  { id: "ライバル偏差1",      label: "ライバル偏差×1",           sourceKey: "ライバル偏差1" },
  { id: "ライバル偏差2",      label: "ライバル偏差×2",           sourceKey: "ライバル偏差2" },
  { id: "ライバル増加率",     label: "ライバル増加率",           sourceKey: "ライバル増加率" },

  { id: "大型",               label: "大型判定",                 sourceKey: "大型" },
  { id: "請求重量",           label: "請求重量",                 sourceKey: "請求重量" },
  { id: "容積重量",           label: "容積重量",                 sourceKey: "容積重量" },
  { id: "サイズ感",           label: "サイズ感",                 sourceKey: "サイズ感" },

  { id: "想定送料",           label: "想定送料",                 sourceKey: "想定送料" },
  { id: "送料",               label: "送料",                     sourceKey: "送料" },
  { id: "関税",               label: "関税",                     sourceKey: "関税" },

  { id: "Keepaリンク",        label: "Keepa（リンク）",          sourceKey: "Keepaリンク" }
];

const DEFAULT_ZONES = {
  pool:   ["90日販売数","180日販売数","複数在庫指数45日分","複数在庫指数60日分","ライバル偏差1","ライバル偏差2","ライバル増加率","入金額計（円）","仕入合計","仕入計","サイズ感","容積重量","請求重量","送料","Keepaリンク"],
  center: ["FBA最安値","過去3月FBA最安値","粗利益率予測","粗利益予測","予測30日販売数"],
  table:  ["30日販売数","在庫数","返品率","販売額（ドル）","入金額（円）","仕入れ目安単価","想定送料","関税","大型"],
  hidden: []
};

function loadZones() {
  try {
    const raw = localStorage.getItem(METRICS_STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_ZONES);
    const parsed = JSON.parse(raw);

    // 破損防止：必要キーがない場合はデフォルト
    const zones = { pool:[], center:[], table:[], hidden:[] };
    ["pool","center","table","hidden"].forEach(k => zones[k] = Array.isArray(parsed[k]) ? parsed[k] : []);

    // 追加された指標があれば pool に入れる
    const allIds = METRICS_ALL.map(m => m.id);
    const used = new Set([...zones.pool, ...zones.center, ...zones.table, ...zones.hidden]);
    allIds.forEach(id => { if (!used.has(id)) zones.pool.push(id); });

    // 存在しないIDは除外
    Object.keys(zones).forEach(k => zones[k] = zones[k].filter(id => allIds.includes(id)));

    return zones;
  } catch {
    return structuredClone(DEFAULT_ZONES);
  }
}
function saveZones() {
  localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(ZONES));
}
let ZONES = loadZones();

function metricById(id) {
  return METRICS_ALL.find(m => m.id === id);
}

function renderZone(el, zoneName) {
  el.innerHTML = "";
  ZONES[zoneName].forEach(id => {
    const m = metricById(id);
    if (!m) return;

    const pill = document.createElement("div");
    pill.className = "metric-pill";
    pill.textContent = m.label;
    pill.draggable = true;
    pill.dataset.metricId = id;
    pill.dataset.zone = zoneName;

    pill.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", id);
      e.dataTransfer.effectAllowed = "move";
      pill.classList.remove("drop-before");
    });

    pill.addEventListener("dragover", (e) => {
      e.preventDefault();
      pill.classList.add("drop-before");
      e.dataTransfer.dropEffect = "move";
    });

    pill.addEventListener("dragleave", () => {
      pill.classList.remove("drop-before");
    });

    pill.addEventListener("drop", (e) => {
      e.preventDefault();
      pill.classList.remove("drop-before");
      const draggedId = e.dataTransfer.getData("text/plain");
      if (!draggedId || draggedId === id) return;

      moveMetric(draggedId, zoneName, id); // id の前に挿入
    });

    el.appendChild(pill);
  });
}

function renderAllZones() {
  renderZone(metricsPoolZone, "pool");
  renderZone(metricsCenterZone, "center");
  renderZone(metricsTableZone, "table");
  renderZone(metricsHiddenZone, "hidden");
}

function attachZoneDrop(el, zoneName) {
  // zone空白部分へドロップ（末尾に追加）
  const zoneBox = el.parentElement;

  zoneBox.addEventListener("dragover", (e) => {
    e.preventDefault();
    zoneBox.classList.add("metrics-zone-over");
    e.dataTransfer.dropEffect = "move";
  });

  zoneBox.addEventListener("dragleave", () => {
    zoneBox.classList.remove("metrics-zone-over");
  });

  zoneBox.addEventListener("drop", (e) => {
    e.preventDefault();
    zoneBox.classList.remove("metrics-zone-over");
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId) return;
    moveMetric(draggedId, zoneName, null); // 末尾
  });
}

function removeFromAllZones(id) {
  Object.keys(ZONES).forEach(z => {
    const idx = ZONES[z].indexOf(id);
    if (idx >= 0) ZONES[z].splice(idx, 1);
  });
}

/**
 * 指標を移動
 * @param {string} id - 移動する指標ID
 * @param {string} toZone - 移動先ゾーン
 * @param {string|null} beforeId - このIDの前に挿入（nullなら末尾）
 */
function moveMetric(id, toZone, beforeId) {
  removeFromAllZones(id);

  const list = ZONES[toZone];
  if (!beforeId) {
    list.push(id);
  } else {
    const beforeIndex = list.indexOf(beforeId);
    if (beforeIndex === -1) list.push(id);
    else list.splice(beforeIndex, 0, id);
  }

  // 仕様：真ん中に置いたら下段には置けない → D&Dで単一配置なので自動で満たす
  saveZones();
  renderAllZones();
  applyMetricsLayout(lastDetailData);
}

metricsResetBtn.addEventListener("click", () => {
  ZONES = structuredClone(DEFAULT_ZONES);
  saveZones();
  renderAllZones();
  applyMetricsLayout(lastDetailData);
});

attachZoneDrop(metricsPoolZone, "pool");
attachZoneDrop(metricsCenterZone, "center");
attachZoneDrop(metricsTableZone, "table");
attachZoneDrop(metricsHiddenZone, "hidden");

/* ========= 真ん中枠へ反映 ========= */
function renderCenterMetrics(data) {
  centerMetricsContainer.innerHTML = "";
  const ids = ZONES.center;

  if (!ids.length) {
    const row = document.createElement("div");
    row.className = "center-row";
    row.innerHTML = `<div class="center-row-label">表示する指標が未設定です</div>
                     <div class="center-row-value" style="font-weight:400;color:#9ca3af;">上の指標プールからドラッグしてください</div>`;
    centerMetricsContainer.appendChild(row);
    return;
  }

  ids.forEach(id => {
    const m = metricById(id);
    if (!m) return;

    const row = document.createElement("div");
    row.className = "center-row";
    const label = document.createElement("div");
    label.className = "center-row-label";
    label.textContent = m.label;

    const value = document.createElement("div");
    value.className = "center-row-value";
    value.textContent = data ? (data[m.sourceKey] ?? "－") : "－";

    row.appendChild(label);
    row.appendChild(value);
    centerMetricsContainer.appendChild(row);
  });
}

/* ========= 下段テーブル：列定義 ========= */
/* 左枠にある項目（ブランド/ASIN/JAN/SKU/サイズ/重量/材質/カテゴリ/注意事項）は含めない */

const TABLE_ONLY_COLS = [
  { id: "複数在庫指数45日分", label: "複数在庫指数", sub:"45日分", visible:false },
  { id: "複数在庫指数60日分", label: "複数在庫指数", sub:"60日分", visible:false },
  { id: "ライバル偏差1",      label: "ライバル偏差", sub:"×1", visible:false },
  { id: "ライバル偏差2",      label: "ライバル偏差", sub:"×2", visible:false },
  { id: "ライバル増加率",     label: "ライバル増加率", sub:"", visible:false },
  { id: "粗利益",             label: "粗利益 実績", sub:"参考値", visible:false },
  { id: "仕入合計",           label: "仕入合計", sub:"1注文", visible:false },
  { id: "仕入計",             label: "仕入 計", sub:"その他含む", visible:false },
  { id: "サイズ感",           label: "サイズ感", sub:"S/M/L", visible:false },
  { id: "容積重量",           label: "容積重量", sub:"kg換算", visible:false },
  { id: "請求重量",           label: "請求重量", sub:"課金用", visible:false },
  { id: "送料",               label: "送料", sub:"実費", visible:false },
  { id: "Keepaリンク",        label: "Keepa", sub:"US Amazon", visible:true }
];

/* テーブル列状態 */
let detailColumns = [];     // 実表示用
let detailDragId = null;    // ヘッダドラッグ（既存の並び替え）

function buildDetailColumnsFromZones() {
  // table に置かれた指標順を先頭に
  const tableIds = ZONES.table;

  const metricCols = tableIds.map(id => {
    const m = metricById(id);
    if (!m) return null;
    // テーブルは「列名＝label」「値はsourceKey」
    return { id: m.sourceKey, metricId: m.id, label: m.label, sub:"", visible:true };
  }).filter(Boolean);

  // テーブル専用列（メトリクスと被るものは除外）
  const usedSourceKeys = new Set(metricCols.map(c => c.id));
  const tail = TABLE_ONLY_COLS
    .filter(c => !usedSourceKeys.has(c.id))
    .map(c => ({ ...c }));

  // 末尾に追加
  detailColumns = [...metricCols, ...tail];

  // hidden zone にあるものは列自体が出ない（＝tableIdsに入らないのでOK）
  // center zone にあるものも tableIdsに入らないのでOK
}

function visibleCols() {
  return detailColumns.filter(c => c.visible !== false);
}

function buildDetailHeader() {
  detailHeaderRow.innerHTML = "";

  visibleCols().forEach(col => {
    const th = document.createElement("th");
    th.dataset.colId = col.id;
    th.draggable = true;

    const inner = document.createElement("div");
    inner.className = "th-inner";

    const labelSpan = document.createElement("span");
    labelSpan.className = "th-label";
    labelSpan.textContent = col.label;
    inner.appendChild(labelSpan);

    if (col.sub) {
      const subSpan = document.createElement("span");
      subSpan.className = "th-sub";
      subSpan.textContent = col.sub;
      inner.appendChild(subSpan);
    }

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "th-toggle";
    toggleBtn.textContent = "−";
    toggleBtn.title = "この列を非表示";
    toggleBtn.addEventListener("click", (e)=> {
      e.stopPropagation();
      col.visible = false;
      rebuildDetailTable(lastDetailData);
    });
    inner.appendChild(toggleBtn);

    th.appendChild(inner);
    detailHeaderRow.appendChild(th);

    // 既存：ヘッダドラッグ並び替え（テーブル内の順）
    th.addEventListener("dragstart", e => {
      detailDragId = col.id;
      e.dataTransfer.effectAllowed = "move";
    });
    th.addEventListener("dragover", e => {
      e.preventDefault();
      th.classList.add("drag-over");
      e.dataTransfer.dropEffect = "move";
    });
    th.addEventListener("dragleave", ()=> th.classList.remove("drag-over"));
    th.addEventListener("drop", e => {
      e.preventDefault();
      th.classList.remove("drag-over");
      const targetId = col.id;
      if (!detailDragId || detailDragId === targetId) return;

      const srcIndex = detailColumns.findIndex(c=>c.id===detailDragId);
      const dstIndex = detailColumns.findIndex(c=>c.id===targetId);
      if (srcIndex === -1 || dstIndex === -1) return;

      const [moved] = detailColumns.splice(srcIndex,1);
      detailColumns.splice(dstIndex,0,moved);

      detailDragId = null;
      rebuildDetailTable(lastDetailData);
    });
  });
}

function renderDetailHiddenBar() {
  const hidden = detailColumns.filter(c => !c.visible);
  detailHiddenBar.innerHTML = "";
  if (!hidden.length) { detailHiddenBar.style.display = "none"; return; }

  detailHiddenBar.style.display = "flex";
  hidden.forEach(col => {
    const pill = document.createElement("div");
    pill.className = "detail-hidden-pill";
    pill.innerHTML = `<span>${col.label}</span>`;

    const btn = document.createElement("button");
    btn.textContent = "＋";
    btn.title = "この列を再表示";
    btn.addEventListener("click", ()=> {
      col.visible = true;
      rebuildDetailTable(lastDetailData);
    });

    pill.appendChild(btn);
    detailHiddenBar.appendChild(pill);
  });
}

function fillDetailRow(data) {
  detailBodyRow.innerHTML = "";
  if (!data) return;

  visibleCols().forEach(col => {
    const td = document.createElement("td");
    const value = data[col.id];

    // Keepaリンク扱い
    if (col.id === "Keepaリンク" && value) {
      const a = document.createElement("a");
      a.href = value;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "グラフを開く";
      td.appendChild(a);
    } else {
      td.textContent = (value === undefined || value === "" || value === null) ? "－" : value;
    }
    detailBodyRow.appendChild(td);
  });
}

function rebuildDetailTable(data) {
  lastDetailData = data;
  buildDetailColumnsFromZones();
  buildDetailHeader();
  fillDetailRow(data);
  renderDetailHiddenBar();
}

/* ========= 指標レイアウト反映 ========= */
function applyMetricsLayout(data) {
  if (!data) data = lastDetailData;
  renderCenterMetrics(data || {});
  rebuildDetailTable(data || {});
}

/* ========= 詳細描画 ========= */
function renderDetail(asin, data) {
  prodImage.src = data["商品画像"] || "";
  prodImage.alt = data["品名"] || asin;

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
  basicWeight.textContent = data["重量kg"] || "－";
  basicMaterial.textContent = data["材質"] || "－";

  basicCatParent.textContent = data["親カテゴリ"] || "";
  basicCatChild.textContent = data["サブカテゴリ"] || "";

  renderWarningTags(basicWarning, data["注意事項（警告系）"]);

  summaryCard.style.display = "grid";
  placeholderCard.style.display = "none";

  applyMetricsLayout(data);
  detailCard.style.display = "block";

  renderChart(asin);
}

/* ========= ビュークリア ========= */
function clearViewWithMessage(msg) {
  summaryCard.style.display = "none";
  detailCard.style.display = "none";
  placeholderCard.style.display = "block";
  if (msg) {
    const p = placeholderCard.querySelector(".placeholder");
    if (p) p.textContent = msg;
  }
}

/* ========= ASINロード ========= */
function loadAsin() {
  const asin = asinInput.value.trim().toUpperCase();
  if (!asin) { clearViewWithMessage("ASINを入力してください。"); return; }

  const data = ASIN_DATA[asin];
  if (!data) {
    clearViewWithMessage(`ASIN「${asin}」のデータがありません。上部のラベルから登録済みASINを確認してください。`);
    return;
  }
  renderDetail(asin, data);
}

loadBtn.addEventListener("click", loadAsin);
asinInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); loadAsin(); }
});

/* ========= ASINカタログ ========= */
function initCatalog() {
  const asins = Object.keys(ASIN_DATA || {});
  headerStatus.textContent = `登録ASIN数：${asins.length}件`;
  asinCatalog.innerHTML = "";
  if (!asins.length) return;

  const label = document.createElement("span");
  label.className = "asin-catalog-label";
  label.textContent = "データがあるASIN：";
  asinCatalog.appendChild(label);

  asins.forEach(a => {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = a;
    pill.style.cursor = "pointer";
    pill.addEventListener("click", () => {
      asinInput.value = a;
      loadAsin();
    });
    asinCatalog.appendChild(pill);
  });
}

/* ========= 初期化 ========= */
initCatalog();
renderAllZones();
applyMetricsLayout({});
