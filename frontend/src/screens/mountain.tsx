import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useApp } from '../state/app-context'
import { yetiReducer } from '../state/yeti'
import { playbackReducer } from '../state/playback'
import { Yeti } from '../components/yeti'
import { RunList } from '../components/run-list'
import { Descent, type DescentHandle } from '../components/descent'
import { Podium } from '../components/podium'
import { Trails } from '../components/trails'
import { GroupPanel } from '../components/group-panel'
import { SkierCard } from '../components/skier-card'
import { Toast } from '../components/toast'
import { faces } from '../components/faces'
import mountain from '../assets/backgrounds/mountain.jpg'
import '../styles/mountain.css'

const reason = (err: unknown) => (err instanceof Error ? err.message : String(err))

export function Mountain(): React.JSX.Element {
  const { state, addRun, removeRun } = useApp()
  const [yeti, send] = useReducer(yetiReducer, { name: 'idle' })
  const [picked, setPicked] = useState<string | null>(null)
  const [play, cue] = useReducer(playbackReducer, null)
  const freshRide = useRef<DescentHandle>(null)
  const replayRide = useRef<DescentHandle>(null)
  const [groupOpen, setGroupOpen] = useState(false)
  const [news, setNews] = useState<string[]>([])

  const runs = state?.runs ?? []
  const podium = state?.podium ?? []
  const me = state?.me

  useEffect(() => {
    if (yeti.name !== 'saving') return
    let live = true
    addRun().then(
      ({ key }) => live && send({ type: 'SAVED', key }),
      (err) => live && send({ type: 'FAILED', message: reason(err) })
    )
    return () => {
      live = false
    }
  }, [yeti.name, addRun])

  const arrived = state?.arrived
  useEffect(() => {
    if (!arrived?.length) return
    setNews((q) => [...q, ...arrived.filter((k) => !q.includes(k))])
  }, [arrived])

  const byKey = useMemo(() => new Map(runs.map((r) => [r.key, r])), [runs])
  const newest = useMemo(() => runs.slice().reverse(), [runs])

  const fresh = yeti.name === 'descending' ? byKey.get(yeti.key) : undefined
  const replay = play ? byKey.get(play.key) : undefined
  const moving = play?.live ? play.key : (fresh?.key ?? null)
  const active = moving ?? play?.key ?? null
  const hot = active ? byKey.get(active) : undefined

  const trails = useMemo(() => {
    const latest = podium.flatMap((p) => {
      const run = p.latest ? byKey.get(p.latest) : undefined
      return run ? [run] : []
    })
    return hot && !latest.includes(hot) ? [...latest, hot] : latest
  }, [podium, byKey, hot])

  const toast = news.length ? byKey.get(news[0]) : undefined
  const away = podium.filter((p) => p.online && p.key !== me?.key)
  const skier = picked ? podium.find((p) => p.key === picked) : undefined
  const drop = () => setNews((q) => q.slice(1))

  const watch = (key: string) => {
    if (key !== moving) cue({ type: 'PICK', key })
    else (play?.live ? replayRide : freshRide).current?.skip()
  }

  const add = () => {
    cue({ type: 'CLEAR' })
    send({ type: 'ADD' })
  }

  return (
    <main className='mountain'>
      <img className='backdrop' src={mountain} alt='' />

      <header className='mountain__header'>
        <h1 className='title'>Ghost Race</h1>
        {me?.skier && (
          <p className='pill mountain__me' data-color={me.skier.color}>
            <img className='face' src={faces[me.skier.color]} alt='' />
            <span>
              Skiing as <strong>{me.skier.name}</strong>
            </span>
            <span className='dot' />
          </p>
        )}
        <button
          type='button'
          className='button mountain__friends'
          onClick={() => setGroupOpen(true)}
        >
          {away.length > 0 && (
            <span className='mountain__faces'>
              {away.map((p) => (
                <img key={p.key} className='face face--ring' src={faces[p.color]} alt='' />
              ))}
            </span>
          )}
          <span className='mountain__invite'>
            <span>Invite friends</span>
            <span className='muted'>
              {away.length === 0
                ? 'Just you so far'
                : `${away.length} ${away.length === 1 ? 'friend' : 'friends'} online`}
            </span>
          </span>
        </button>
      </header>

      <section className='slope' aria-label='Mountain'>
        <p className='pill slope__label'>
          <svg className='icon' viewBox='0 0 24 24' aria-hidden='true'>
            <path d='M3 20l6-10 4 6 3-4 5 8z' />
          </svg>
          On the mountain: latest run of each skier
        </p>
        {runs.length === 0 && <p className='slope__hint'>Your runs will draw down this slope.</p>}
        <div className='slope__canvas'>
          <Trails runs={trails} hot={active} />
          {replay && play && (
            <Descent
              key={`${play.key}-${play.take}`}
              ref={replayRide}
              run={replay}
              onArrive={() => cue({ type: 'ARRIVED', key: replay.key })}
            />
          )}
          {fresh && (
            <Descent
              key={fresh.key}
              ref={freshRide}
              run={fresh}
              onArrive={() => send({ type: 'ARRIVED', key: fresh.key })}
            />
          )}
        </div>
      </section>

      <div className='mountain__yeti'>
        <Yeti
          state={yeti}
          watching={play?.live && replay ? replay.skier.name : null}
          onClick={add}
        />
      </div>

      <div className='mountain__podium'>
        <Podium podium={podium} onPick={setPicked} />
      </div>

      <section className='mountain__runs card' aria-labelledby='runs-title'>
        <header className='mountain__runs-head'>
          <h2 id='runs-title' className='heading'>
            All runs
          </h2>
          <span className='muted'>Tap a run to replay it on the mountain</span>
        </header>
        <RunList
          runs={newest}
          mine={me?.key ?? null}
          active={active}
          moving={moving}
          onPick={watch}
          onRemove={removeRun}
        />
      </section>

      {toast && (
        <Toast
          run={toast}
          onWatch={() => {
            watch(toast.key)
            drop()
          }}
          onClose={drop}
        />
      )}

      {skier && (
        <SkierCard
          skier={skier}
          runs={newest.filter((r) => r.skier.key === skier.key)}
          mine={me?.key ?? null}
          onRemove={removeRun}
          onClose={() => setPicked(null)}
        />
      )}

      {groupOpen && <GroupPanel onClose={() => setGroupOpen(false)} />}
    </main>
  )
}
