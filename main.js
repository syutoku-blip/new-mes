/* =========================================================
   MES-AI-A main.js (FULL)
   - Requires: window.ASIN_DATA (from asin-data.js or API)
   - Requires: Chart.js loaded in index.html
   - Works with your current index.html IDs:
     #asinCatalog #itemsContainer #emptyState #headerStatus
     #metricsPoolZone #metricsCenterZone #metricsTableZone #metricsHiddenZone
     #metricsCollapseBtn #metricsResetBtn #clearCardsBtn #clearCartBtn
     #sortControls #addSortRuleBtn #applySortBtn #clearSortBtn
     #cartTotalCost #cartTotalRevenue #cartTotalProfit #cartAsinCount #cartItemCount
========================================================= */

(() => {
  /* -----------------------------
     DOM
  ----------------------------- */
  const headerStatus = document.getElementById("headerStatus");
  const asinCatalog = document.getElementById("asinCatalog");
  const itemsContainer = document.getElementById("itemsContainer");
  const emptyState = document.getElementById("emptyState");

  const metricsBar = document.querySelector(".metrics-bar");
  const metricsCollapseBtn = document.getElementById("metricsCollapseBtn");

  const zonePool = document.getElementById("metricsPoolZone");
  const zoneCenter = document.getElementById("metricsCenterZone");
  const zoneTable = document.getElementById("metricsTableZone");
  const zoneHidden = document.getElementById("metricsHiddenZone");

  const metricsResetBtn = document.getElementById("metricsResetBtn");
  const clearCardsBtn = document.getElementById("clearCardsBtn");
  const clearCartBtn = document.getElementById("clearCartBtn");

  const sortControls = document.getElementById("sortControls");
  const addSortRuleBtn = document.getElementById("addSortRuleBtn");
  const applySortBtn = document.getElementById("applySortBtn");
  const clearSortBtn = document.getElementById("clearSortBtn");

  const cartTotalCostEl = document.getElementById("cartTotalCost");
  const cartTotalRevenueEl = document.getElementById("cartTotalRevenue");
  const cartTotalProfitEl = document.getElementById("cartTotalProfit");
  const cartAsinCountEl = document.getElementById("cartAsinCount");
  const cartItemCountEl = document.getElementById("cartItemCount");

  /* -----------------------------
     Global State
  ----------------------------- */
  const FX = 150; // dummy USD->JPY
  const CART = new Map(); // asin -> { qty, priceUSD, costJPY }
  const CARDS = new Map(); // asin -> { root, chart, mode, checks, inputs }

  // Sorting rules: [{ metricId, dir }]
  let sortRules = [];

  // Drag context for metric pills
  let draggingPillId = null;

  /* -----------------------------
     Fixed fields (LEFT CARD)
     These must NOT appear in metric pool/table/center
  ----------------------------- */
  const FIXED_FIELDS = new Set([
    "ブランド",
    "レビュー評価",
    "ASIN",
    "アメリカASIN",
    "日本ASIN",
    "各種ASIN",
    "JAN",
    "SKU",
    "サイズ",
    "重量（容積重量）",
    "重量kg",
    "容積重量",
    "材質",
    "親カテゴリ",
    "サブカテゴリ",
    "カテゴリ",
    "注意事項（警告系）",
    "注意事項",
  ]);

  /* -----------------------------
     Metric Definitions
     id: internal ID
     label: shown on pill + table header
     getValue(data): raw value (string/number)
     format(value, data): text shown in UI
     parse(value, data): number for sorting
     tip(data): tooltip for 日本最安値
  ----------------------------- */
  const METRICS = [
    // --- Center/Key metrics candidates ---
    { id: "fbaMin", label: "FBA最安値", key: "FBA最安値" },
    { id: "fbaMin3m", label: "過去3ヶ月FBA最安値", key: "過去3月FBA最安値" },
    { id: "grossRatePred", label: "粗利益率予測", key: "粗利益率予測" },
    { id: "grossPredPer", label: "粗利益予測（1個あたり）", key: "粗利益予測" },
    { id: "pred30", label: "予測30日販売数", key: "予測30日販売数" },

    // --- Table metrics candidates ---
    { id: "sales30", label: "30日販売数（実績）", key: "30日販売数" },
    { id: "sales90", label: "90日販売数（実績）", key: "90日販売数" },
    { id: "sales180", label: "180日販売数（実績）", key: "180日販売数" },
    { id: "stock", label: "在庫数", key: "在庫数" },
    { id: "returnRate", label: "返品率", key: "返品率" },
    { id: "salesUSD", label: "販売額（USD）", key: "販売額（ドル）" },
    { id: "depositJPY", label: "入金額（円）", key: "入金額（円）" },
    { id: "depositTotalJPY", label: "入金額計（円）", key: "入金額計（円）" },

    { id: "multiIdx45", label: "複数在庫指数（45日）", key: "複数在庫指数45日分" },
    { id: "multiIdx60", label: "複数在庫指数（60日）", key: "複数在庫指数60日分" },

    { id: "rivalDev1", label: "ライバル偏差×1", key: "ライバル偏差1" },
    { id: "rivalDev2", label: "ライバル偏差×2", key: "ライバル偏差2" },
    { id: "rivalGrowth", label: "ライバル増加率", key: "ライバル増加率" },

    { id: "shipEst", label: "想定送料", key: "想定送料" },
    { id: "ship", label: "送料", key: "送料" },
    { id: "duty", label: "関税", key: "関税" },
    { id: "billWeight", label: "請求重量", key: "請求重量" },

    { id: "purchaseUnit", label: "仕入れ目安単価", key: "仕入れ目安単価" },
    { id: "purchaseTotal", label: "仕入合計", key: "仕入合計" },
    { id: "purchaseTotal2", label: "仕入計", key: "仕入計" },

    // --- Japan lowest price with tooltip ---
    {
      id: "jpLowest",
      label: "日本最安値",
      key: "日本最安値",
      tooltip: (data) => {
        const amazon = data["日本最安値_Amazon"] ?? data["日本最安値Amazon"] ?? data["日本最安値(amazon)"];
        const yahoo = data["日本最安値_Yahoo"] ?? data["日本最安値yahoo"] ?? data["日本最安値(Yahoo)"];
        const rakuten = data["日本最安値_楽天"] ?? data["日本最安値楽天"] ?? data["日本最安値(Rakuten)"];

        // fallback: use existing fields if available
        const fb = data["日本FBA最安値"];
        const mf = data["日本自己発送最安値"];
        const base = data["日本最安値"];

        const a = amazon ?? (base ? `Amazon ${base}` : (fb ? `Amazon(FBA) ${fb}` : "-"));
        const y = yahoo ?? "-";
        const r = rakuten ?? "-";

        return `Amazon　${a}\nYahoo　　${y}\n楽天　　 ${r}`;
      }
    },
  ].map(m => normalizeMetric(m));

  function normalizeMetric(m) {
    // Provide default accessors/formatters/parsers
    return {
      ...m,
      getValue: (data) => data?.[m.key],
      format: (v) => (v === undefined || v === null || v === "" ? "—" : String(v)),
      parse: (v) => parseNumberLike(v),
    };
  }

  // Initial placement (feel free to tweak)
  const DEFAULT_LAYOUT = {
    pool: [
      "sales90", "sales180",
      "multiIdx45", "multiIdx60",
      "rivalDev1", "rivalDev2", "rivalGrowth",
      "depositTotalJPY",
      "purchaseTotal",
      "ship", "shipEst", "duty", "billWeight",
      "jpLowest",
    ],
    center: ["fbaMin", "fbaMin3m", "grossRatePred", "grossPredPer", "pred30"],
    table: ["sales30", "stock", "returnRate", "salesUSD", "depositJPY", "purchaseUnit"],
    hidden: [
      "depositJPY", "depositTotalJPY", "purchaseTotal2", "purchaseTotal",
      // "jpLowest" is visible by default in pool; user can move it
    ],
  };

  // Live layout state
  const layout = {
    pool: [],
    center: [],
    table: [],
    hidden: [],
  };

  /* -----------------------------
     Helpers
  ----------------------------- */
  function yen(n) {
    const num = Number(n);
    if (!isFinite(num)) return "￥0";
    return "￥" + Math.round(num).toLocaleString("ja-JP");
  }
  function usd(n) {
    const num = Number(n);
    if (!isFinite(num)) return "$0.00";
    return "$" + num.toFixed(2);
  }
  function parseNumberLike(v) {
    if (v === undefined || v === null) return NaN;
    if (typeof v === "number") return v;
    const s = String(v).trim();
    // handle % , currency, + sign
    const cleaned = s
      .replace(/[,，]/g, "")
      .replace(/[￥¥]/g, "")
      .replace(/\$/g, "")
      .replace(/円/g, "")
      .replace(/kg/gi, "")
      .replace(/[%％]/g, "")
      .replace(/[+]/g, "");
    const num = Number(cleaned);
    return isFinite(num) ? num : NaN;
  }
  function safeText(v, fallback = "—") {
    const s = (v ?? "").toString().trim();
    return s ? s : fallback;
  }
  function getData() {
    return window.ASIN_DATA || {};
  }

  /* -----------------------------
     Layout init/render
  ----------------------------- */
  function resetLayout() {
    layout.pool = [...DEFAULT_LAYOUT.pool];
    layout.center = [...DEFAULT_LAYOUT.center];
    layout.table = [...DEFAULT_LAYOUT.table];

    // hidden = all metrics that are not in pool/center/table + defaults hidden
    const used = new Set([...layout.pool, ...layout.center, ...layout.table]);
    const all = METRICS.map(m => m.id);
    const rest = all.filter(id => !used.has(id));
    const extraHidden = DEFAULT_LAYOUT.hidden.filter(id => !used.has(id));
    layout.hidden = Array.from(new Set([...extraHidden, ...rest]));
  }

  function renderPills() {
    zonePool.innerHTML = "";
    zoneCenter.innerHTML = "";
    zoneTable.innerHTML = "";
    zoneHidden.innerHTML = "";

    layout.pool.forEach(id => zonePool.appendChild(createPill(id)));
    layout.center.forEach(id => zoneCenter.appendChild(createPill(id)));
    layout.table.forEach(id => zoneTable.appendChild(createPill(id)));
    layout.hidden.forEach(id => zoneHidden.appendChild(createPill(id)));

    renderSortControls();
    refreshAllCards(); // re-render center + table columns
  }

  function createPill(metricId) {
    const m = METRICS.find(x => x.id === metricId);
    const el = document.createElement("div");
    el.className = "metric-pill";
    el.textContent = m ? m.label : metricId;
    el.setAttribute("draggable", "true");
    el.dataset.metricId = metricId;

    el.addEventListener("dragstart", (e) => {
      draggingPillId = metricId;
      e.dataTransfer?.setData("text/plain", metricId);
      e.dataTransfer?.setDragImage?.(el, 10, 10);
    });
    el.addEventListener("dragend", () => {
      draggingPillId = null;
      clearDropHints();
    });

    return el;
  }

  function setupDropZone(zoneEl, zoneKey) {
    zoneEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      showDropHint(zoneEl, e.clientX, zoneKey);
    });

    zoneEl.addEventListener("drop", (e) => {
      e.preventDefault();
      const metricId = e.dataTransfer?.getData("text/plain") || draggingPillId;
      if (!metricId) return;

      // If metricId is fixed or not exists, ignore
      if (!METRICS.some(m => m.id === metricId)) return;

      moveMetricToZone(metricId, zoneKey, e.clientX, zoneEl);
      clearDropHints();
      renderPills();
    });
  }

  function clearDropHints() {
    document.querySelectorAll(".metric-pill.drop-hint").forEach(el => el.classList.remove("drop-hint"));
  }

  function showDropHint(zoneEl, clientX, zoneKey) {
    clearDropHints();
    const pills = [...zoneEl.querySelectorAll(".metric-pill")];
    if (pills.length === 0) return;

    // find closest pill by x center
    let target = null;
    let best = Infinity;
    for (const p of pills) {
      const r = p.getBoundingClientRect();
      const c = r.left + r.width / 2;
      const d = Math.abs(clientX - c);
      if (d < best) { best = d; target = p; }
    }
    if (target) target.classList.add("drop-hint");
  }

  function moveMetricToZone(metricId, toZoneKey, clientX, zoneEl) {
    // remove from all zones
    ["pool", "center", "table", "hidden"].forEach(k => {
      layout[k] = layout[k].filter(id => id !== metricId);
    });

    // insert in position based on drop hint
    const arr = layout[toZoneKey];
    const pills = [...zoneEl.querySelectorAll(".metric-pill")].filter(p => p.dataset.metricId !== metricId);
    let insertIndex = arr.length;

    const hinted = zoneEl.querySelector(".metric-pill.drop-hint");
    if (hinted) {
      const hintedId = hinted.dataset.metricId;
      const idx = arr.indexOf(hintedId);
      if (idx >= 0) {
        const r = hinted.getBoundingClientRect();
        const before = clientX < (r.left + r.width / 2);
        insertIndex = before ? idx : idx + 1;
      }
    }
    arr.splice(insertIndex, 0, metricId);
  }

  /* -----------------------------
     Sort controls
  ----------------------------- */
  function renderSortControls() {
    sortControls.innerHTML = "";
    if (sortRules.length === 0) {
      sortRules = [{ metricId: layout.center[0] || "", dir: "desc" }].filter(r => r.metricId);
    }

    sortRules.forEach((rule, idx) => {
      const row = document.createElement("div");
      row.className = "sort-row";

      const sel = document.createElement("select");
      sel.className = "sort-metric";
      const allowed = layout.center; // only center metrics
      const optEmpty = document.createElement("option");
      optEmpty.value = "";
      optEmpty.textContent = "指標を選択";
      sel.appendChild(optEmpty);

      allowed.forEach(id => {
        const m = METRICS.find(x => x.id === id);
        const op = document.createElement("option");
        op.value = id;
        op.textContent = m?.label || id;
        if (id === rule.metricId) op.selected = true;
        sel.appendChild(op);
      });

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
        renderSortControls();
      });

      sel.addEventListener("change", () => {
        rule.metricId = sel.value;
      });
      dir.addEventListener("change", () => {
        rule.dir = dir.value;
      });

      row.appendChild(sel);
      row.appendChild(dir);
      row.appendChild(del);
      sortControls.appendChild(row);
    });
  }

  function applySort() {
    // Only sort by valid rules
    const rules = sortRules
      .filter(r => r.metricId && layout.center.includes(r.metricId))
      .map(r => ({ ...r }));

    if (rules.length === 0) return;

    const cards = [...itemsContainer.querySelectorAll(".product-card")];
    const data = getData();

    cards.sort((a, b) => {
      const asinA = a.dataset.asin;
      const asinB = b.dataset.asin;
      const dA = data[asinA];
      const dB = data[asinB];

      for (const r of rules) {
        const m = METRICS.find(x => x.id === r.metricId);
        if (!m) continue;

        const vA = m.parse(m.getValue(dA), dA);
        const vB = m.parse(m.getValue(dB), dB);

        const aNaN = Number.isNaN(vA);
        const bNaN = Number.isNaN(vB);

        if (aNaN && bNaN) continue;
        if (aNaN && !bNaN) return 1;
        if (!aNaN && bNaN) return -1;

        if (vA === vB) continue;
        const cmp = vA > vB ? 1 : -1;
        return r.dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });

    // re-append in new order
    const frag = document.createDocumentFragment();
    cards.forEach(c => frag.appendChild(c));
    itemsContainer.appendChild(frag);
  }

  function clearSort() {
    sortRules = [];
    renderSortControls();
  }

  /* -----------------------------
     ASIN Catalog
  ----------------------------- */
  function renderAsinCatalog() {
    const data = getData();
    asinCatalog.innerHTML = "";

    const asins = Object.keys(data);
    if (headerStatus) {
      headerStatus.textContent = `データASIN数: ${asins.length}`;
    }

    asins.forEach(asin => {
      const pill = document.createElement("span");
      pill.textContent = asin;
      pill.title = "クリックして表示";

      pill.addEventListener("click", () => {
        addOrFocusCard(asin);
      });

      asinCatalog.appendChild(pill);
    });
  }

  /* -----------------------------
     Card Rendering
  ----------------------------- */
  function addOrFocusCard(asin) {
    const data = getData()[asin];
    if (!data) return;

    emptyState.style.display = "none";

    if (CARDS.has(asin)) {
      CARDS.get(asin).root.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const root = document.createElement("section");
    root.className = "product-card card";
    root.dataset.asin = asin;

    // Left fixed fields
    const imageSrc = safeText(data["商品画像"], "");
    const title = safeText(data["品名"], asin);
    const brand = safeText(data["ブランド"]);
    const rating = safeText(data["レビュー評価"]);

    const usAsin = safeText(data["アメリカASIN"] || asin);
    const jpAsin = safeText(data["日本ASIN"]);
    const jan = safeText(data["JAN"]);
    const sku = safeText(data["SKU"]);

    const size = safeText(data["サイズ"]);
    const weightKg = safeText(data["重量kg"]);
    const volW = safeText(data["容積重量"]);
    const material = safeText(data["材質"]);
    const cat = `${safeText(data["親カテゴリ"])} / ${safeText(data["サブカテゴリ"])}`.replace(/^—\s\/\s—$/, "—");

    const warningRaw = safeText(data["注意事項（警告系）"] || data["注意事項"], "");
    const warningTags = parseWarningTags(warningRaw);

    // Inputs initial
    const initPriceUSD = parseNumberLike(data["販売額（ドル）"]);
    const initCostJPY = parseNumberLike(data["仕入れ目安単価"]);

    // Middle metrics HTML will be injected based on layout.center
    // Bottom table will be injected based on layout.table

    root.innerHTML = `
      <div class="summary-row">
        <!-- LEFT -->
        <div>
          <div class="summary-left">
            <div class="summary-image-box">
              <img src="${escapeAttr(imageSrc)}" alt="" onerror="this.style.opacity=0.2;" />
              <div class="qty-row">
                <label class="inline-label">数量</label>
                <select class="qty">
                  ${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option value="${n}">${n}</option>`).join("")}
                </select>
              </div>

              <div class="price-row">
                <label class="inline-label">販売価格 ($)</label>
                <input class="price" type="number" step="0.01" min="0" placeholder="例: 39.99" value="${isFinite(initPriceUSD)?initPriceUSD:""}" />
              </div>

              <div class="cost-row">
                <label class="inline-label">仕入れ額 (￥)</label>
                <input class="cost" type="number" step="1" min="0" placeholder="例: 3700" value="${isFinite(initCostJPY)?initCostJPY:""}" />
              </div>

              <button class="cart-btn" type="button">カートに入れる</button>
            </div>

            <div class="summary-basic">
              <div class="summary-title">${escapeHtml(title)}</div>

              <div class="basic-row"><div class="basic-label">ブランド</div><div class="basic-value">${escapeHtml(brand)}</div></div>
              <div class="basic-row"><div class="basic-label">評価</div><div class="basic-value">${escapeHtml(rating)}</div></div>
              <div class="basic-row"><div class="basic-label">ASIN</div><div class="basic-value">${escapeHtml(asin)}</div></div>

              <div class="basic-row"><div class="basic-label">各種ASIN</div>
                <div class="basic-value">日本: ${escapeHtml(jpAsin)} / US: ${escapeHtml(usAsin)}</div>
              </div>

              <div class="basic-row"><div class="basic-label">JAN</div><div class="basic-value">${escapeHtml(jan)}</div></div>
              <div class="basic-row"><div class="basic-label">SKU</div><div class="basic-value">${escapeHtml(sku)}</div></div>

              <div class="basic-row"><div class="basic-label">サイズ</div><div class="basic-value">${escapeHtml(size)}</div></div>

              <div class="basic-row">
                <div class="basic-label">重量（容積重量）</div>
                <div class="basic-value">
                  ${escapeHtml(weightKg)}kg（${escapeHtml(volW)}kg）
                </div>
              </div>

              <div class="basic-row"><div class="basic-label">材質</div><div class="basic-value">${escapeHtml(material)}</div></div>
              <div class="basic-row"><div class="basic-label">カテゴリ</div><div class="basic-value">${escapeHtml(cat)}</div></div>

              <div class="basic-row">
                <div class="basic-label">注意事項</div>
                <div class="basic-value">
                  <div class="warning-tags">
                    ${warningTags.length ? warningTags.map(t => renderWarningTag(t)).join("") : `<span class="muted">—</span>`}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- CENTER -->
        <div class="center-card">
          <div class="card-title">主要指標</div>
          <div class="center-metrics" data-role="centerMetrics"></div>
          <div class="small-note">※ 値はダミーデータ（実運用はAPI/シート連携）</div>
        </div>

        <!-- RIGHT / GRAPH -->
        <div class="graph-card">
          <div class="graph-head">
            <div class="graph-title">グラフ（180日）</div>
            <div class="graph-mode">
              <button type="button" class="mode-btn active" data-mode="mes">MES-AI-A</button>
              <button type="button" class="mode-btn" data-mode="keepa">Keepa</button>
            </div>
          </div>

          <div class="graph-controls">
            <label class="check-pill">
              <input class="line-check" type="checkbox" data-set="rankSeller" checked />
              《需要＆供給》
            </label>
            <label class="check-pill">
              <input class="line-check" type="checkbox" data-set="sellerPrice" />
              《供給＆価格》
            </label>
          </div>

          <div class="graph-body">
            <canvas class="graph-canvas"></canvas>
            <div class="keepa-holder" style="display:none;">
              <div class="keepa-box">
                <div class="keepa-text">Keepa表示（外部）</div>
                <a class="keepa-link" target="_blank" rel="noreferrer">Keepaで開く</a>
              </div>
            </div>
          </div>

          <div class="graph-foot">
            表示切替で MES-AI-A / Keepa を切替できます（MES側はチェックで線を切替）
          </div>
        </div>
      </div>

      <!-- BOTTOM TABLE (per ASIN) -->
      <div class="detail-wrap">
        <div class="detail-scroll">
          <table class="detail-table" data-role="detailTable">
            <thead><tr></tr></thead>
            <tbody><tr></tr></tbody>
          </table>
        </div>
      </div>
    `;

    itemsContainer.appendChild(root);

    // wire card
    const qtyEl = root.querySelector(".qty");
    const priceEl = root.querySelector(".price");
    const costEl = root.querySelector(".cost");
    const cartBtn = root.querySelector(".cart-btn");

    const canvas = root.querySelector(".graph-canvas");
    const keepaHolder = root.querySelector(".keepa-holder");
    const keepaLink = root.querySelector(".keepa-link");
    const modeBtns = [...root.querySelectorAll(".mode-btn")];
    const checks = [...root.querySelectorAll(".line-check")];

    // Keepa link
    const keepaUrl = data["Keepaリンク"];
    if (keepaUrl) keepaLink.href = keepaUrl;

    // create chart
    const chart = buildMesChart(canvas, data);

    // mode switching
    let graphMode = "mes";
    function setMode(mode) {
      graphMode = mode;
      modeBtns.forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
      if (mode === "keepa") {
        canvas.style.display = "none";
        keepaHolder.style.display = "";
      } else {
        keepaHolder.style.display = "none";
        canvas.style.display = "";
        // ensure chart is resized
        chart?.resize();
      }
    }
    modeBtns.forEach(btn => {
      btn.addEventListener("click", () => setMode(btn.dataset.mode));
    });

    // line set check logic:
    // - rankSeller: show ranking + seller
    // - sellerPrice: show seller + price
    // if both checked: show all 3
    function applyLineVisibility() {
      const rankSeller = root.querySelector('input[data-set="rankSeller"]').checked;
      const sellerPrice = root.querySelector('input[data-set="sellerPrice"]').checked;

      const showRank = rankSeller;
      const showSeller = rankSeller || sellerPrice;
      const showPrice = sellerPrice;

      setDatasetVisible(chart, "rank", showRank);
      setDatasetVisible(chart, "seller", showSeller);
      setDatasetVisible(chart, "price", showPrice);

      chart.update("none");
    }
    checks.forEach(c => c.addEventListener("change", applyLineVisibility));
    applyLineVisibility();

    // cart add
    cartBtn.addEventListener("click", () => {
      const qty = Number(qtyEl.value || 1);
      const priceUSD = Number(priceEl.value || 0);
      const costJPY = Number(costEl.value || 0);

      CART.set(asin, { qty, priceUSD, costJPY });
      updateCartSummary();
      flash(cartBtn);
    });

    // Save card state
    CARDS.set(asin, {
      root,
      chart,
      mode: graphMode,
      checks,
      inputs: { qtyEl, priceEl, costEl },
      data,
    });

    // Render center metrics and table columns based on current layout
    renderCardCenter(asin);
    renderCardTable(asin);

    // scroll focus
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderCardCenter(asin) {
    const card = CARDS.get(asin);
    if (!card) return;

    const wrap = card.root.querySelector('[data-role="centerMetrics"]');
    wrap.innerHTML = "";

    layout.center.forEach(id => {
      const m = METRICS.find(x => x.id === id);
      if (!m) return;
      const raw = m.getValue(card.data);
      const val = m.format(raw, card.data);

      const row = document.createElement("div");
      row.className = "center-row";

      const label = document.createElement("div");
      label.className = "center-row-label";
      label.textContent = m.label;

      const value = document.createElement("div");
      value.className = "center-row-value";

      // 日本最安値 tooltip
      if (m.id === "jpLowest" && typeof m.tooltip === "function") {
        value.classList.add("has-tip");
        value.dataset.tip = m.tooltip(card.data);
      }
      value.textContent = val;

      row.appendChild(label);
      row.appendChild(value);
      wrap.appendChild(row);
    });
  }

  function renderCardTable(asin) {
    const card = CARDS.get(asin);
    if (!card) return;

    const table = card.root.querySelector('[data-role="detailTable"]');
    const trH = table.querySelector("thead tr");
    const trB = table.querySelector("tbody tr");
    trH.innerHTML = "";
    trB.innerHTML = "";

    layout.table.forEach(id => {
      const m = METRICS.find(x => x.id === id);
      if (!m) return;

      const th = document.createElement("th");
      th.textContent = m.label;

      const td = document.createElement("td");
      const raw = m.getValue(card.data);
      td.textContent = m.format(raw, card.data);

      // 日本最安値 tooltip
      if (m.id === "jpLowest" && typeof m.tooltip === "function") {
        td.classList.add("has-tip");
        td.dataset.tip = m.tooltip(card.data);
      }

      trH.appendChild(th);
      trB.appendChild(td);
    });
  }

  function refreshAllCards() {
    for (const asin of CARDS.keys()) {
      renderCardCenter(asin);
      renderCardTable(asin);
    }
    // Also refresh sort rule dropdown options since center metrics may change
    renderSortControls();
  }

  /* -----------------------------
     Chart (MES-AI-A)
     - 180 points dummy from base values
     - datasets: ranking (left), seller (right), price (right2)
  ----------------------------- */
  function buildMesChart(canvas, data) {
    const labels = Array.from({ length: 180 }, (_, i) => `${i}日前`);

    // base seeds
    const baseRank = clamp(parseNumberLike(data["ランキング"]) || 60000, 1000, 250000);
    const baseSeller = clamp(parseNumberLike(data["セラー数"]) || 4, 0, 50);
    const basePrice = clamp(parseNumberLike(data["販売額（ドル）"]) || 40, 1, 500);

    const rankSeries = randomWalk(180, baseRank, baseRank * 0.03, 2000, 180000);
    const sellerSeries = randomWalk(180, baseSeller, 0.12, 0, 20);
    const priceSeries = randomWalk(180, basePrice, 0.35, 5, 150);

    const ctx = canvas.getContext("2d");

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "ランキング（小さいほど上位）",
            data: rankSeries,
            borderWidth: 4,
            pointRadius: 0,
            tension: 0.25,
            yAxisID: "yRank",
            parsing: false,
            // color not specified per your preference? Chart.js defaults vary; leave it default.
          },
          {
            label: "セラー数",
            data: sellerSeries,
            borderWidth: 4,
            pointRadius: 0,
            tension: 0.25,
            yAxisID: "ySeller",
            parsing: false,
          },
          {
            label: "価格（USD）",
            data: priceSeries,
            borderWidth: 4,
            pointRadius: 0,
            tension: 0.25,
            yAxisID: "yPrice",
            parsing: false,
          },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            labels: { boxWidth: 18, font: { size: 10 } }
          },
          tooltip: {
            enabled: true,
            mode: "index",
            intersect: false,
            callbacks: {
              label: (ctx) => {
                const label = ctx.dataset.label || "";
                const v = ctx.parsed.y;
                if (label.includes("価格")) return `${label}: ${usd(v)}`;
                if (label.includes("セラー")) return `${label}: ${v.toFixed(1)}`;
                return `${label}: ${Math.round(v).toLocaleString("ja-JP")}`;
              }
            }
          }
        },
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            ticks: { maxTicksLimit: 10, font: { size: 10 } }
          },
          yRank: {
            position: "left",
            reverse: true,
            ticks: { font: { size: 10 } }
          },
          ySeller: {
            position: "right",
            grid: { drawOnChartArea: false },
            ticks: { font: { size: 10 } }
          },
          yPrice: {
            position: "right",
            grid: { drawOnChartArea: false },
            ticks: { font: { size: 10 } }
          }
        }
      }
    });

    // add keys to datasets for visibility control
    chart.data.datasets[0].__key = "rank";
    chart.data.datasets[1].__key = "seller";
    chart.data.datasets[2].__key = "price";

    return chart;
  }

  function setDatasetVisible(chart, key, visible) {
    if (!chart) return;
    const ds = chart.data.datasets.find(d => d.__key === key);
    if (!ds) return;
    ds.hidden = !visible;
  }

  function clamp(v, min, max) {
    if (!isFinite(v)) return min;
    return Math.max(min, Math.min(max, v));
  }

  function randomWalk(n, start, step, min, max) {
    const arr = new Array(n);
    let x = start;
    for (let i = 0; i < n; i++) {
      const delta = (Math.random() - 0.5) * 2 * step;
      x = clamp(x + delta, min, max);
      // small mean reversion
      x = x * 0.995 + start * 0.005;
      arr[i] = x;
    }
    return arr;
  }

  /* -----------------------------
     Warning tags
  ----------------------------- */
  const WARNING_COLOR = {
    "輸出不可": "warning-export-ban",
    "知財": "warning-ip",
    "大型": "warning-large",
    "出荷禁止": "warning-ship-ban",
    "承認要": "warning-need-approve",
    "バリエーション": "warning-variation",
  };

  function parseWarningTags(raw) {
    if (!raw) return [];
    // split by comma or spaces
    const tokens = raw
      .replace(/　/g, " ")
      .split(/[,、\n ]+/)
      .map(s => s.trim())
      .filter(Boolean);

    // normalize a few patterns
    return tokens.map(t => {
      if (t.includes("輸出")) return "輸出不可";
      if (t.includes("知財")) return "知財";
      if (t.includes("大型")) return "大型";
      if (t.includes("出荷")) return "出荷禁止";
      if (t.includes("承認")) return "承認要";
      if (t.includes("バリエ")) return "バリエーション";
      return t;
    });
  }

  function renderWarningTag(tag) {
    const cls = WARNING_COLOR[tag] || "warning-generic";
    return `<span class="warning-tag ${cls}">${escapeHtml(tag)}</span>`;
  }

  /* -----------------------------
     Cart summary
  ----------------------------- */
  function updateCartSummary() {
    let totalCost = 0;
    let totalRevenue = 0;
    let asinCount = 0;
    let itemCount = 0;

    CART.forEach(v => {
      asinCount += 1;
      itemCount += Number(v.qty || 0);

      totalCost += Number(v.costJPY || 0) * Number(v.qty || 0);
      totalRevenue += Number(v.priceUSD || 0) * FX * Number(v.qty || 0);
    });

    cartTotalCostEl.textContent = yen(totalCost);
    cartTotalRevenueEl.textContent = yen(totalRevenue);
    cartTotalProfitEl.textContent = yen(totalRevenue - totalCost);
    cartAsinCountEl.textContent = String(asinCount);
    cartItemCountEl.textContent = String(itemCount);
  }

  /* -----------------------------
     Actions
  ----------------------------- */
  function clearCards() {
    itemsContainer.innerHTML = "";
    CARDS.clear();
    emptyState.style.display = "";
  }

  function clearCart() {
    CART.clear();
    updateCartSummary();
  }

  function flash(btn) {
    btn.style.transform = "scale(0.98)";
    setTimeout(() => (btn.style.transform = ""), 120);
  }

  /* -----------------------------
     CSS helpers for this file (minimal)
     (Your styles.css already has tooltip, but we add classes needed for warning colors)
  ----------------------------- */
  function injectExtraCss() {
    const css = `
      .summary-title{font-weight:900;font-size:15px;margin-bottom:8px;}
      .muted{color:#94a3b8;font-weight:800;}
      .center-card,.graph-card{padding:12px;border:1px solid #e5e7eb;border-radius:14px;background:#fff;}
      .card-title{font-weight:900;margin-bottom:10px;}
      .center-metrics{display:flex;flex-direction:column;gap:6px;}
      .center-row{display:flex;justify-content:space-between;gap:10px;}
      .center-row-label{color:#64748b;font-weight:900;font-size:12px;white-space:nowrap;}
      .center-row-value{font-weight:900;font-size:12px;white-space:nowrap;}
      .small-note{margin-top:10px;font-size:11px;color:#f97316;font-weight:800;}
      .graph-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
      .graph-title{font-weight:900;color:#1d4ed8;}
      .graph-mode{display:flex;gap:6px;}
      .mode-btn{border:1px solid #c7d2fe;background:#eef2ff;border-radius:999px;padding:4px 10px;font-weight:900;font-size:12px;}
      .mode-btn.active{background:#5b5cff;color:#fff;border-color:#5b5cff;}
      .graph-controls{display:flex;gap:10px;align-items:center;justify-content:flex-end;margin-bottom:8px;}
      .check-pill{display:flex;gap:6px;align-items:center;font-size:12px;font-weight:900;white-space:nowrap;}
      .graph-body{height:240px;background:#e8f0ff;border-radius:12px;padding:10px;position:relative;}
      .graph-canvas{width:100% !important;height:100% !important;}
      .graph-foot{margin-top:8px;font-size:11px;color:#64748b;font-weight:800;}

      .warning-tags{display:flex;gap:6px;flex-wrap:wrap;}
      .warning-tag{border-radius:999px;padding:2px 10px;font-size:11px;font-weight:900;color:#fff;white-space:nowrap;}
      .warning-export-ban{background:#ef4444;}
      .warning-ip{background:#8b5cf6;}
      .warning-large{background:#f97316;}
      .warning-ship-ban{background:#0ea5e9;}
      .warning-need-approve{background:#16a34a;}
      .warning-variation{background:#a855f7;}
      .warning-generic{background:#334155;}

      .metric-pill.drop-hint{outline:2px solid #5b5cff;outline-offset:2px;}
      .keepa-box{height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px;}
      .keepa-text{font-weight:900;color:#0f172a;}
      .keepa-link{font-weight:900;}
      .inline-label{display:inline-block;min-width:90px;color:#64748b;font-weight:900;white-space:nowrap;}
      .qty-row,.price-row,.cost-row{display:flex;gap:8px;align-items:center;flex-wrap:nowrap;}
      .qty-row select,.price-row input,.cost-row input{flex:1;min-width:0;}
      .summary-image-box{display:flex;flex-direction:column;gap:8px;}
      .summary-image-box img{border-radius:12px;border:1px solid #e5e7eb;background:#fff;}
      .basic-row{display:grid;grid-template-columns:120px 1fr;gap:10px;align-items:start;}
      .basic-label{white-space:nowrap;}
      .basic-value{font-weight:900;}
      .detail-wrap{margin-top:10px;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;background:#fff;}
      .detail-table th{background:#eef2ff;font-weight:900;}
      .detail-table td{font-weight:900;}
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* -----------------------------
     Escape helpers
  ----------------------------- */
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replaceAll("\n", " ");
  }

  /* -----------------------------
     Bind UI
  ----------------------------- */
  function bindUI() {
    // collapse metrics bar
    metricsCollapseBtn.addEventListener("click", () => {
      metricsBar.classList.toggle("collapsed");
      const collapsed = metricsBar.classList.contains("collapsed");
      metricsCollapseBtn.textContent = collapsed ? "広げる" : "折りたたむ";
    });

    // reset layout
    metricsResetBtn.addEventListener("click", () => {
      resetLayout();
      renderPills();
    });

    // clear cards
    clearCardsBtn.addEventListener("click", () => {
      clearCards();
    });

    // clear cart
    clearCartBtn.addEventListener("click", () => {
      clearCart();
    });

    // sort rules
    addSortRuleBtn.addEventListener("click", () => {
      const first = layout.center[0] || "";
      sortRules.push({ metricId: first, dir: "desc" });
      renderSortControls();
    });

    applySortBtn.addEventListener("click", () => {
      applySort();
    });

    clearSortBtn.addEventListener("click", () => {
      clearSort();
    });

    // zone drop
    setupDropZone(zonePool, "pool");
    setupDropZone(zoneCenter, "center");
    setupDropZone(zoneTable, "table");
    setupDropZone(zoneHidden, "hidden");
  }

  /* -----------------------------
     Init
  ----------------------------- */
  function init() {
    injectExtraCss();
    resetLayout();
    bindUI();
    renderPills();
    renderAsinCatalog();
    updateCartSummary();

    // Guard: If data missing, show message in header
    const data = getData();
    const count = Object.keys(data).length;
    if (count === 0) {
      headerStatus.textContent = "ASINデータが見つかりません（window.ASIN_DATA が未定義）";
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
