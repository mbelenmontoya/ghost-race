import { useEffect, useReducer, useRef } from 'react'
import { playbackReducer, startWith } from '../state/playback'
import type { PodiumEntry, Run } from '../worker/protocol'
import { faces } from './faces'
import { Trails } from './trails'
import { Descent, type DescentHandle } from './descent'
import { RunList } from './run-list'
import { useEscape } from './use-escape'
import '../styles/skier-card.css'

interface Props {
  skier: PodiumEntry
  runs: Run[]
  mine: string | null
  onRemove: (key: string) => Promise<unknown>
  onClose: () => void
}

export function SkierCard({ skier, runs, mine, onRemove, onClose }: Props): React.JSX.Element {
  const [play, cue] = useReducer(playbackReducer, runs[0]?.key, startWith)
  const ride = useRef<DescentHandle>(null)
  const back = useRef<HTMLButtonElement>(null)
  useEscape(onClose)

  useEffect(() => back.current?.focus(), [])

  const active = runs.find((r) => r.key === play?.key)
  const moving = play?.live ? play.key : null

  const pick = (key: string) => {
    if (key === moving) ride.current?.skip()
    else cue({ type: 'PICK', key })
  }
  const stats = [
    ['Distance', (skier.distance / 1000).toFixed(2) + ' km'],
    ['Runs', String(skier.count)],
    ['Vertical', skier.drop.toLocaleString('en-US') + ' m'],
    ['Top speed', skier.topSpeed.toFixed(1) + ' km/h']
  ]

  return (
    <div className='overlay skier-card__scrim' onClick={onClose}>
      <section
        className='skier-card card card--cream'
        role='dialog'
        aria-modal='true'
        aria-label={`${skier.name}'s runs`}
        data-color={skier.color}
        onClick={(e) => e.stopPropagation()}
      >
        <header className='skier-card__head'>
          <button ref={back} type='button' className='button' onClick={onClose}>
            <svg className='icon' viewBox='0 0 24 24' aria-hidden='true'>
              <path d='M15 5l-7 7 7 7' />
            </svg>
            Back to the mountain
          </button>
          <div className='skier-card__who'>
            <img className='face face--ring' src={faces[skier.color]} alt='' />
            <h2 className='heading'>{skier.name}</h2>
            <span className='dot' />
          </div>
          <dl className='skier-card__chips'>
            {stats.map(([label, value]) => (
              <div key={label} className='chip'>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </header>

        <div className='skier-card__body'>
          <div className='skier-card__slope card'>
            <div className='skier-card__canvas'>
              <Trails runs={runs} hot={active?.key} faded />
              {active && (
                <Descent
                  key={`${active.key}-${play?.take ?? 0}`}
                  ref={ride}
                  run={active}
                  onArrive={() => cue({ type: 'ARRIVED', key: active.key })}
                />
              )}
              {runs.length === 0 && (
                <p className='skier-card__empty muted'>No runs left for {skier.name}.</p>
              )}
            </div>
          </div>

          <div className='skier-card__list'>
            <header className='skier-card__list-head'>
              <h3 className='heading'>
                {runs.length} {runs.length === 1 ? 'run' : 'runs'}
              </h3>
              <span className='muted'>Tap to replay</span>
            </header>
            <RunList
              runs={runs}
              mine={mine}
              active={active?.key}
              moving={moving}
              plain
              onPick={pick}
              onRemove={onRemove}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
