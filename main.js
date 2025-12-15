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

/* カスタマイズUI */
const openMetricsConfigBtn = document.getElementById("openMetricsConfigBtn");
const metricsConfigPanel = document.getElementById("metricsConfigPanel");
const metricsConfigClose = document.getElementById("metricsConfigClose");
const metricsResetBtn = document.getElementById("metricsResetBtn");
const metricsCenterZone = document.getElementById("metricsCenterZone");
const metricsTableZone = document.getElementById("metricsTableZone");
const metricsHiddenZone = document.getElementById("metricsHiddenZone");

let mainChartInstance = null;
let lastDetailData = null;

/* ========= 疑似乱数 ========= */
function createPRNG(seedStr) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i);
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/* ========= 180日分のランキング・セラー数・価格 ========= */
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

/* ========= グラフ描画 ========= */
function renderChart(asin) {
  const series = getDemandSupplySeries(asin);

  if (mainChartInstance) {
    mainChartInstance.destroy();
  }

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
      spanGaps: true,
      layout: {
        padding: { left: 0, right: 4, top: 2, bottom: 4 }
      },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          labels: {
            font: { size: 9 },
            boxWidth: 20,
            boxHeight: 9,
            padding: 6
          }
        },
        tooltip: {
          titleFont: { size: 10 },
          bodyFont: { size: 10 },
          callbacks: {
            label: (ctx) => {
              if (ctx.dataset.yAxisID === "yPrice") {
                return `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`;
              }
              return `${ctx.dataset.label}: ${ctx.parsed.y}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { font: { size: 9 }, maxTicksLimit: 9 },
          grid: { display: false }
        },
        yRank: {
          reverse: true,
          title: { display: true, text: "ランキング", font: { size: 9 } },
          ticks: { font: { size: 9 } },
          grid: { drawBorder: false }
        },
        ySeller: {
          position: "right",
          title: { display: true, text: "セラー数", font: { size: 9 } },
          ticks: { font: { size: 9 } },
          grid: { drawOnChartArea: false, drawBorder: false }
        },
        yPrice: {
          position: "right",
          offset: true,
          title: { display: true, text: "価格(USD)", font: { size: 9 } },
          ticks: { font: { size: 9 } },
          grid: { drawOnChartArea: false, drawBorder: false }
        }
      }
    }
  });

  chkDemandSupply.checked = true;
  chkSupplyPrice.checked = false;
  updateChartVisibility();
}

/* ========= グラフ線表示切替 ========= */
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

/* ========= 注意事項タグ ========= */
function renderWarningTags(container, rawText) {
  container.innerHTML = "";
  const text = (rawText || "").trim();
  if (!text) {
    container.textContent = "－";
    return;
  }

  const tags = [];
  const pushIfIncluded = (keyword, className) => {
    if (text.includes(keyword)) {
      tags.push({ label: keyword, cls: className });
    }
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

/* ========= 指標カスタマイズ（真ん中 / 下段） ========= */

const METRICS_STORAGE_KEY = "MES_AI_METRICS_V1";

/* 左の枠にある項目は除外していることに注意 */
const METRICS_DEFAULT = [
  // 主に利益・販売・価格まわり
  { id: "FBA最安値",       label: "FBA最安値",          sourceKey: "FBA最安値",       location: "center" },
  { id: "過去3月FBA最安値", label: "過去3ヶ月FBA最安値",  sourceKey: "過去3月FBA最安値", location: "center" },
  { id: "粗利益率予測",     label: "粗利益率予測",        sourceKey: "粗利益率予測",     location: "center" },
  { id: "粗利益予測",       label: "粗利益額（1個あたり）", sourceKey: "粗利益予測",     location: "center" },
  { id: "予測30日販売数",   label: "予測30日販売数",      sourceKey: "予測30日販売数",   location: "center" },

  { id: "30日販売数",       label: "30日販売数（実績）",   sourceKey: "30日販売数",       location: "table" },
  { id: "販売額（ドル）",   label: "販売額（カート価格USD）", sourceKey: "販売額（ドル）", location: "table" },
  { id: "入金額（円）",     label: "入金額（1個あたり円）",  sourceKey: "入金額（円）",   location: "table" },
  { id: "在庫数",           label: "在庫数",              sourceKey: "在庫数",           location: "table" },
  { id: "仕入れ目安単価",   label: "仕入れ目安単価",      sourceKey: "仕入れ目安単価",   location: "table" },
  { id: "想定送料",         label: "想定送料",            sourceKey: "想定送料",         location: "table" },
  { id: "関税",             label: "関税",                sourceKey: "関税",             location: "table" }
];

let metricsConfig = loadMetricsConfig();

function loadMetricsConfig() {
  try {
    const raw = localStorage.getItem(METRICS_STORAGE_KEY);
    if (!raw) return METRICS_DEFAULT.map(m => ({ ...m }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return METRICS_DEFAULT.map(m => ({ ...m }));
    // 不足している指標があれば補完
    const byId = Object.fromEntries(parsed.map(m => [m.id, m]));
    METRICS_DEFAULT.forEach(def => {
      if (!byId[def.id]) {
        parsed.push({ ...def });
      }
    });
    return parsed;
  } catch {
    return METRICS_DEFAULT.map(m => ({ ...m }));
  }
}
function saveMetricsConfig() {
  localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(metricsConfig));
}
function metricsByLocation(loc) {
  return metricsConfig.filter(m => m.location === loc);
}
function metricConfigMap() {
  const map = {};
  metricsConfig.forEach(m => { map[m.id] = m; });
  return map;
}

/* カスタマイズUI描画 */
let dragMetricId = null;

function renderMetricsConfigUI() {
  const centerList = metricsByLocation("center");
  const tableList = metricsByLocation("table");
  const hiddenList = metricsByLocation("hidden");

  const zones = {
    center: metricsCenterZone,
    table: metricsTableZone,
    hidden: metricsHiddenZone
  };
  Object.values(zones).forEach(z => z.innerHTML = "");

  function fillZone(zoneEl, list) {
    list.forEach(m => {
      const pill = document.createElement("div");
      pill.className = "metric-pill";
      pill.draggable = true;
      pill.dataset.id = m.id;
      pill.textContent = m.label;

      pill.addEventListener("dragstart", e => {
        dragMetricId = m.id;
        e.dataTransfer.effectAllowed = "move";
      });
      zoneEl.appendChild(pill);
    });
  }

  fillZone(zones.center, centerList);
  fillZone(zones.table, tableList);
  fillZone(zones.hidden, hiddenList);
}

function attachZoneDnD() {
  const zoneMap = {
    center: metricsCenterZone,
    table: metricsTableZone,
    hidden: metricsHiddenZone
  };
  Object.entries(zoneMap).forEach(([loc, el]) => {
    el.parentElement.addEventListener("dragover", e => {
      e.preventDefault();
      el.parentElement.classList.add("metrics-zone-over");
    });
    el.parentElement.addEventListener("dragleave", () => {
      el.parentElement.classList.remove("metrics-zone-over");
    });
    el.parentElement.addEventListener("drop", e => {
      e.preventDefault();
      el.parentElement.classList.remove("metrics-zone-over");
      if (!dragMetricId) return;
      const idx = metricsConfig.findIndex(m => m.id === dragMetricId);
      if (idx === -1) return;
      const [moved] = metricsConfig.splice(idx, 1);
      moved.location = loc;
      metricsConfig.push(moved);
      dragMetricId = null;
      saveMetricsConfig();
      renderMetricsConfigUI();
      applyMetricsLayout();
    });
  });
}

/* 真ん中カードへ指標を反映 */
function renderCenterMetrics(data) {
  centerMetricsContainer.innerHTML = "";
  const list = metricsByLocation("center");
  if (!list.length) {
    const row = document.createElement("div");
    row.className = "center-row";
    row.innerHTML = `<div class="center-row-label">表示する指標が未設定です</div>
                     <div class="center-row-value" style="font-weight:400;color:#9ca3af;">
                       「指標カスタマイズ」から選択してください
                     </div>`;
    centerMetricsContainer.appendChild(row);
    return;
  }
  list.forEach(m => {
    const row = document.createElement("div");
    row.className = "center-row";
    const label = document.createElement("div");
    label.className = "center-row-label";
    label.textContent = m.label;
    const value = document.createElement("div");
    value.className = "center-row-value";
    value.textContent = data ? (data[m.sourceKey] || "－") : "－";
    row.appendChild(label);
    row.appendChild(value);
    centerMetricsContainer.appendChild(row);
  });
}

/* ========= 下段テーブル定義 ========= */
/* 左の枠にある項目（ブランド/ASIN/JAN/SKUなど）は含めない */

const detailHeaderRow = document.getElementById("detailHeaderRow");
const detailBodyRow   = document.getElementById("detailBodyRow");
const detailHiddenBar = document.getElementById("detailHiddenBar");

const DETAIL_COLUMNS_DEF = [
  // 中央カードと共通利用する指標
  { id: "FBA最安値",         label: "FBA最安値",           sub:"",                 visible:false },
  { id: "過去3月FBA最安値",   label: "過去3ヶ月FBA最安値",   sub:"",                 visible:false },
  { id: "粗利益率予測",       label: "粗利益率予測",         sub:"1個あたり",       visible:true  },
  { id: "粗利益予測",         label: "粗利益予測",           sub:"1個あたり(円)",   visible:true  },
  { id: "予測30日販売数",     label: "予測30日販売数",       sub:"予測",             visible:false },
  { id: "30日販売数",         label: "30日販売数",           sub:"実績",             visible:true  },
  { id: "販売額（ドル）",     label: "販売額",               sub:"カート価格USD",   visible:true  },
  { id: "入金額（円）",       label: "入金額",               sub:"1個あたり(円)",   visible:true  },
  { id: "入金額計（円）",     label: "入金額 計",            sub:"数量×入金額",     visible:false },
  { id: "在庫数",             label: "在庫数",               sub:"FBA+FBM",         visible:true  },
  { id: "仕入れ目安単価",     label: "仕入れ目安単価",       sub:"1個",              visible:true  },
  { id: "想定送料",           label: "想定送料",             sub:"弊社想定",         visible:true  },
  { id: "関税",               label: "関税",                 sub:"推定",             visible:true  },

  // それ以外の指標（テーブル専用）
  { id: "90日販売数",         label: "90日販売数",           sub:"実績",             visible:false },
  { id: "180日販売数",        label: "180日販売数",          sub:"実績",             visible:false },
  { id: "複数在庫指数45日分", label: "複数在庫指数",         sub:"45日分",           visible:false },
  { id: "複数在庫指数60日分", label: "複数在庫指数",         sub:"60日分",           visible:false },
  { id: "ライバル偏差1",      label: "ライバル偏差",         sub:"×1",               visible:false },
  { id: "ライバル偏差2",      label: "ライバル偏差",         sub:"×2",               visible:false },
  { id: "ライバル増加率",     label: "ライバル増加率",       sub:"",                 visible:false },
  { id: "返品率",             label: "返品率",               sub:"過去実績",         visible:true  },
  { id: "粗利益",             label: "粗利益 実績",          sub:"参考値",           visible:false },
  { id: "仕入合計",           label: "仕入合計",             sub:"1注文",            visible:false },
  { id: "仕入計",             label: "仕入 計",              sub:"その他含む",       visible:false },
  { id: "サイズ感",           label: "サイズ感",             sub:"S / M / L",        visible:false },
  { id: "容積重量",           label: "容積重量",             sub:"kg換算",           visible:false },
  { id: "大型",               label: "大型判定",             sub:"FBA基準",         visible:true  },
  { id: "請求重量",           label: "請求重量",             sub:"課金用",           visible:false },
  { id: "送料",               label: "送料",                 sub:"実費",             visible:false },
  { id: "Keepaリンク",        label: "Keepa グラフ",         sub:"US Amazon",        visible:true  }
];

let detailColumns = DETAIL_COLUMNS_DEF.map(c => ({ ...c }));
let detailDragId = null;

function visibleCols() {
  return detailColumns.filter(c => c.visible !== false);
}

/* メトリクス設定に合わせて列を調整
   → 真ん中に置かれている指標はテーブルでは強制的に非表示 */
function syncColumnsWithMetrics() {
  const map = metricConfigMap();
  detailColumns.forEach(c => {
    const m = map[c.id];
    if (m && m.location === "center") {
      c.visible = false;
    }
  });
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
  if (!hidden.length) {
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
    td.dataset.colId = col.id;
    const value = data[col.id];

    if (col.id === "Keepaリンク" && value) {
      const a = document.createElement("a");
      a.href = value;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "グラフを開く";
      td.appendChild(a);
    } else {
      td.textContent = value === undefined || value === "" ? "－" : value;
    }
    detailBodyRow.appendChild(td);
  });
}

function rebuildDetailTable(data) {
  lastDetailData = data;
  syncColumnsWithMetrics();
  buildDetailHeader();
  fillDetailRow(data);
  renderDetailHiddenBar();
}

/* ========= 詳細描画 ========= */
function renderDetail(asin, data) {
  // 画像 & 基本情報
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

  // 真ん中カード & テーブル
  applyMetricsLayout(data);

  detailCard.style.display = "block";
  renderChart(asin);
}

/* ========= 指標レイアウト反映 ========= */
function applyMetricsLayout(data) {
  if (!data) data = lastDetailData;
  renderCenterMetrics(data || {});
  rebuildDetailTable(data || lastDetailData);
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
  if (!asin) {
    clearViewWithMessage("ASINを入力してください。");
    return;
  }
  const data = ASIN_DATA[asin];
  if (!data) {
    clearViewWithMessage(`ASIN「${asin}」のデータがありません。上部のラベルから登録済みASINを確認してください。`);
    return;
  }
  renderDetail(asin, data);
}

loadBtn.addEventListener("click", loadAsin);
asinInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    loadAsin();
  }
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

/* ========= カスタマイズUIイベント ========= */
openMetricsConfigBtn.addEventListener("click", () => {
  const showing = metricsConfigPanel.style.display !== "none";
  metricsConfigPanel.style.display = showing ? "none" : "block";
  if (!showing) {
    renderMetricsConfigUI();
  }
});
metricsConfigClose.addEventListener("click", () => {
  metricsConfigPanel.style.display = "none";
});
metricsResetBtn.addEventListener("click", () => {
  metricsConfig = METRICS_DEFAULT.map(m => ({ ...m }));
  saveMetricsConfig();
  renderMetricsConfigUI();
  applyMetricsLayout();
});

/* ========= 初期化 ========= */
initCatalog();
attachZoneDnD();
renderMetricsConfigUI();
applyMetricsLayout();
