export type Playback = { key: string; take: number; live: boolean } | null

export type PlaybackEvent =
  { type: 'PICK'; key: string } | { type: 'ARRIVED'; key: string } | { type: 'CLEAR' }

export function playbackReducer(state: Playback, event: PlaybackEvent): Playback {
  switch (event.type) {
    case 'PICK':
      return { key: event.key, take: (state?.take ?? 0) + 1, live: true }
    case 'ARRIVED':
      return state?.key === event.key ? { ...state, live: false } : state
    case 'CLEAR':
      return null
  }
}

export function startWith(key: string | undefined): Playback {
  return key ? playbackReducer(null, { type: 'PICK', key }) : null
}
