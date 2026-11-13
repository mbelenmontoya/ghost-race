import { toPath } from './descent'
import type { Run } from '../worker/protocol'

interface Props {
  runs: Run[]
  hot?: string | null
  faded?: boolean
}

export function Trails({ runs, hot, faded = false }: Props): React.JSX.Element {
  return (
    <svg
      className='trails'
      viewBox='0 0 100 100'
      preserveAspectRatio='none'
      aria-hidden='true'
      data-faded={faded}
    >
      {runs.map((run) => {
        const path = toPath(run.track)
        const points = path.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
        const start = path[0] ? `${path[0].x},${path[0].y} ${path[0].x},${path[0].y}` : ''
        return (
          <g
            key={run.key}
            className='trail'
            data-color={run.skier.color}
            data-hot={run.key === hot}
          >
            <polyline className='trail__edge' points={points} />
            <polyline className='trail__line' points={points} />
            <polyline className='trail__start-edge' points={start} />
            <polyline className='trail__start' points={start} />
          </g>
        )
      })}
    </svg>
  )
}
