import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm'

/** 仅显示总人口排名前 N 的 ZIP */
const TOP_ZIP_N = 20

/** 下图年份区域左缘基准；极窄窗口会在 layoutMargins 中压缩 */
const GRID_YEAR_AXIS_LEFT_BASE = 92
/** 右侧年均堆叠条布局 */
const GRID_RIGHT_INNER = { gap: 8, barMaxW: 108, padR: 10 }

/** 族裔配色（与图例一致：白 / 黑 / 亚 / 西语 / 其他） */
const RACES = [
  { key: 'white_population', label: '白人', color: '#B1B1D7' },
  { key: 'black_population', label: '黑人', color: '#E66771' },
  { key: 'asian_population', label: '亚裔', color: '#F5A896' },
  { key: 'hispanic_population', label: '西语裔', color: '#D1D1E9' },
  { key: 'other_population', label: '其他', color: '#CCCCCC' },
]

const csvPath = './data/processed-timeseries/nyc_zipcode_population_2010_2024_long.csv'

/** 与 .viz-frame 中图内文字一致（SVG 不继承 HTML 字体，需显式设置） */
const VIZ_FONT_FAMILY = '"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif'
const VIZ_FONT_SIZE = 12
const VIZ_FONT_WEIGHT = 400
/** 柱顶总量标签：略小字号 + 旋转，避免相邻年份水平重叠 */
const TOTAL_LABEL_FONT_SIZE = 10
const TOTAL_LABEL_ROT_DEG = -44

function applySvgTextStyle(selection) {
  return selection
    .attr('font-family', VIZ_FONT_FAMILY)
    .attr('font-size', VIZ_FONT_SIZE)
    .attr('font-weight', VIZ_FONT_WEIGHT)
    .attr('fill', '#000000')
}

function shortZipAlias(name) {
  const raw = String(name ?? '').trim()
  if (!raw) return ''
  const seg = raw.split(/[\/,()-]/)[0].trim() || raw
  return seg.length > 12 ? `${seg.slice(0, 11)}…` : seg
}

/** 下图纵轴括号内：ZIP → 中文区域名（取表中第一个中文译名） */
const ZIP_CN_AREA_FIRST = {
  10001: '切尔西',
  10002: '下东区',
  10003: '东村',
  10004: '金融区',
  10012: '苏豪区',
  10013: '翠贝卡',
  10019: '中城北',
  10021: '上东区',
  10023: '上西区',
  10025: '曼哈顿谷',
  10027: '哈林区',
  10036: '地狱厨房',
  11101: '长岛市',
  11102: '阿斯托利亚',
  11354: '法拉盛',
  11355: '法拉盛',
  11361: '贝赛',
  11368: '科罗纳',
  11372: '杰克逊高地',
  11373: '艾姆赫斯特',
  11374: '雷哥公园',
  11375: '森林小丘',
  11201: '布鲁克林高地',
  11206: '威廉斯堡',
  11209: '湾脊区',
  11211: '威廉斯堡',
  11215: '公园坡',
  11220: '日落公园',
  11223: '葛雷夫森德',
  11235: '羊头湾',
  10451: '高桥',
  10458: '福特汉姆',
  10461: '莫里斯公园',
  10463: '金斯布里奇',
  10471: '里弗代尔',
  10301: '圣乔治',
  10305: '罗斯班克',
  10306: '新多普',
  10314: '新斯普林维尔',
  10456: '莫里萨尼亚',
  10467: '诺伍德',
  11207: '柏丘',
  11208: '东纽约',
  11214: '巴斯海滩',
  11219: '博罗公园',
  11221: '布什维克',
  11226: '弗拉特布什',
  11230: '米德伍德',
  11234: '海洋公园',
  11236: '卡纳西',
  11377: '伍德赛德',
  11385: '里奇伍德',
}

function zipParenLabel(zip, zipNameByZip) {
  const z = String(zip)
  const cn = ZIP_CN_AREA_FIRST[z]
  if (cn) return `(${cn})`
  return `(${shortZipAlias(zipNameByZip.get(z))})`
}

function rightExtraWidth() {
  return GRID_RIGHT_INNER.gap + GRID_RIGHT_INNER.barMaxW + GRID_RIGHT_INNER.padR
}

function layoutMargins(totalWidth) {
  const minLeft = 44
  const span = 520 - 280
  const frac = Math.max(0, Math.min(1, (totalWidth - 280) / span))
  const left = Math.round(minLeft + (GRID_YEAR_AXIS_LEFT_BASE - minLeft) * frac)
  const marginRight = totalWidth < 400 ? 14 : 24
  return { left, marginRight }
}

/** 左缘、年份区宽度；保证 left + plotW + marginRight + 右侧条带 = totalWidth */
function computePlotLayout(totalWidth) {
  const { left, marginRight } = layoutMargins(totalWidth)
  const plotW = Math.max(12, totalWidth - left - marginRight - rightExtraWidth())
  return { left, marginRight, plotW }
}

const interactionState = {
  hoverYear: null,
  hoverZip: null,
  hoverCell: null,
  pinnedYear: null,
  pinnedZip: null,
}

let rafRendering = false
let listenersBound = false

function activeYear() {
  return interactionState.pinnedYear ?? interactionState.hoverYear
}

function activeZip() {
  return interactionState.pinnedZip ?? interactionState.hoverZip
}

function activeCell() {
  return interactionState.hoverCell
}

function scheduleRender() {
  if (rafRendering) return
  rafRendering = true
  requestAnimationFrame(() => {
    rafRendering = false
    layoutAndRender()
  })
}

function buildLegend() {
  const legend = d3.select('#legend')
  legend.selectAll('*').remove()
  RACES.forEach((r) => {
    const item = legend.append('div').attr('class', 'legend-item')
    item.append('span').attr('class', 'legend-swatch').style('background', r.color)
    item.append('span').text(r.label)
  })
}

function renderStacked(rows, years, layout) {
  const { width, height } = layout
  const svg = d3.select('#stacked-chart')
  const { left, marginRight, plotW } = computePlotLayout(width)
  const margin = {
    top: Math.max(22, Math.min(42, height * 0.14)),
    right: marginRight,
    bottom: Math.max(26, Math.min(48, height * 0.16)),
    left,
  }
  const fullWidth = width

  svg
    .attr('viewBox', `0 0 ${fullWidth} ${height}`)
    .attr('width', '100%')
    .attr('height', '100%')
  svg.selectAll('*').remove()

  const plotH = height - margin.top - margin.bottom
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  const byYear = d3.rollup(
    rows,
    (v) => {
      const o = { year: Number(v[0].year), total_population: 0 }
      RACES.forEach((r) => {
        o[r.key] = d3.sum(v, (d) => Number(d[r.key] ?? 0))
        o.total_population += o[r.key]
      })
      return o
    },
    (d) => Number(d.year),
  )
  const data = years.map((y) => byYear.get(y)).filter(Boolean)

  const x = d3.scaleBand().domain(years).range([0, plotW]).paddingInner(0).paddingOuter(0)
  const stackGen = d3.stack().keys(RACES.map((r) => r.key))
  const series = stackGen(data)

  const maxWan = d3.max(data, (d) => d.total_population) / 10000
  const y = d3
    .scaleLinear()
    .domain([0, maxWan * 1.12])
    .nice()
    .range([plotH, 0])

  g.append('g')
    .attr('opacity', 0.35)
    .call(d3.axisLeft(y).ticks(6).tickSize(-plotW).tickFormat(() => ''))
    .selectAll('line')
    .attr('stroke', '#bcbcbc')

  const layer = g
    .selectAll('g.layer')
    .data(series)
    .join('g')
    .attr('fill', (d) => RACES.find((r) => r.key === d.key).color)

  const barW = x.bandwidth() * 0.52
  const barX = (year) => x(year) + (x.bandwidth() - barW) / 2

  layer
    .selectAll('rect')
    .data((d) => d)
    .join('rect')
    .attr('x', (_d, i) => barX(data[i].year))
    .attr('y', (d) => y(d[1] / 10000))
    .attr('height', (d) => Math.max(0, y(d[0] / 10000) - y(d[1] / 10000)))
    .attr('width', barW)
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 0.35)
    .attr('opacity', (_d, i) => {
      const ay = activeYear()
      return ay == null || data[i].year === ay ? 1 : 0.18
    })

  g.selectAll('text.total-label')
    .data(data)
    .join('text')
    .attr('class', 'total-label')
    .attr('x', (d) => x(d.year) + x.bandwidth() / 2)
    .attr('y', (d) => y(d.total_population / 10000) - 6)
    .attr('text-anchor', 'middle')
    .attr('font-family', VIZ_FONT_FAMILY)
    .attr('font-size', TOTAL_LABEL_FONT_SIZE)
    .attr('font-weight', VIZ_FONT_WEIGHT)
    .attr('fill', '#000000')
    .attr('transform', (d) => {
      const cx = x(d.year) + x.bandwidth() / 2
      const cy = y(d.total_population / 10000) - 6
      return `rotate(${TOTAL_LABEL_ROT_DEG} ${cx} ${cy})`
    })
    .attr('opacity', (d) => {
      const ay = activeYear()
      return ay == null || d.year === ay ? 1 : 0.22
    })
    .text((d) => `${(d.total_population / 10000).toFixed(1)}万`)

  g.append('g')
    .selectAll('rect.hitbox')
    .data(data)
    .join('rect')
    .attr('class', 'hitbox')
    .attr('x', (d) => x(d.year))
    .attr('y', 0)
    .attr('width', x.bandwidth())
    .attr('height', plotH)
    .attr('fill', 'transparent')
    .style('cursor', 'pointer')
    .on('mouseenter', (_event, d) => {
      interactionState.hoverYear = d.year
      scheduleRender()
    })
    .on('mouseleave', () => {
      interactionState.hoverYear = null
      scheduleRender()
    })
    .on('click', (event, d) => {
      event.stopPropagation()
      interactionState.pinnedYear = interactionState.pinnedYear === d.year ? null : d.year
      scheduleRender()
    })

  applySvgTextStyle(
    g.append('g').attr('transform', `translate(0,${plotH})`).call(d3.axisBottom(x).tickValues(years)).selectAll('text'),
  )

  applySvgTextStyle(
    g.append('g').call(d3.axisLeft(y).ticks(6).tickFormat((d) => `${d}`)).selectAll('text'),
  )

  applySvgTextStyle(
    g
      .append('text')
      .attr('x', plotW / 2)
      .attr('y', plotH + margin.bottom - 6)
      .attr('text-anchor', 'middle')
      .text('年份'),
  )
  applySvgTextStyle(
    g
      .append('text')
      .attr('x', -plotH / 2)
      .attr('y', -Math.min(52, margin.left - 8))
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle')
      .text('人口（万）'),
  )
}

function renderGrid(rows, years, zips, zipNameByZip, layout) {
  const canvas = d3.select('#grid-canvas').node()
  const axisSvg = d3.select('#grid-axis')
  if (!canvas) return

  const { width: layoutW, height: layoutH } = layout
  const width = Math.max(1, Math.floor(layoutW))
  const height = Math.max(1, Math.floor(layoutH))

  const { left, marginRight, plotW } = computePlotLayout(width)
  const margin = {
    top: Math.max(12, Math.min(22, height * 0.045)),
    right: marginRight,
    bottom: Math.max(26, Math.min(44, height * 0.11)),
    left,
  }
  const cellW = plotW / years.length

  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.max(1, Math.floor(width * dpr))
  canvas.height = Math.max(1, Math.floor(height * dpr))
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  axisSvg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', '100%')
  axisSvg.selectAll('*').remove()

  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  const x = d3
    .scaleBand()
    .domain(years)
    .range([margin.left, margin.left + plotW])
    .paddingInner(0)
    .paddingOuter(0)
  const y = d3.scaleBand().domain(zips).range([margin.top, height - margin.bottom]).paddingInner(0.06)

  const cellTotalPop = (d) =>
    RACES.reduce((s, r) => s + Math.max(0, Number(d[r.key] ?? 0)), 0)
  const globalMaxCellTotal = d3.max(rows, cellTotalPop) || 1

  const rowMap = new Map(rows.map((d) => [`${d.year}|${d.zipcode}`, d]))
  const innerPad = 0.5

  const rightBarX = margin.left + plotW + GRID_RIGHT_INNER.gap
  const { barMaxW } = GRID_RIGHT_INNER
  const avgByZip = new Map()
  for (const zip of zips) {
    const sub = rows.filter((d) => String(d.zipcode) === zip)
    const avgs = RACES.map((r) => {
      const m = d3.mean(sub, (d) => Number(d[r.key] ?? 0))
      return Number.isFinite(m) ? Math.max(0, m) : 0
    })
    avgByZip.set(zip, avgs)
  }
  const sumAvg = (avgs) => d3.sum(avgs)
  const globalMaxSumAvg = d3.max(zips, (z) => sumAvg(avgByZip.get(z))) || 1

  for (const zip of zips) {
    const avgs = avgByZip.get(zip)
    const total = sumAvg(avgs)
    const y0 = y(zip)
    const bh = y.bandwidth()
    const innerBarH = bh * 0.68
    const barY = y0 + (bh - innerBarH) / 2

    ctx.strokeStyle = '#d4d4d4'
    ctx.lineWidth = 0.5
    ctx.strokeRect(rightBarX - 0.5, barY - 0.5, barMaxW + 1, innerBarH + 1)

    if (total > 0) {
      const barW = (total / globalMaxSumAvg) * barMaxW
      let curX = rightBarX
      RACES.forEach((race, i) => {
        if (avgs[i] <= 0) return
        const segW = (avgs[i] / total) * barW
        if (segW > 0) {
          ctx.fillStyle = race.color
          ctx.fillRect(curX, barY, segW, innerBarH)
          curX += segW
        }
      })
    }

    if (activeZip() === zip) {
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.strokeRect(rightBarX - 1.2, barY - 1.2, barMaxW + 2.4, innerBarH + 2.4)
    }
  }

  for (const year of years) {
    for (const zip of zips) {
      const row = rowMap.get(`${year}|${zip}`)
      const x0 = x(year)
      const y0 = y(zip)
      const bw = x.bandwidth()
      const bh = y.bandwidth()
      const innerW = Math.max(0, bw - 2 * innerPad)
      const innerH = Math.max(0, bh - 2 * innerPad)
      const ix = x0 + innerPad
      const iy = y0 + innerPad

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x0, y0, bw, bh)

      if (!row) {
        ctx.fillStyle = '#f0f0f0'
        ctx.fillRect(ix, iy, innerW, innerH)
      } else {
        const counts = RACES.map((r) => Math.max(0, Number(row[r.key] ?? 0)))
        const total = d3.sum(counts)
        if (total <= 0) {
          ctx.fillStyle = '#e8e8e8'
          ctx.fillRect(ix, iy, innerW, innerH)
        } else {
          // 预览版本：每个网格用 5 个种族散点表示，点大小映射该格人口规模。
          const cxStep = innerW / (RACES.length + 1)
          const cy = iy + innerH * 0.5
          const maxR = Math.max(1.2, Math.min(innerW / 7.5, innerH / 2.25))
          const minR = Math.max(0.8, maxR * 0.24)
          RACES.forEach((race, i) => {
            const c = counts[i]
            if (c <= 0) return
            const ratio = c / globalMaxCellTotal
            const r = minR + (maxR - minR) * Math.sqrt(Math.max(0, Math.min(1, ratio)))
            const cx = ix + cxStep * (i + 1)
            ctx.beginPath()
            ctx.arc(cx, cy, r, 0, Math.PI * 2)
            ctx.fillStyle = race.color
            ctx.fill()
            ctx.lineWidth = 0.45
            ctx.strokeStyle = 'rgba(255,255,255,0.9)'
            ctx.stroke()
          })
        }
      }

      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 0.65
      ctx.strokeRect(x0, y0, bw, bh)
    }
  }

  const ay = activeYear()
  if (ay != null && years.includes(ay)) {
    const x0 = x(ay)
    ctx.fillStyle = 'rgba(0, 188, 212, 0.24)'
    ctx.fillRect(x0, margin.top, x.bandwidth(), height - margin.top - margin.bottom)
    ctx.strokeStyle = 'rgba(0, 96, 110, 0.95)'
    ctx.lineWidth = 1.8
    ctx.strokeRect(x0 + 0.7, margin.top + 0.7, x.bandwidth() - 1.4, height - margin.top - margin.bottom - 1.4)
  }

  const az = activeZip()
  if (az != null && zips.includes(az)) {
    const y0 = y(az)
    ctx.fillStyle = 'rgba(30, 64, 175, 0.24)'
    ctx.fillRect(margin.left, y0, plotW + GRID_RIGHT_INNER.gap + GRID_RIGHT_INNER.barMaxW, y.bandwidth())
    ctx.strokeStyle = 'rgba(14, 40, 120, 0.95)'
    ctx.lineWidth = 1.8
    ctx.strokeRect(
      margin.left + 0.7,
      y0 + 0.7,
      plotW + GRID_RIGHT_INNER.gap + GRID_RIGHT_INNER.barMaxW - 1.4,
      y.bandwidth() - 1.4,
    )
  }

  const ac = activeCell()
  if (ac && years.includes(ac.year) && zips.includes(ac.zip)) {
    const cx = x(ac.year)
    const cy = y(ac.zip)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)'
    ctx.fillRect(cx + 1, cy + 1, x.bandwidth() - 2, y.bandwidth() - 2)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2.2
    ctx.strokeRect(cx + 0.8, cy + 0.8, x.bandwidth() - 1.6, y.bandwidth() - 1.6)
  }

  applySvgTextStyle(
    axisSvg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickValues(years))
      .selectAll('text'),
  )

  const yAxisG = axisSvg
    .append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickValues(zips).tickFormat((zip) => `${zip}`))

  applySvgTextStyle(yAxisG.selectAll('text')).attr('font-size', 10)

  yAxisG.selectAll('.tick text').each(function (zip) {
    const text = d3.select(this)
    text.text(null)
    text
      .append('tspan')
      .attr('x', -9)
      .attr('dy', '-0.2em')
      .text(String(zip))
    text
      .append('tspan')
      .attr('x', -9)
      .attr('dy', '1.08em')
      .text(zipParenLabel(zip, zipNameByZip))
  })

  applySvgTextStyle(
    axisSvg.append('text').attr('x', width / 2).attr('y', height - 6).attr('text-anchor', 'middle').text('年份'),
  )

  applySvgTextStyle(
    axisSvg
      .append('text')
      .attr('x', 12)
      .attr('y', margin.top + (height - margin.top - margin.bottom) / 2)
      .attr('transform', `rotate(-90, 12, ${margin.top + (height - margin.top - margin.bottom) / 2})`)
      .attr('text-anchor', 'middle')
      .text('人口排名前20的zipcode'),
  )

  applySvgTextStyle(
    axisSvg
      .append('text')
      .attr('x', rightBarX + barMaxW / 2)
      .attr('y', height - 8)
      .attr('text-anchor', 'middle')
      .text('历年均值（人）'),
  )
}

let vizState = { rows: null, years: null, zips: null, zipNameByZip: null }

function layoutAndRender() {
  const { rows, years, zips, zipNameByZip } = vizState
  if (!rows || !years || !zips || !zipNameByZip) return

  const stackedPanel = document.getElementById('stacked-panel')
  const gridPanel = document.getElementById('grid-panel')
  if (!stackedPanel || !gridPanel) return

  const w = Math.floor(gridPanel.clientWidth)
  const hGrid = Math.floor(gridPanel.clientHeight)
  const hStack = Math.floor(stackedPanel.clientHeight)
  if (w < 80 || hGrid < 24 || hStack < 48) return

  renderStacked(rows, years, { width: w, height: hStack })
  renderGrid(rows, years, zips, zipNameByZip, { width: w, height: hGrid })
}

function getZipByY(py, yScale, zips) {
  for (const zip of zips) {
    const y0 = yScale(zip)
    if (py >= y0 && py <= y0 + yScale.bandwidth()) return zip
  }
  return null
}

function bindInteractions() {
  if (listenersBound) return
  listenersBound = true

  const gridPanel = document.getElementById('grid-panel')
  const stackedChart = document.getElementById('stacked-chart')
  if (!gridPanel || !stackedChart) return

  const pickGridTarget = (clientX, clientY) => {
    const { rows, years, zips } = vizState
    if (!rows || !years || !zips) return { year: null, zip: null, cell: null }
    const rect = gridPanel.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top
    const { left, plotW } = computePlotLayout(rect.width)
    const marginTop = Math.max(12, Math.min(22, rect.height * 0.045))
    const marginBottom = Math.max(26, Math.min(44, rect.height * 0.11))
    const x0 = left
    const x1 = left + plotW
    const yScale = d3.scaleBand().domain(zips).range([marginTop, rect.height - marginBottom]).paddingInner(0.06)
    const zip = getZipByY(py, yScale, zips)
    let year = null
    if (px >= x0 && px <= x1) {
      const idx = Math.floor(((px - x0) / plotW) * years.length)
      year = years[Math.max(0, Math.min(years.length - 1, idx))]
    }
    return { year, zip, cell: year != null && zip ? { year, zip } : null }
  }

  gridPanel.addEventListener('mousemove', (event) => {
    const target = pickGridTarget(event.clientX, event.clientY)
    interactionState.hoverYear = target.year
    interactionState.hoverZip = target.zip
    interactionState.hoverCell = target.cell
    scheduleRender()
  })

  gridPanel.addEventListener('mouseleave', () => {
    interactionState.hoverYear = null
    interactionState.hoverZip = null
    interactionState.hoverCell = null
    scheduleRender()
  })

  gridPanel.addEventListener('click', (event) => {
    const target = pickGridTarget(event.clientX, event.clientY)
    const ay = target.year
    const az = target.zip
    const clickedBlank = ay == null && az == null

    if (clickedBlank) {
      interactionState.pinnedYear = null
      interactionState.pinnedZip = null
    } else {
      if (ay != null) interactionState.pinnedYear = interactionState.pinnedYear === ay ? null : ay
      if (az != null) interactionState.pinnedZip = interactionState.pinnedZip === az ? null : az
    }
    scheduleRender()
  })

  stackedChart.addEventListener('mouseleave', () => {
    interactionState.hoverYear = null
    scheduleRender()
  })

  stackedChart.addEventListener('click', (event) => {
    if (event.target === stackedChart) {
      interactionState.pinnedYear = null
      interactionState.pinnedZip = null
      scheduleRender()
    }
  })

  document.getElementById('viz-frame')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      interactionState.pinnedYear = null
      interactionState.pinnedZip = null
      scheduleRender()
    }
  })
}

async function main() {
  buildLegend()
  const rows = await d3.csv(csvPath, d3.autoType)
  const years = [...new Set(rows.map((d) => Number(d.year)))].sort((a, b) => a - b)

  const zipTotals = d3.rollup(
    rows,
    (v) => d3.sum(v, (d) => Number(d.total_population ?? 0)),
    (d) => String(d.zipcode),
  )
  const zips = [...zipTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_ZIP_N)
    .map(([zip]) => zip)

  const zipNameByZip = new Map()
  for (const d of rows) {
    const zip = String(d.zipcode ?? '')
    const name = String(d.name ?? '').trim()
    if (!zipNameByZip.has(zip) && name) zipNameByZip.set(zip, name)
  }

  vizState = { rows, years, zips, zipNameByZip }
  bindInteractions()
  layoutAndRender()

  const frame = document.getElementById('viz-frame')
  if (frame && typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => layoutAndRender())
    })
    ro.observe(frame)
  } else {
    window.addEventListener('resize', () => requestAnimationFrame(() => layoutAndRender()))
  }
}

main().catch((err) => {
  document.body.innerHTML = `<pre style="padding:16px;color:#b00020;">加载失败：${String(err?.message ?? err)}</pre>`
})
