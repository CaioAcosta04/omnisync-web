import { useEffect, useMemo, useRef, useState } from 'react'
import type { DashboardSalesDay } from '../services/dashboardApi'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const NUM = new Intl.NumberFormat('pt-BR')
const NUM_COMPACT = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const WEEKDAY = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })

/** Altura usada antes do ResizeObserver medir o card (o gráfico cresce para preenchê-lo). */
const DEFAULT_HEIGHT = 240
const PAD = { top: 16, right: 14, bottom: 28, left: 50 }
/** Acima de 12 pontos (ex.: 30 dias) os rótulos do eixo X ficam esparsos. */
const DENSE_THRESHOLD = 12
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1]

function parseDate(dateStr: string): Date | null {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? `${dateStr}T00:00:00` : dateStr
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function weekdayLabel(dateStr: string): string {
  const date = parseDate(dateStr)
  if (!date) return dateStr
  const label = WEEKDAY.format(date).replace('.', '')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function dayMonthLabel(dateStr: string): string {
  const date = parseDate(dateStr)
  if (!date) return dateStr
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
}

function fullDateLabel(dateStr: string): string {
  const date = parseDate(dateStr)
  if (!date) return dateStr
  return `${weekdayLabel(dateStr)}, ${dayMonthLabel(dateStr)}`
}

/** Arredonda o topo da escala para um valor "redondo", sem sobrar demais. */
function niceMax(max: number): number {
  if (max <= 0) return 0
  const pow = 10 ** Math.floor(Math.log10(max))
  const n = max / pow
  let f: number
  if (n <= 1) f = 1
  else if (n <= 1.5) f = 1.5
  else if (n <= 2) f = 2
  else if (n <= 2.5) f = 2.5
  else if (n <= 3) f = 3
  else if (n <= 4) f = 4
  else if (n <= 5) f = 5
  else f = 10
  return f * pow
}

/** Retângulo com os cantos superiores arredondados. */
function roundedTopBar(x: number, barTop: number, width: number, height: number, radius: number): string {
  if (height <= 0) return ''
  const r = Math.min(radius, height, width / 2)
  const bottom = barTop + height
  return `M${x},${bottom} L${x},${barTop + r} Q${x},${barTop} ${x + r},${barTop} L${x + width - r},${barTop} Q${x + width},${barTop} ${x + width},${barTop + r} L${x + width},${bottom} Z`
}

type SalesByDayChartProps = {
  data: DashboardSalesDay[]
}

export function SalesByDayChart({ data }: SalesByDayChartProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect) setSize({ width: rect.width, height: rect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const geometry = useMemo(() => {
    const w = size.width || 600
    const h = size.height || DEFAULT_HEIGHT
    const n = data.length
    const plotW = Math.max(0, w - PAD.left - PAD.right)
    const plotH = Math.max(0, h - PAD.top - PAD.bottom)
    const rawMax = Math.max(0, ...data.map((d) => d.total))
    const max = niceMax(rawMax) || 1
    const slot = n > 0 ? plotW / n : plotW
    const barWidth = Math.max(2, Math.min(slot * 0.62, 26))
    const radius = Math.min(barWidth / 2, 4)

    const bars = data.map((point, i) => {
      const height = plotH * (point.total / max)
      const center = PAD.left + slot * i + slot / 2
      const barTop = PAD.top + plotH - height
      return {
        i,
        point,
        center,
        slotStart: PAD.left + slot * i,
        slot,
        barX: center - barWidth / 2,
        barTop,
        height,
        isMax: rawMax > 0 && point.total === rawMax,
      }
    })

    // Rótulos do eixo X: todos quando poucos, esparsos (~6) quando muitos.
    let labelIndices: number[]
    if (n <= DENSE_THRESHOLD) {
      labelIndices = data.map((_, i) => i)
    } else {
      const set = new Set<number>()
      for (let k = 0; k < 6; k++) set.add(Math.round((k * (n - 1)) / 5))
      labelIndices = [...set]
    }

    return { w, h, max, plotH, barWidth, radius, bars, labelIndices, dense: n > DENSE_THRESHOLD }
  }, [data, size])

  const { w, h, max, plotH, bars, labelIndices, dense, radius, barWidth } = geometry
  const hovered = hover != null ? bars[hover] : null

  return (
    <div
      ref={wrapRef}
      style={styles.wrap}
      onMouseLeave={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height="100%"
        style={styles.svg}
        role="img"
        aria-label="Gráfico de vendas por dia"
      >
        {/* Linhas de grade + rótulos do eixo Y */}
        {Y_TICKS.map((t) => {
          const y = PAD.top + plotH * (1 - t)
          return (
            <g key={t}>
              <line
                x1={PAD.left}
                y1={y}
                x2={w - PAD.right}
                y2={y}
                stroke={t === 0 ? '#e2e8f0' : '#f1f5f9'}
                strokeWidth={1}
              />
              <text x={PAD.left - 8} y={y + 3} textAnchor="end" style={styles.yLabel}>
                {t === 0 ? '0' : NUM_COMPACT.format(max * t)}
              </text>
            </g>
          )
        })}

        {/* Barras */}
        {bars.map((bar) => {
          const fill =
            hover === bar.i ? '#4f46e5' : bar.isMax ? '#6366f1' : '#c7d2fe'
          const path = roundedTopBar(bar.barX, bar.barTop, barWidth, bar.height, radius)
          return path ? <path key={bar.i} d={path} fill={fill} /> : null
        })}

        {/* Rótulos do eixo X */}
        {labelIndices.map((i) => {
          const bar = bars[i]
          if (!bar) return null
          return (
            <text key={i} x={bar.center} y={h - 10} textAnchor="middle" style={styles.xLabel}>
              {dense ? dayMonthLabel(bar.point.date) : weekdayLabel(bar.point.date)}
            </text>
          )
        })}

        {/* Áreas de hover (transparentes, cobrem toda a altura do slot) */}
        {bars.map((bar) => (
          <rect
            key={`hit-${bar.i}`}
            x={bar.slotStart}
            y={PAD.top}
            width={bar.slot}
            height={plotH}
            fill="transparent"
            style={{ pointerEvents: 'all' }}
            onMouseEnter={() => setHover(bar.i)}
          />
        ))}
      </svg>

      {hovered && (
        <div
          style={{
            ...styles.tooltip,
            left: `${Math.min(93, Math.max(7, (hovered.center / w) * 100))}%`,
            top: `${((PAD.top + plotH - hovered.height) / h) * 100}%`,
          }}
        >
          <strong style={styles.tooltipValue}>{BRL.format(hovered.point.total)}</strong>
          <span style={styles.tooltipMeta}>
            {fullDateLabel(hovered.point.date)} · {NUM.format(hovered.point.count)} venda
            {hovered.point.count === 1 ? '' : 's'}
          </span>
        </div>
      )}
    </div>
  )
}

const styles = {
  wrap: {
    position: 'relative' as const,
    flex: 1,
    minHeight: '220px',
    boxSizing: 'border-box' as const,
  },
  svg: {
    position: 'absolute' as const,
    inset: 0,
    display: 'block',
    width: '100%',
    height: '100%',
  },
  yLabel: {
    font: '500 10px system-ui, sans-serif',
    fill: '#cbd5e1',
  },
  xLabel: {
    font: '600 11px system-ui, sans-serif',
    fill: '#94a3b8',
  },
  tooltip: {
    position: 'absolute' as const,
    transform: 'translate(-50%, calc(-100% - 6px))',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: '8px',
    padding: '6px 9px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1px',
    pointerEvents: 'none' as const,
    whiteSpace: 'nowrap' as const,
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.18)',
    zIndex: 2,
  },
  tooltipValue: {
    fontSize: '12px',
    fontWeight: 700,
    lineHeight: 1.3,
  },
  tooltipMeta: {
    fontSize: '11px',
    color: '#cbd5e1',
    lineHeight: 1.3,
  },
} as const
