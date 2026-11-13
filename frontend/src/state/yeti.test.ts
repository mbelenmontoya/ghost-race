import { describe, expect, it } from 'vitest'
import { yetiReducer, type YetiState } from './yeti'

const idle: YetiState = { name: 'idle' }

describe('yetiReducer', () => {
  it('goes idle -> saving -> descending -> idle when the skier reaches the bottom', () => {
    let s = yetiReducer(idle, { type: 'ADD' })
    expect(s).toEqual({ name: 'saving' })

    s = yetiReducer(s, { type: 'SAVED', key: 'run:1' })
    expect(s).toEqual({ name: 'descending', key: 'run:1' })

    s = yetiReducer(s, { type: 'ARRIVED', key: 'run:1' })
    expect(s).toEqual({ name: 'idle' })
  })

  it('keeps the reason when saving fails and lets you try again', () => {
    const failed = yetiReducer({ name: 'saving' }, { type: 'FAILED', message: 'No ele' })
    expect(failed).toEqual({ name: 'error', message: 'No ele' })
    expect(yetiReducer(failed, { type: 'ADD' })).toEqual({ name: 'saving' })
  })

  it('ignores a click while a run is saving or going down', () => {
    const saving: YetiState = { name: 'saving' }
    const down: YetiState = { name: 'descending', key: 'run:1' }
    expect(yetiReducer(saving, { type: 'ADD' })).toBe(saving)
    expect(yetiReducer(down, { type: 'ADD' })).toBe(down)
  })

  it('ignores an arrival from a different run', () => {
    const down: YetiState = { name: 'descending', key: 'run:1' }
    expect(yetiReducer(down, { type: 'ARRIVED', key: 'run:old' })).toBe(down)
  })
})
