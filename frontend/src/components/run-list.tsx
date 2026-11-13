import { useState } from 'react'
import type { Run } from '../worker/protocol'
import { faces } from './faces'
import snowman from '../assets/ui/snowman-empty.png'
import '../styles/runs.css'

const day = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function clock(secs: number): string {
  const m = Math.floor(secs / 60)
  return `${m}:${String(secs % 60).padStart(2, '0')}`
}

export function summary(r: Run): string {
  return `${(r.stats.distance / 1000).toFixed(2)} km · ${Math.round(r.stats.drop)} m down · ${clock(r.stats.duration)}`
}

interface Props {
  runs: Run[]
  mine: string | null
  active?: string | null
  moving?: string | null
  plain?: boolean
  onPick: (key: string) => void
  onRemove: (key: string) => Promise<unknown>
}

type RowState = { busy: true } | { error: string }

export function RunList({
  runs,
  mine,
  active,
  moving,
  plain = false,
  onPick,
  onRemove
}: Props): React.JSX.Element {
  const [rows, setRows] = useState<Record<string, RowState>>({})

  const remove = async (key: string) => {
    setRows((all) => ({ ...all, [key]: { busy: true } }))
    try {
      await onRemove(key)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      setRows((all) => ({ ...all, [key]: { error } }))
    }
  }

  if (runs.length === 0 && !plain) {
    return (
      <div className='runs-empty'>
        <img src={snowman} alt='' />
        <div>
          <p className='heading'>No runs yet</p>
          <p className='muted'>Click the yeti to drop your first run.</p>
        </div>
      </div>
    )
  }

  function row(r: Run): React.JSX.Element {
    const status = rows[r.key]
    const busy = !!status && 'busy' in status
    const on = r.key === active
    const going = r.key === moving
    return (
      <li key={r.key} className='runs__row' aria-busy={busy}>
        <button
          type='button'
          className='run'
          data-color={r.skier.color}
          aria-current={on}
          onClick={() => onPick(r.key)}
        >
          {!plain && <img className='face' src={faces[r.skier.color]} alt='' />}
          <span className='run__info'>
            <span className='run__who'>
              {!plain && <strong>{r.skier.name}</strong>}
              {!plain && <span className='dot' />}
              <span className='muted'>{day.format(new Date(r.startedAt))}</span>
            </span>
            <span className='run__stats'>
              {summary(r)} · {r.stats.topSpeed} km/h
            </span>
          </span>
          <span className='run__play'>
            <svg className='icon' viewBox='0 0 24 24' aria-hidden='true'>
              <path d={going ? 'M5 5v14l8-7zM13 5v14l8-7z' : 'M7 4.5v15l12-7.5z'} />
            </svg>
            {going ? 'Skip' : 'Replay'}
          </span>
        </button>
        {r.skier.key === mine && (
          <button
            type='button'
            className='runs__remove'
            aria-label={`Delete ${r.skier.name}'s run from ${day.format(new Date(r.startedAt))}`}
            title='Delete run'
            disabled={busy}
            onClick={() => remove(r.key)}
          >
            <svg className='icon' viewBox='0 0 24 24' aria-hidden='true'>
              <path d='M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3' />
            </svg>
          </button>
        )}
        {status && 'error' in status && (
          <p className='runs__error' role='alert'>
            {status.error}
          </p>
        )}
      </li>
    )
  }

  if (plain) return <ol className='runs'>{runs.map(row)}</ol>

  const groups = new Map<string, Run[]>()
  for (const r of runs) groups.set(r.skier.key, [...(groups.get(r.skier.key) ?? []), r])

  return (
    <ol className='runs'>
      {[...groups.values()].map(([latest, ...rest]) => (
        <li key={latest.skier.key} className='runs__group'>
          <ol className='runs__set'>{row(latest)}</ol>
          {rest.length > 0 && (
            <details className='runs__more'>
              <summary>
                {rest.length} more {rest.length === 1 ? 'run' : 'runs'} by {latest.skier.name}
              </summary>
              <ol className='runs__set'>{rest.map(row)}</ol>
            </details>
          )}
        </li>
      ))}
    </ol>
  )
}
