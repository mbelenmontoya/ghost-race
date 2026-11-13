import { describe, expect, it, vi } from 'vitest'
import { glide, type Clock } from './glide'

const path = [
  { s: 0, x: 0, y: 0 },
  { s: 20, x: 50, y: 50 },
  { s: 40, x: 100, y: 100 }
]

function fakeClock() {
  let now = 0
  let next: ((t: number) => void) | null = null
  const clock: Clock = {
    now: () => now,
    request: (fn) => {
      next = fn
      return 1
    },
    cancel: () => {
      next = null
    }
  }
  const advance = (ms: number) => {
    now += ms
    const fn = next
    next = null
    fn?.(now)
  }
  return { clock, advance }
}

describe('glide', () => {
  it('should reach the last point by itself and finish once', () => {
    const { clock, advance } = fakeClock()
    const place = vi.fn()
    const done = vi.fn()
    glide(path, place, done, clock)

    advance(1000)
    advance(1000)
    advance(1000)

    expect(place).toHaveBeenLastCalledWith(2)
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('should park at the end on skip and never move again', () => {
    const { clock, advance } = fakeClock()
    const place = vi.fn()
    const done = vi.fn()
    const ride = glide(path, place, done, clock)

    advance(100)
    ride.skip()
    place.mockClear()
    advance(100)
    advance(5000)
    ride.skip()

    expect(place).not.toHaveBeenCalled()
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('should put the skier on the last point when skipping', () => {
    const { clock, advance } = fakeClock()
    const place = vi.fn()
    const ride = glide(path, place, () => {}, clock)

    advance(100)
    ride.skip()

    expect(place).toHaveBeenLastCalledWith(2)
  })

  it('should not finish when stopped', () => {
    const { clock, advance } = fakeClock()
    const done = vi.fn()
    const ride = glide(path, () => {}, done, clock)

    ride.stop()
    advance(5000)
    ride.skip()

    expect(done).not.toHaveBeenCalled()
  })

  it('should finish at once with an empty track', () => {
    const { clock } = fakeClock()
    const done = vi.fn()
    glide([], () => {}, done, clock)

    expect(done).toHaveBeenCalledTimes(1)
  })
})
