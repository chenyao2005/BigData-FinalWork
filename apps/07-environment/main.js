/* global L, d3 */

const ZIP_GEOJSON_PATH = "./data/nyc_zip_boundaries.geojson";
const ENV_DATA_PATH = "../../output/final_data.environment.json";
const SCORE4_CSV_PATH = "../../output/score4.csv";

const state = {
  map: null,
  zipLayer: null,
  lockedLayer: null,
  lockedZip: null,
  suppressNextMapClick: false,
  envRecords: [],
  envByZip: new Map(),
  score4ByZip: new Map(),
  threshold: 30,
  facilityOpacity: 0.85,
  facilityLayers: {
    cooling: { enabled: false, loaded: false, layer: null },
    restrooms: { enabled: true, loaded: false, layer: null },
    fountains: { enabled: false, loaded: false, layer: null },
  },
  checks: {
    air: false,
    noise: false,
    green: false,
  },
};

init();

async function init() {
  wireControls();
  const [zipGeojson, envRecords, score4Rows] = await Promise.all([
    d3.json(ZIP_GEOJSON_PATH),
    d3.json(ENV_DATA_PATH),
    d3.csv(SCORE4_CSV_PATH),
  ]);
  state.envRecords = envRecords || [];
  indexEnvironmentData(envRecords);
  indexScore4(score4Rows || []);
  renderInsights();
  joinEnvironmentToGeojson(zipGeojson);
  initMap(zipGeojson);
  syncFacilityLayers();
  drawRadarPlaceholder();
}

function wireControls() {
  const scoreRange = document.getElementById("scoreRange");
  const scoreLabel = document.getElementById("scoreLabel");
  const airCheck = document.getElementById("airCheck");
  const noiseCheck = document.getElementById("noiseCheck");
  const greenCheck = document.getElementById("greenCheck");
  const layerOpacityRange = document.getElementById("layerOpacityRange");
  const layerOpacityLabel = document.getElementById("layerOpacityLabel");
  const presetBalanced = document.getElementById("presetBalanced");
  const presetQuiet = document.getElementById("presetQuiet");
  const presetFacilities = document.getElementById("presetFacilities");
  const layerCooling = document.getElementById("layerCooling");
  const layerRestrooms = document.getElementById("layerRestrooms");
  const layerFountains = document.getElementById("layerFountains");

  scoreRange.addEventListener("input", () => {
    state.threshold = Number(scoreRange.value);
    scoreLabel.textContent = String(state.threshold);
    applyFilters();
  });

  airCheck.addEventListener("change", () => {
    state.checks.air = airCheck.checked;
    applyFilters();
  });
  noiseCheck.addEventListener("change", () => {
    state.checks.noise = noiseCheck.checked;
    applyFilters();
  });
  greenCheck.addEventListener("change", () => {
    state.checks.green = greenCheck.checked;
    applyFilters();
  });

  layerOpacityRange.addEventListener("input", () => {
    const v = Number(layerOpacityRange.value);
    state.facilityOpacity = v / 100;
    layerOpacityLabel.textContent = `${v}%`;
    refreshFacilityLayerStyle();
  });

  function setPreset(name) {
    for (const el of [presetBalanced, presetQuiet, presetFacilities]) el.classList.remove("is-active");
    if (name === "balanced") {
      presetBalanced.classList.add("is-active");
      airCheck.checked = false;
      noiseCheck.checked = false;
      greenCheck.checked = false;
      state.checks = { air: false, noise: false, green: false };
      applyFilters();
    }
    if (name === "quiet") {
      presetQuiet.classList.add("is-active");
      noiseCheck.checked = true;
      state.checks.noise = true;
      applyFilters();
    }
    if (name === "fac") {
      presetFacilities.classList.add("is-active");
      layerRestrooms.checked = true;
      layerFountains.checked = true;
      state.facilityLayers.restrooms.enabled = true;
      state.facilityLayers.fountains.enabled = true;
      syncFacilityLayers();
    }
  }

  presetBalanced.addEventListener("click", () => setPreset("balanced"));
  presetQuiet.addEventListener("click", () => setPreset("quiet"));
  presetFacilities.addEventListener("click", () => setPreset("fac"));
  setPreset("balanced");

  layerCooling.addEventListener("change", () => {
    state.facilityLayers.cooling.enabled = layerCooling.checked;
    syncFacilityLayers();
  });
  layerRestrooms.addEventListener("change", () => {
    state.facilityLayers.restrooms.enabled = layerRestrooms.checked;
    syncFacilityLayers();
  });
  layerFountains.addEventListener("change", () => {
    state.facilityLayers.fountains.enabled = layerFountains.checked;
    syncFacilityLayers();
  });

  // 与默认状态同步：默认勾选公厕并加载对应图层
  layerCooling.checked = state.facilityLayers.cooling.enabled;
  layerRestrooms.checked = state.facilityLayers.restrooms.enabled;
  layerFountains.checked = state.facilityLayers.fountains.enabled;
}

function indexEnvironmentData(records) {
  for (const row of records) {
    state.envByZip.set(String(row.zip_code), row.environment);
  }
}

function indexScore4(rows) {
  for (const r of rows) {
    const z = String(r.zipcode || r.zip_code || r.ZIP || "").match(/\d{5}/);
    if (!z) continue;
    state.score4ByZip.set(z[0], {
      environment_score: Number(r.environment_score),
      facility_score: Number(r.facility_score),
    });
  }
}

function joinEnvironmentToGeojson(geojson) {
  for (const feature of geojson.features) {
    const zip = getFeatureZip(feature.properties);
    const env = state.envByZip.get(zip);
    const s4 = state.score4ByZip.get(zip);
    if (!env) {
      feature.properties.environment_score = 50;
      feature.properties.air_quality_score = 50;
      feature.properties.noise_score = 50;
      feature.properties.green_score = 50;
      feature.properties.facility_score = s4 ? Number(s4.facility_score || 50) : 50;
      feature.properties.has_data = 0;
      continue;
    }
    feature.properties.environment_score = env.environment_score;
    feature.properties.air_quality_score = env.air_quality_score;
    feature.properties.noise_score = env.noise_score;
    feature.properties.green_score = env.green_score;
    feature.properties.facility_score = s4 ? Number(s4.facility_score || 50) : 50;
    feature.properties.has_data = 1;
  }
}

function getFeatureZip(props) {
  const raw =
    props.ZIPCODE ||
    props.zip_code ||
    props.postalCode ||
    props.MODZCTA ||
    props.modzcta ||
    "";
  const m = String(raw).match(/\d{5}/);
  return m ? m[0] : "";
}

/** GeoJSON 中的邮局常用名 PO_NAME + 行政区 borough，近似对应片区（非官方邻里边界）。 */
function getPlaceLabelFromProps(props) {
  const po = String(props.PO_NAME || props.po_name || props.poName || "").trim();
  const boro = String(props.borough || props.BOROUGH || "").trim();
  if (po && boro) return `${po}（${boro}）`;
  if (po) return po;
  if (boro) return boro;
  return "";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function initMap(geojson) {
  const map = L.map("map", {
    center: [40.72, -73.94],
    zoom: 10,
    zoomControl: true,
  });
  state.map = map;
  // 去掉底图瓦片：只展示数据图层（更像“专题图/作业图”）

  renderZipLayer(geojson);
  map.on("click", () => {
    if (state.suppressNextMapClick) return;
    clearLockedSelection();
  });
}

function renderZipLayer(geojson) {
  if (!state.map) return;
  if (state.zipLayer) {
    state.map.removeLayer(state.zipLayer);
  }

  state.zipLayer = L.geoJSON(geojson, {
    style: (feature) => {
      const score = Number(feature.properties.environment_score || 0);
      return {
        color: "rgba(255,255,255,0.9)",
        weight: 1,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
        fillColor: getScoreColor(score),
        fillOpacity: 0.78,
      };
    },
    onEachFeature: (feature, layer) => {
      const zip = getFeatureZip(feature.properties);
      const placeLabel = getPlaceLabelFromProps(feature.properties);
      const score = Number(feature.properties.environment_score || 0);
      const hasData = Number(feature.properties.has_data) === 1;
      const placeHtml = placeLabel
        ? `<div class="tip-place">${escapeHtml(placeLabel)}</div>`
        : "";
      layer.bindTooltip(
        hasData
          ? `<div class="tip-inner"><strong>ZIP ${escapeHtml(zip)}</strong>${placeHtml}<div class="tip-score">环境综合分 ${escapeHtml(String(score))}</div></div>`
          : `<div class="tip-inner"><strong>ZIP ${escapeHtml(zip)}</strong>${placeHtml}<div class="tip-score tip-score--muted">暂无对齐数据</div></div>`,
        {
          sticky: true,
          direction: "top",
          opacity: 1,
          className: "env-tooltip",
        }
      );

      layer.on("mousemove", () => {
        if (!state.lockedLayer) drawRadarByFeature(feature);
      });
      layer.on("click", (e) => {
        state.suppressNextMapClick = true;
        window.setTimeout(() => {
          state.suppressNextMapClick = false;
        }, 0);
        if (e && e.originalEvent) L.DomEvent.stop(e.originalEvent);
        toggleLayerLock(layer);
      });
    },
  }).addTo(state.map);

  const bounds = state.zipLayer.getBounds();
  if (bounds.isValid()) {
    state.map.fitBounds(bounds, { padding: [20, 20] });
  }
  applyFilters();
}

function applyFilters() {
  if (!state.zipLayer) return;
  state.zipLayer.eachLayer((layer) => {
    const p = layer.feature.properties;
    if (passFilters(p)) {
      const score = Number(p.environment_score || 0);
      layer.setStyle({
        fillOpacity: 0.78,
        fillColor: getScoreColor(score),
        color: "rgba(255,255,255,0.88)",
        weight: 1,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      });
    } else {
      layer.setStyle({
        fillOpacity: 0.12,
        fillColor: "#d1d5db",
        color: "rgba(148,163,184,0.7)",
        weight: 0.5,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      });
    }
  });
  applyLockedStyle();
}

function passFilters(p) {
  if (Number(p.environment_score) < state.threshold) return false;
  if (state.checks.air && Number(p.air_quality_score) < 60) return false;
  if (state.checks.noise && Number(p.noise_score) < 60) return false;
  if (state.checks.green && Number(p.green_score) < 60) return false;
  return true;
}

function getScoreColor(score) {
  // 8 色连续色带（低→高）
  const palette = ["#fc757b", "#f97f5f", "#faa26f", "#fdcd94", "#fee199", "#b0d6a9", "#65bdba", "#3c98c9"];
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  const idx = Math.min(palette.length - 1, Math.floor((s / 100) * palette.length));
  return palette[idx];
}

function toggleLayerLock(layer) {
  const zip = getFeatureZip(layer.feature.properties);
  if (state.lockedLayer === layer) {
    clearLockedSelection();
    return;
  }
  // 换选另一区块时，先清空锁定并统一重算样式，否则上一块仍保留高亮描边
  state.lockedLayer = null;
  state.lockedZip = null;
  applyFilters();
  state.lockedLayer = layer;
  state.lockedZip = zip;
  const placeLocked = getPlaceLabelFromProps(layer.feature.properties);
  drawRadarByFeature(layer.feature, { locked: true });
  const hintEl = document.getElementById("selectionHint");
  if (hintEl) {
    hintEl.innerHTML =
      `<strong>操作提示：</strong>当前已固定 <strong>ZIP ${escapeHtml(zip)}</strong>${placeLocked ? ` <span class="hint-place">（${escapeHtml(placeLocked)}）</span>` : ""}。再次单击同一区块，或点击地图空白处，即可取消固定并恢复悬停预览。`;
  }
  applyLockedStyle();
}

function clearLockedSelection() {
  if (!state.lockedLayer) return;
  state.lockedLayer = null;
  state.lockedZip = null;
  const hintEl = document.getElementById("selectionHint");
  if (hintEl) {
    hintEl.innerHTML =
      "<strong>操作提示：</strong>在地图上移动鼠标可预览某一 ZIP 的雷达图；单击区块可「固定」该区域并加粗描边，再次单击同一区块或点击地图空白处即可取消。";
  }
  applyFilters();
  document.getElementById("radarTitle").textContent = "ZIP 环境画像（悬停地图上的区域）";
  drawRadarPlaceholder();
}

function applyLockedStyle() {
  if (!state.lockedLayer) return;
  const p = state.lockedLayer.feature.properties;
  const score = Number(p.environment_score || 0);
  // 不用近黑色粗描边：与邻区共用边会双线叠加，看起来像一片脏黑边；改用浅色高亮并置顶绘制
  state.lockedLayer.setStyle({
    color: "#fef08a",
    weight: 2.5,
    opacity: 1,
    lineCap: "round",
    lineJoin: "round",
    fillColor: getScoreColor(score),
    fillOpacity: 0.92,
  });
  if (typeof state.lockedLayer.bringToFront === "function") {
    state.lockedLayer.bringToFront();
  }
}

async function syncFacilityLayers() {
  if (!state.map) return;
  await ensureFacilityLayer("cooling", "h2bn-gu9k", "#3c98c9");
  await ensureFacilityLayer("restrooms", "i7jb-7jku", "#fc757b");
  await ensureFacilityLayer("fountains", "qnv7-p7a2", "#65bdba");

  for (const [k, meta] of Object.entries(state.facilityLayers)) {
    if (!meta.layer) continue;
    if (meta.enabled) {
      if (!state.map.hasLayer(meta.layer)) meta.layer.addTo(state.map);
    } else {
      if (state.map.hasLayer(meta.layer)) state.map.removeLayer(meta.layer);
    }
  }
}

async function ensureFacilityLayer(key, datasetId, color) {
  const meta = state.facilityLayers[key];
  if (!meta) return;
  if (meta.loaded) return;
  if (!meta.enabled) return;

  const rows = await fetchSocrataAll(datasetId);
  const group = L.layerGroup();
  for (const r of rows) {
    const pt = extractLonLat(r);
    if (!pt) continue;
    const [lon, lat] = pt;
    const m = L.circleMarker([lat, lon], {
      radius: 3,
      color: "rgba(255,255,255,0.8)",
      weight: 1,
      fillColor: color,
      fillOpacity: state.facilityOpacity,
    });
    const name = r.propertyname || r.name || r.site_name || r.location_name || "";
    const boro = r.borough || "";
    m.bindPopup(`<strong>${escapeHtml(String(name || "设施点位"))}</strong><div>${escapeHtml(String(boro))}</div>`);
    m.addTo(group);
  }
  meta.layer = group;
  meta.loaded = true;
}

function refreshFacilityLayerStyle() {
  for (const meta of Object.values(state.facilityLayers)) {
    if (!meta.layer) continue;
    if (typeof meta.layer.eachLayer !== "function") continue;
    meta.layer.eachLayer((m) => {
      if (m && typeof m.setStyle === "function") {
        m.setStyle({ fillOpacity: state.facilityOpacity });
      }
    });
  }
}

async function fetchSocrataAll(datasetId) {
  const base = `https://data.cityofnewyork.us/resource/${datasetId}.json`;
  const limit = 50000;
  let offset = 0;
  const out = [];
  while (true) {
    const url = `${base}?%24limit=${limit}&%24offset=${offset}`;
    const resp = await fetch(url);
    if (!resp.ok) break;
    const chunk = await resp.json();
    if (!chunk || chunk.length === 0) break;
    out.push(...chunk);
    if (chunk.length < limit) break;
    offset += limit;
  }
  return out;
}

function extractLonLat(row) {
  const lon = Number(row.longitude ?? row.x);
  const lat = Number(row.latitude ?? row.y);
  if (Number.isFinite(lon) && Number.isFinite(lat) && lon < -70 && lon > -80 && lat > 39 && lat < 43) return [lon, lat];
  const loc = row.location || row.the_geom || row.geom;
  if (loc && typeof loc === "object" && Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
    const lon2 = Number(loc.coordinates[0]);
    const lat2 = Number(loc.coordinates[1]);
    if (Number.isFinite(lon2) && Number.isFinite(lat2)) return [lon2, lat2];
  }
  return null;
}

function renderInsights() {
  const list = document.getElementById("insightList");
  if (!list) return;
  const rows = state.envRecords.map((r) => ({
    zip: String(r.zip_code),
    ...r.environment,
  }));
  if (!rows.length) {
    list.innerHTML = "<li>当前没有可展示的数据，请检查数据文件是否已正确生成并放在约定路径下。</li>";
    return;
  }

  const top = [...rows].sort((a, b) => b.environment_score - a.environment_score)[0];
  const bottom = [...rows].sort((a, b) => a.environment_score - b.environment_score)[0];
  const top3 = [...rows]
    .sort((a, b) => b.environment_score - a.environment_score)
    .slice(0, 3)
    .map((d) => `${d.zip}（${d.environment_score} 分）`)
    .join("、");
  const bottom3 = [...rows]
    .sort((a, b) => a.environment_score - b.environment_score)
    .slice(0, 3)
    .map((d) => `${d.zip}（${d.environment_score} 分）`)
    .join("、");

  const bestDim = maxMetric(top);
  const worstDim = minMetric(bottom);
  const avg = mean(rows.map((d) => d.environment_score)).toFixed(1);

  const kpiZipCount = document.getElementById("kpiZipCount");
  const kpiAvg = document.getElementById("kpiAvg");
  const kpiBest = document.getElementById("kpiBest");
  const kpiWorst = document.getElementById("kpiWorst");
  if (kpiZipCount) kpiZipCount.textContent = String(rows.length);
  if (kpiAvg) kpiAvg.textContent = avg;
  if (kpiBest) kpiBest.textContent = `${top.zip} · ${top.environment_score}`;
  if (kpiWorst) kpiWorst.textContent = `${bottom.zip} · ${bottom.environment_score}`;

  list.innerHTML = "";
  addInsight(
    `在本次载入的 ${rows.length} 个 ZIP 中，环境综合分的平均值约为 ${avg} 分——可作为你在地图上判断「整体偏绿还是偏黄/红」的参照。`
  );
  addInsight(`综合分相对更突出的区域包括：${top3}；相对更需要结合雷达图细看的区域包括：${bottom3}。`);
  addInsight(
    `ZIP ${top.zip} 在三项指标里相对最强的是「${bestDim}」；ZIP ${bottom.zip} 则更容易在「${worstDim}」上拖低整体感受——可在地图上分别点开感受差异。`
  );
  addInsight(
    "探索顺序建议：先把综合分滑块调到你能接受的底线，再逐个勾选空气、安静度、绿荫——看地图上哪些区块被「过滤」掉，就能直观看到是哪一个维度在限制你的选择。"
  );

  function addInsight(text) {
    const li = document.createElement("li");
    li.textContent = text;
    list.appendChild(li);
  }
}

function maxMetric(row) {
  const dims = [
    ["空气质量", row.air_quality_score],
    ["低噪音", row.noise_score],
    ["绿化", row.green_score],
  ];
  dims.sort((a, b) => b[1] - a[1]);
  return dims[0][0];
}

function minMetric(row) {
  const dims = [
    ["空气质量", row.air_quality_score],
    ["低噪音", row.noise_score],
    ["绿化", row.green_score],
  ];
  dims.sort((a, b) => a[1] - b[1]);
  return dims[0][0];
}

function mean(nums) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function drawRadarPlaceholder() {
  drawRadar(
    {
      zip: "N/A",
      environment_score: 0,
      air_quality_score: 0,
      noise_score: 0,
      green_score: 0,
    },
    true
  );
}

function drawRadarByFeature(feature, opts) {
  const p = feature.properties;
  drawRadar(
    {
      zip: getFeatureZip(p),
      placeLabel: getPlaceLabelFromProps(p),
      locked: Boolean(opts && opts.locked),
      environment_score: +p.environment_score,
      air_quality_score: +p.air_quality_score,
      noise_score: +p.noise_score,
      green_score: +p.green_score,
    },
    false
  );
}

function drawRadar(row, isPlaceholder) {
  const svg = d3.select("#radar");
  svg.selectAll("*").remove();

  const embed = document.documentElement.classList.contains("embed-mode");
  const axisFontPx = embed ? 30 : 15;
  const axisLabelOffset = embed ? 40 : 22;

  const w = 420;
  const h = 360;
  const cx = w / 2;
  const cy = h / 2;
  const radius = 118;
  const axes = ["air_quality_score", "noise_score", "green_score"];
  const labels = ["空气 Air", "安静 Noise", "绿荫 Green"];
  const angle = (Math.PI * 2) / axes.length;
  const r = d3.scaleLinear().domain([0, 100]).range([0, radius]);

  const defs = svg.append("defs");
  const grad = defs
    .append("linearGradient")
    .attr("id", "radarFillGrad")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "100%");
  grad.append("stop").attr("offset", "0%").attr("stop-color", isPlaceholder ? "#94a3b8" : "#22c55e").attr("stop-opacity", 0.35);
  grad.append("stop").attr("offset", "100%").attr("stop-color", isPlaceholder ? "#64748b" : "#0284c7").attr("stop-opacity", 0.45);

  for (let i = 1; i <= 5; i++) {
    const rr = (radius * i) / 5;
    svg
      .append("circle")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", rr)
      .attr("fill", "none")
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", i === 5 ? 1.25 : 1);
  }

  axes.forEach((k, i) => {
    const a = -Math.PI / 2 + i * angle;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    svg
      .append("line")
      .attr("x1", cx)
      .attr("y1", cy)
      .attr("x2", x)
      .attr("y2", y)
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 1);
    svg
      .append("text")
      .attr("x", cx + Math.cos(a) * (radius + axisLabelOffset))
      .attr("y", cy + Math.sin(a) * (radius + axisLabelOffset))
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-size", axisFontPx)
      .attr("font-weight", 600)
      .attr("fill", "#334155")
      .text(labels[i]);
  });

  const points = axes.map((k, i) => {
    const a = -Math.PI / 2 + i * angle;
    const rr = r(row[k] || 0);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });

  svg
    .append("polygon")
    .attr("points", points.map((d) => d.join(",")).join(" "))
    .attr("fill", "url(#radarFillGrad)")
    .attr("stroke", isPlaceholder ? "#64748b" : "#15803d")
    .attr("stroke-width", 2)
    .attr("stroke-linejoin", "round");

  if (!isPlaceholder) {
    const place = row.placeLabel ? ` · ${row.placeLabel}` : "";
    document.getElementById("radarTitle").textContent = row.locked
      ? `ZIP 环境画像 · 已固定 ${row.zip}${place}`
      : `ZIP 环境画像 · ${row.zip}${place}`;
  } else {
    document.getElementById("radarTitle").textContent = "ZIP 环境画像（悬停地图上的区域）";
  }
  renderMetaCard(row, isPlaceholder);
}

function renderMetaCard(row, isPlaceholder) {
  const el = document.getElementById("meta");
  if (!el) return;
  if (isPlaceholder) {
    el.className = "meta-card is-placeholder";
    el.innerHTML = "将鼠标移到地图上的某一邮政编码区域，这里会显示该区的综合分与三项细分的文字摘要。";
    return;
  }
  el.className = "meta-card";
  const air = Math.round(Number(row.air_quality_score) || 0);
  const noise = Math.round(Number(row.noise_score) || 0);
  const green = Math.round(Number(row.green_score) || 0);
  const total = Math.round(Number(row.environment_score) || 0);
  const placeLine = row.placeLabel
    ? `<div class="meta-place">${escapeHtml(row.placeLabel)}</div><p class="meta-place-note">地名来自邮编边界数据中的邮局常用名与行政区，便于定位，不等同于官方邻里划分。</p>`
    : "";
  el.innerHTML = `
    <div class="meta-zip">ZIP ${escapeHtml(String(row.zip))} · 综合 ${total}</div>
    ${placeLine}
    <dl>
      <dt>空气</dt><dd>${air} / 100 — 相对呼吸环境</dd>
      <dt>安静</dt><dd>${noise} / 100 — 相对安静程度（基于相关诉求）</dd>
      <dt>绿荫</dt><dd>${green} / 100 — 相对树木覆盖</dd>
    </dl>
  `;
}
