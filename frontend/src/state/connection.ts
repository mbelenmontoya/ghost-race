import type { ErrorCode, WorkerError } from '../worker/protocol'

export type ConnectionState =
  | { status: 'connecting' }
  | { status: 'ready'; writerKey: string }
  | { status: 'error'; code: ErrorCode; message: string }

export type ConnectionAction =
  | { type: 'connect' }
  | { type: 'ready'; writerKey: string }
  | { type: 'failed'; error: WorkerError }
  | { type: 'worker-exited' }

export const initialConnection: ConnectionState = { status: 'connecting' }

export function connectionReducer(
  state: ConnectionState,
  action: ConnectionAction
): ConnectionState {
  switch (action.type) {
    case 'connect':
      return initialConnection
    case 'ready':
      if (state.status === 'error') return state
      return { status: 'ready', writerKey: action.writerKey }
    case 'failed':
      return { status: 'error', ...action.error }
    case 'worker-exited':
      return {
        status: 'error',
        code: 'WORKER_EXITED',
        message: 'The background worker stopped unexpectedly.'
      }
  }
}
