import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import type { Run, SkierColor, TrackPoint } from '../worker/protocol'
import { glide, type Point, type Ride } from './glide'
import pink from '../assets/skiers/racing-pink.png'
import lilac from '../assets/skiers/racing-lilac.png'
import black from '../assets/skiers/racing-black.png'

const racers: Record<SkierColor, string> = { pink, lilac, black }

export function toPath(track: TrackPoint[]): Point[] {
  const eles = track.map((p) => p[1])
  const top = Math.max(...eles)
  const span = top - Math.min(...eles) || 1
  const far = track.at(-1)?.[2] || 1
  return track.map(([s, ele, dist]) => ({
    s,
    x: (dist / far) * 100,
    y: ((top - ele) / span) * 100
  }))
}

export type DescentHandle = Pick<Ride, 'skip'>

interface Props {
  run: Run
  ref?: Ref<DescentHandle>
  onArrive?: () => void
}

export function Descent({ run, ref, onArrive }: Props): React.JSX.Element {
  const skier = useRef<HTMLImageElement>(null)
  const ride = useRef<Ride | null>(null)
  const arrive = useRef(onArrive)
  arrive.current = onArrive

  useImperativeHandle(ref, () => ({ skip: () => ride.current?.skip() }), [])

  useEffect(() => {
    const el = skier.current
    if (!el) return
    const path = toPath(run.track)
    delete el.dataset.done
    ride.current = glide(
      path,
      (i) => {
        el.style.left = path[i].x + '%'
        el.style.top = path[i].y + '%'
      },
      () => {
        el.dataset.done = 'true'
        arrive.current?.()
      }
    )
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) ride.current.skip()
    return () => ride.current?.stop()
  }, [])

  return (
    <div className='descent' aria-label={`${run.skier.name} skiing down`}>
      <img ref={skier} className='descent__skier' src={racers[run.skier.color]} alt='' />
    </div>
  )
}
