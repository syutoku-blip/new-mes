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
const basicCatParent = document.getElementById("basicCatParent");
const basicCatChild = document.getElementById("basicCatChild");
const basicWarning = document.getElementById("basicWarning");

const centerFBA = document.getElementById("centerFBA");
const centerFBA3m = document.getElementById("centerFBA3m");
const centerMargin = document.getElementById("centerMargin");
const centerProfit = document.getElementById("centerProfit");
const centerForecast30 = document.getElementById("centerForecast30");

const chkDemandSupply = document.getElementById("chkDemandSupply");
const chkSupplyPrice = document.getElementById("chkSupplyPrice");

const mainChartCanvas = document.getElementById("mainChart");
let mainChartInstance = null;

/* ========= 疑似乱数（ASINごと固定） ========= */
function createPRNG(seedStr) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i);
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/* ========= 180日分のランキング・セラー数・価格を生成 ========= */
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

/* ========= グラフ描画（太線＋文字小＋余白少なめ） ========= */
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

/* チェックボックスによる線のON/OFF */
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

/* ========= 注意事項タグ描画 ========= */
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

/* ========= その他の指標テーブル関連 ========= */
const detailHeaderRow = document.getElementById("detailHeaderRow");
const detailBodyRow   = document.getElementById("detailBodyRow");
const detailHiddenBar = document.getElementById("detailHiddenBar");

const DETAIL_COLUMNS_DEF = [
  { id: "アメリカASIN",       label: "アメリカASIN",   sub:"US Listing",       visible:true  },
  { id: "日本ASIN",           label: "日本ASIN",       sub:"JP Listing",       visible:true  },
  { id: "JAN",                label: "JAN",            sub:"バーコード",       visible:true  },
  { id: "SKU",                label: "SKU",            sub:"管理用コード",     visible:true  },
  { id: "個数",               label: "個数",           sub:"1注文あたり",     visible:true  },
  { id: "30日販売数",         label: "30日販売数",     sub:"実績",             visible:true  },
  { id: "90日販売数",         label: "90日販売数",     sub:"実績",             visible:false },
  { id: "180日販売数",        label: "180日販売数",    sub:"実績",             visible:false },
  { id: "複数在庫指数45日分", label: "複数在庫指数",   sub:"45日分",           visible:false },
  { id: "複数在庫指数60日分", label: "複数在庫指数",   sub:"60日分",           visible:false },
  { id: "ライバル偏差1",      label: "ライバル偏差",   sub:"×1",               visible:false },
  { id: "ライバル偏差2",      label: "ライバル偏差",   sub:"×2",               visible:false },
  { id: "ライバル増加率",     label: "ライバル増加率", sub:"",                 visible:false },
  { id: "在庫数",             label: "在庫数",         sub:"FBA + FBM",        visible:true  },
  { id: "返品率",             label: "返品率",         sub:"過去実績",         visible:true  },
  { id: "販売額（ドル）",     label: "販売額",         sub:"カート価格 (USD)", visible:true  },
  { id: "入金額（円）",       label: "入金額",         sub:"1個あたり (円)",  visible:true  },
  { id: "入金額計（円）",     label: "入金額 計",      sub:"数量×入金額",      visible:false },
  { id: "粗利益率予測",       label: "粗利益率予測",   sub:"1個あたり",       visible:true  },
  { id: "粗利益予測",         label: "粗利益予測",     sub:"1個あたり (円)",  visible:true  },
  { id: "粗利益",             label: "粗利益 実績",    sub:"参考値",           visible:false },
  { id: "仕入れ目安単価",     label: "仕入れ目安単価", sub:"1個",              visible:true  },
  { id: "仕入合計",           label: "仕入合計",       sub:"1注文",            visible:false },
  { id: "仕入計",             label: "仕入 計",        sub:"その他含む",       visible:false },
  { id: "重量kg",             label: "重量",           sub:"実重量 (kg)",      visible:true  },
  { id: "サイズ",             label: "サイズ",         sub:"縦×横×高さ",       visible:true  },
  { id: "サイズ感",           label: "サイズ感",       sub:"S / M / L",        visible:false },
  { id: "容積重量",           label: "容積重量",       sub:"kg換算",           visible:false },
  { id: "材質",               label: "材質",           sub:"主素材",           visible:true  },
  { id: "大型",               label: "大型判定",       sub:"FBA基準",         visible:true  },
  { id: "請求重量",           label: "請求重量",       sub:"課金用",           visible:false },
  { id: "想定送料",           label: "想定送料",       sub:"弊社想定",         visible:true  },
  { id: "送料",               label: "送料",           sub:"実費",             visible:false },
  { id: "関税",               label: "関税",           sub:"推定",             visible:true  },
  { id: "Keepaリンク",        label: "Keepa グラフ",   sub:"US Amazon",        visible:true  }
];

let detailColumns = DETAIL_COLUMNS_DEF.map(c => ({...c}));
let detailDragId = null;
let lastDetailData = null;

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

    /* ドラッグで列入れ替え */
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
  buildDetailHeader();
  fillDetailRow(data);
  renderDetailHiddenBar();
}

/* ========= 詳細描画 ========= */
function renderDetail(asin, data) {
  prodImage.src = data["商品画像"] || "";
  prodImage.alt = data["品名"] || asin;
  basicTitle.textContent = data["品名"] || "";
  basicBrand.textContent = data["ブランド"] || "";
  basicRating.textContent = data["レビュー評価"] || "";
  basicASIN.textContent = asin;
  basicCatParent.textContent = data["親カテゴリ"] || "";
  basicCatChild.textContent = data["サブカテゴリ"] || "";
  renderWarningTags(basicWarning, data["注意事項（警告系）"]);

  centerFBA.textContent = data["FBA最安値"] || "－";
  centerFBA3m.textContent = data["過去3月FBA最安値"] || "－";
  centerMargin.textContent = data["粗利益率予測"] || "－";
  centerProfit.textContent = data["粗利益予測"] || data["粗利益"] || "－";
  centerForecast30.textContent = data["予測30日販売数"] || "－";

  summaryCard.style.display = "grid";
  placeholderCard.style.display = "none";

  rebuildDetailTable(data);
  detailCard.style.display = "block";

  renderChart(asin);
}

function clearViewWithMessage(msg) {
  summaryCard.style.display = "none";
  detailCard.style.display = "none";
  placeholderCard.style.display = "block";
  if (msg) {
    placeholderCard.querySelector(".placeholder").textContent = msg;
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

/* ========= ASINカタログ表示 ========= */
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
buildDetailHeader();
renderDetailHiddenBar();
