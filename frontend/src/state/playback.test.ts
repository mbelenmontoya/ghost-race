import { describe, expect, it } from 'vitest'
import { playbackReducer, startWith, type Playback } from './playback'

const playing: Playback = { key: 'a', take: 1, live: true }

describe('playbackReducer', () => {
  it('should start a run from nothing', () => {
    expect(playbackReducer(null, { type: 'PICK', key: 'a' })).toEqual(playing)
  })

  it('should start a new take when the same run is picked again', () => {
    const done = { ...playing, live: false }
    expect(playbackReducer(done, { type: 'PICK', key: 'a' })).toEqual({ ...playing, take: 2 })
  })

  it('should switch to another run with a new take', () => {
    expect(playbackReducer(playing, { type: 'PICK', key: 'b' })).toEqual({
      key: 'b',
      take: 2,
      live: true
    })
  })

  it('should stop being live only when its own run arrives', () => {
    expect(playbackReducer(playing, { type: 'ARRIVED', key: 'b' })).toBe(playing)
    expect(playbackReducer(playing, { type: 'ARRIVED', key: 'a' })).toEqual({
      ...playing,
      live: false
    })
  })

  it('should clear', () => {
    expect(playbackReducer(playing, { type: 'CLEAR' })).toBeNull()
  })

  it('should start with the given run or with nothing', () => {
    expect(startWith('a')).toEqual(playing)
    expect(startWith(undefined)).toBeNull()
  })
})
