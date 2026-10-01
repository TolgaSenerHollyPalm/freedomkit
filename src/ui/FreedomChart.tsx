import { formatMonths } from '../money/amounts.ts'
import { shortMonth } from '../money/dates.ts'
import type { SeriesPoint } from '../money/freedom.ts'
import styles from './FreedomChart.module.css'

// The design's grid: 316 × 192, months from x 30 to 300.6, zero at y 164 and the axis top at y 10.
const WIDTH = 316
const LEFT = 30
const RIGHT = 300.6
const BOTTOM = 164
const TOP = 10

/** The fewest grid lines that still read: steps of 1, 2, 5, 10… with at most four above zero. */
function gridStep(top: number): number {
  for (const step of [1, 2, 5, 10, 20, 50, 100]) if (top / step <= 4) return step
  return Math.ceil(top / 4)
}

interface FreedomChartProps {
  points: readonly SeriesPoint[]
  goalMonths: number
  top: number // the axis top, a whole number above the goal and the highest point
  label: string // what the chart says, for screen readers
}

/** Freedom over the last months as one SVG: a line with gaps where a price was missing, the goal dashed across. */
export default function FreedomChart({ points, goalMonths, top, label }: FreedomChartProps) {
  const y = (months: number) => BOTTOM - (Math.max(months, 0) / top) * (BOTTOM - TOP)
  const x = (index: number) => (points.length === 1 ? (LEFT + RIGHT) / 2 : LEFT + (index * (RIGHT - LEFT)) / (points.length - 1))
  const step = gridStep(top)
  const grid = Array.from({ length: Math.floor((top - 1e-9) / step) }, (_, i) => (i + 1) * step)

  // Runs of known months; a missing price breaks the line.
  const runs: { index: number; months: number }[][] = [[]]
  points.forEach((point, index) => {
    if (point.months === null) runs.push([])
    else runs.at(-1)!.push({ index, months: point.months })
  })
  const lines = runs.filter((run) => run.length > 0)
  const lastIndex = points.length - 1
  const last = points[lastIndex]
  const bubble = last?.months != null ? `${formatMonths(Math.max(last.months, 0))} ay` : undefined
  const bubbleWidth = bubble ? bubble.length * 7.2 + 14 : 0
  const bubbleX = Math.min(Math.max(x(lastIndex) - bubbleWidth / 2, 0), WIDTH - bubbleWidth - 2)
  const bubbleY = last?.months != null ? Math.max(y(last.months) - 34, 0) : 0

  return (
    <svg className={styles.chart} viewBox={`0 0 ${WIDTH} 192`} role="img" aria-label={label}>
      {grid.map((value) => (
        <path key={value} className={styles.grid} d={`M22 ${y(value)}H${WIDTH}`} />
      ))}
      <path className={styles.base} d={`M22 ${BOTTOM}H${WIDTH}`} />
      <g className={styles.axis}>
        {[0, ...grid].map((value) => (
          <text key={value} x="12" y={y(value) + 4}>
            {value}
          </text>
        ))}
      </g>
      <path className={styles.goal} d={`M22 ${y(goalMonths)}H${WIDTH}`} />
      <text className={styles.goalLabel} x={WIDTH} y={y(goalMonths) - 7}>
        Hedef
      </text>
      {lines.map((run) => {
        const path = run.map((point, i) => `${i === 0 ? 'M' : 'L'}${x(point.index).toFixed(1)} ${y(point.months).toFixed(1)}`).join(' ')
        const first = x(run[0].index).toFixed(1)
        const end = x(run.at(-1)!.index).toFixed(1)
        return (
          <g key={run[0].index}>
            <path className={styles.area} d={`M${first} ${BOTTOM} ${path.replace(/^M/, 'L')} L${end} ${BOTTOM} Z`} />
            {run.length > 1 ? <path className={styles.line} d={path} /> : <circle className={styles.dot} cx={first} cy={y(run[0].months)} r="3.5" />}
          </g>
        )
      })}
      {bubble && last?.months != null && (
        <>
          <circle className={styles.point} cx={x(lastIndex)} cy={y(last.months)} r="5.5" />
          <rect className={styles.bubble} x={bubbleX} y={bubbleY} width={bubbleWidth} height="24" rx="12" />
          <text className={styles.bubbleText} x={bubbleX + bubbleWidth / 2} y={bubbleY + 16}>
            {bubble}
          </text>
        </>
      )}
      <g className={styles.months}>
        {points.map((point, index) =>
          index % 2 === 0 || index === lastIndex ? (
            <text key={point.month} className={index === lastIndex ? styles.current : undefined} x={x(index)} y="186">
              {shortMonth(point.month)}
            </text>
          ) : null,
        )}
      </g>
    </svg>
  )
}
