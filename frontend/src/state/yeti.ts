export type YetiState =
  | { name: 'idle' }
  | { name: 'saving' }
  | { name: 'descending'; key: string }
  | { name: 'error'; message: string }

export type YetiEvent =
  | { type: 'ADD' }
  | { type: 'SAVED'; key: string }
  | { type: 'FAILED'; message: string }
  | { type: 'ARRIVED'; key: string }

export function yetiReducer(state: YetiState, event: YetiEvent): YetiState {
  switch (state.name) {
    case 'idle':
    case 'error':
      return event.type === 'ADD' ? { name: 'saving' } : state
    case 'saving':
      if (event.type === 'SAVED') return { name: 'descending', key: event.key }
      if (event.type === 'FAILED') return { name: 'error', message: event.message }
      return state
    case 'descending':
      return event.type === 'ARRIVED' && event.key === state.key ? { name: 'idle' } : state
  }
}
