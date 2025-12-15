/* =========================
   Global DOM
========================= */
const asinInput = document.getElementById("asinInput");
const addBtn = document.getElementById("addBtn");
const clearBtn = document.getElementById("clearBtn");
const headerStatus = document.getElementById("headerStatus");
const asinCatalog = document.getElementById("asinCatalog");
const emptyState = document.getElementById("emptyState");
const itemsContainer = document.getElementById("itemsContainer");

/* Metrics pool zones */
const metricsPoolZone = document.getElementById("metricsPoolZone");
const metricsCenterZone = document.getElementById("metricsCenterZone");
const metricsTableZone = document.getElementById("metricsTableZone");
const metricsHiddenZone = document.getElementById("metricsHiddenZone");
const metricsResetBtn = document.getElementById("metricsResetBtn");

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
   Chart helpers
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

function renderChart(canvasEl, asin) {
  const series = getDemandSupplySeries(asin);
  const ctx = canvasEl.getContext("2d");

  return new Chart(ctx, {
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
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top", labels: { font: { size: 9 }, boxWidth: 18, boxHeight: 8, padding: 6 } },
        tooltip: {
          titleFont: { size: 10 },
          bodyFont: { size: 10 },
          callbacks: {
            label: (ctx) => ctx.dataset.yAxisID === "yPrice"
              ? `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`
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

function updateChartVisibility(chart, demandOn, supplyOn) {
  const showRank = demandOn || (!demandOn && !supplyOn);
  const showSeller = demandOn || supplyOn;
  const showPrice = supplyOn;

  chart.data.datasets[0].hidden = !showRank;
  chart.data.datasets[1].hidden = !showSeller;
  chart.data.datasets[2].hidden = !showPrice;
  chart.update();
}

/* =========================
   Metrics pool (global)
========================= */
const METRICS_STORAGE_KEY = "MES_AI_METRICS_ZONES_V5";

/* 左枠にある項目は入れない（ブランド/評価/ASIN/各種ASIN/JAN/SKU/サイズ/重量/材質/カテゴリ/注意事項） */
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
  { id: "容積重量", label: "容積重量", sourceKey: "容積重量" },
  { id: "想定送料", label: "想定送料", sourceKey: "想定送料" },
  { id: "送料", label: "送料", sourceKey: "送料" },
  { id: "関税", label: "関税", sourceKey: "関税" }
];

const DEFAULT_ZONES = {
  pool: ["90日販売数","180日販売数","複数在庫指数45日分","複数在庫指数60日分","ライバル偏差1","ライバル偏差2","ライバル増加率","入金額計（円）","仕入合計","仕入計","容積重量","請求重量","送料"],
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
  rerenderAllCards(); // 全カードに反映
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
  rerenderAllCards();
});

/* =========================
   Card builder (multiple ASIN)
========================= */
const cardState = new Map(); // asin -> { el, data, chart, cols }

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

function buildCenterMetrics(container, data){
  container.innerHTML = "";
  const ids = ZONES.center;

  if(!ids.length){
    const row = document.createElement("div");
    row.className = "center-row";
    row.innerHTML = `<div class="center-row-label">未設定</div>
                     <div class="center-row-value" style="font-weight:700;color:#9ca3af;">上のプールからドラッグ</div>`;
    container.appendChild(row);
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
    container.appendChild(row);
  });
}

function buildTableColumnsFromZones(){
  return ZONES.table
    .map(metricId => metricById(metricId))
    .filter(Boolean)
    .map(m => ({ id: m.sourceKey, label: m.label }));
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
    td.textContent = (value === undefined || value === "" || value === null) ? "－" : value;
    bodyRow.appendChild(td);
  });
}

function createProductCard(asin, data){
  const card = document.createElement("section");
  card.className = "product-card";
  card.dataset.asin = asin;

  card.innerHTML = `
    <div class="summary-row">
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
            <div class="basic-row warning-inline">
              <div class="basic-label">注意事項</div>
              <div class="basic-value js-warning"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="summary-column">
        <div class="center-title">主要指標</div>
        <div class="js-center"></div>
        <div class="center-note" style="margin-top:8px;font-size:10px;color:#92400e;">
          ※ 値はダミーデータ（実運用はAPI/シート連携）
        </div>
      </div>

      <div class="summary-column">
        <div class="summary-right">
          <div class="graph-header">
            <div class="graph-header-title">グラフ（180日）</div>
            <div class="graph-switch">
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
            <div class="graph-caption">表示切替で MES-AI-A / Keepa を切り替えできます。</div>
          </div>
        </div>
      </div>
    </div>

    <div class="detail-wrap">
      <div class="detail-head">
        <span>下の段テーブル（その他の指標）</span>
        <small>指標プールで「下段テーブル」に入れた項目が列になります。</small>
      </div>
      <div class="detail-scroll">
        <table class="detail-table js-detailTable">
          <thead><tr data-role="header"></tr></thead>
          <tbody><tr data-role="body"></tr></tbody>
        </table>
      </div>
      <div class="detail-foot">
        <span>横スクロールで全項目を確認できます。</span>
        <span>列の並び替えはヘッダーをドラッグしてください。</span>
      </div>
    </div>
  `;

  // fill base
  card.querySelector(".js-prodImage").src = data["商品画像"] || "";
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

  const realW = data["重量（kg）"] ?? data["重量kg"] ?? data["重量"] ?? "";
  const volW  = data["容積重量"] ?? "";
  const realWText = realW ? fmtKg(realW) : "－";
  const volWText  = volW ? fmtKg(volW) : "－";
  card.querySelector(".js-weight").textContent = `${realWText}（${volWText}）`;

  card.querySelector(".js-material").textContent = data["材質"] || "－";
  card.querySelector(".js-catP").textContent = data["親カテゴリ"] || "";
  card.querySelector(".js-catC").textContent = data["サブカテゴリ"] || "";
  renderWarningTags(card.querySelector(".js-warning"), data["注意事項（警告系）"]);

  // default price
  const sellPriceInput = card.querySelector(".js-sellPrice");
  const defaultPrice = data["販売額（ドル）"];
  if (defaultPrice) {
    const num = pickNumberLike(defaultPrice);
    if (num) sellPriceInput.value = num;
  }

  // cart
  const qtySelect = card.querySelector(".js-qtySelect");
  card.querySelector(".js-addCart").addEventListener("click", () => {
    const qty = Number(qtySelect.value || 1);
    const price = Number(sellPriceInput.value || 0);
    if (!price || price <= 0) return alert("販売価格（$）を入力してください");

    const payload = { asin, qty, price, total: +(qty * price).toFixed(2) };
    console.log("ADD_TO_CART", payload);
    alert(`カートに追加しました\nASIN: ${asin}\n数量: ${qty}\n価格: $${price}\n小計: $${payload.total}`);
  });

  // center metrics + table
  const centerBox = card.querySelector(".js-center");
  buildCenterMetrics(centerBox, data);

  const state = { cols: buildTableColumnsFromZones(), dragId: null };
  const tableEl = card.querySelector(".js-detailTable");
  buildDetailTable(tableEl, data, state);

  // chart
  const canvas = card.querySelector(".js-chart");
  const chart = renderChart(canvas, asin);

  const chkDS = card.querySelector(".js-chkDS");
  const chkSP = card.querySelector(".js-chkSP");
  chkDS.addEventListener("change", () => updateChartVisibility(chart, chkDS.checked, chkSP.checked));
  chkSP.addEventListener("change", () => updateChartVisibility(chart, chkDS.checked, chkSP.checked));
  updateChartVisibility(chart, true, false);

  // keepa switch
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
      keepaWrap.style.display = "flex";
      keepaFrame.src = `https://keepa.com/#!product/1-${asin}`;
    }
  }
  btnMes.addEventListener("click", () => setMode("MES"));
  btnKeepa.addEventListener("click", () => setMode("KEEPA"));

  // store
  cardState.set(asin, { el: card, data, chart, state, centerBox, tableEl });

  return card;
}

/* 指標配置変更を全カードへ反映 */
function rerenderAllCards(){
  cardState.forEach((v) => {
    buildCenterMetrics(v.centerBox, v.data);
    v.state.cols = buildTableColumnsFromZones();
    buildDetailTable(v.tableEl, v.data, v.state);
  });
}

/* =========================
   Add/clear
========================= */
function addAsin(){
  const asin = asinInput.value.trim().toUpperCase();
  if(!asin) return alert("ASINを入力してください");

  const data = ASIN_DATA?.[asin];
  if(!data) return alert(`ASIN「${asin}」のデータがありません`);

  // 既に表示中ならスクロールだけ
  if(cardState.has(asin)){
    const el = cardState.get(asin).el;
    el.scrollIntoView({ behavior:"smooth", block:"start" });
    return;
  }

  const card = createProductCard(asin, data);
  itemsContainer.appendChild(card);

  emptyState.style.display = "none";
  card.scrollIntoView({ behavior:"smooth", block:"start" });
}

function clearAll(){
  itemsContainer.innerHTML = "";
  cardState.forEach(v => { try{ v.chart.destroy(); }catch{} });
  cardState.clear();
  emptyState.style.display = "block";
}

addBtn.addEventListener("click", addAsin);
asinInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter"){ e.preventDefault(); addAsin(); }
});
clearBtn.addEventListener("click", clearAll);

/* =========================
   Catalog
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
      addAsin();
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
