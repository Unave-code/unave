import React from 'react'

import type { DayPoint } from './series'

/**
 * A row of daily bars drawn as plain SVG on the server, so a dashboard widget
 * needs no chart library and no client JavaScript. One hue (Payload's success
 * scale, which the admin theme maps to the brand green); today's bar is full
 * strength and the days before it sit back a step. Each day carries a
 * full-height hit area with a native tooltip, and the whole chart a text
 * summary for screen readers.
 */
export const DayBars: React.FC<{
  /** What the chart counts, for the screen-reader summary: "orders". */
  noun: string
  points: DayPoint[]
  /** Turns a value into tooltip text; defaults to the bare number. */
  format?: (value: number) => string
  height?: number
  /** Print the first and last day under the bars. */
  showDates?: boolean
}> = ({ format = String, height = 40, noun, points, showDates = false }) => {
  const width = 280
  const gap = 2
  const radius = 2
  const barWidth = (width - gap * (points.length - 1)) / points.length
  const max = Math.max(1, ...points.map((p) => p.value))
  const total = points.reduce((sum, p) => sum + p.value, 0)

  const summary = `${noun}, last ${points.length} days: ${format(total)} in all, ${format(
    points[points.length - 1]?.value ?? 0,
  )} today.`

  return (
    <figure className="unave-daybars">
      <svg
        aria-label={summary}
        className="unave-daybars__svg"
        height={height}
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
      >
        <line
          className="unave-daybars__baseline"
          vectorEffect="non-scaling-stroke"
          x1={0}
          x2={width}
          y1={height - 0.5}
          y2={height - 0.5}
        />
        {points.map((point, i) => {
          const x = i * (barWidth + gap)
          const isToday = i === points.length - 1
          const h = point.value > 0 ? Math.max(3, (point.value / max) * (height - 2)) : 0
          const y = height - h
          const r = Math.min(radius, h / 2, barWidth / 2)

          return (
            <g className="unave-daybars__day" key={point.label}>
              <title>{`${point.label}: ${format(point.value)}`}</title>
              <rect
                className="unave-daybars__hit"
                height={height}
                width={barWidth + gap}
                x={x - gap / 2}
                y={0}
              />
              {h > 0 && (
                <path
                  className={`unave-daybars__bar${isToday ? ' unave-daybars__bar--today' : ''}`}
                  d={`M${x},${height} V${y + r} Q${x},${y} ${x + r},${y} H${x + barWidth - r} Q${
                    x + barWidth
                  },${y} ${x + barWidth},${y + r} V${height} Z`}
                />
              )}
            </g>
          )
        })}
      </svg>
      {showDates && points.length > 0 && (
        <figcaption className="unave-daybars__dates">
          <span>{points[0].label}</span>
          <span>Today</span>
        </figcaption>
      )}
    </figure>
  )
}
