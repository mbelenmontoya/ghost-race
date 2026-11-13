const SPEEDUP = 20

export interface Point {
  s: number
  x: number
  y: number
}

export interface Clock {
  now: () => number
  request: (fn: (now: number) => void) => number
  cancel: (frame: number) => void
}

export interface Ride {
  skip: () => void
  stop: () => void
}

const screen: Clock = {
  now: () => performance.now(),
  request: (fn) => requestAnimationFrame(fn),
  cancel: (frame) => cancelAnimationFrame(frame)
}

export function glide(
  path: Point[],
  place: (i: number) => void,
  done: () => void,
  clock: Clock = screen
): Ride {
  const last = path.length - 1
  const start = clock.now()
  let frame = 0
  let i = 0
  let over = false

  const finish = () => {
    if (over) return
    over = true
    clock.cancel(frame)
    if (last >= 0) place(last)
    done()
  }

  const tick = (now: number) => {
    const t = ((now - start) / 1000) * SPEEDUP
    while (i < last && path[i + 1].s <= t) i++
    place(i)
    if (i < last) frame = clock.request(tick)
    else finish()
  }

  if (last < 0) finish()
  else frame = clock.request(tick)

  return {
    skip: finish,
    stop: () => {
      over = true
      clock.cancel(frame)
    }
  }
}
