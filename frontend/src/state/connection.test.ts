import { describe, expect, it } from 'vitest'
import { connectionReducer, initialConnection, type ConnectionState } from './connection'

const ready: ConnectionState = { status: 'ready', writerKey: 'abc123' }
const failed: ConnectionState = {
  status: 'error',
  code: 'VAULT_UNAVAILABLE',
  message: 'Could not open the vault'
}

describe('connectionReducer', () => {
  it('should start in the connecting state', () => {
    expect(initialConnection).toEqual({ status: 'connecting' })
  })

  it('should store the writer key when the worker reports ready', () => {
    const next = connectionReducer(initialConnection, { type: 'ready', writerKey: 'abc123' })

    expect(next).toEqual({ status: 'ready', writerKey: 'abc123' })
  })

  it('should keep the error code and message when a request fails', () => {
    const next = connectionReducer(initialConnection, {
      type: 'failed',
      error: { code: 'TIMEOUT', message: 'Worker did not answer get-status in time' }
    })

    expect(next).toEqual({
      status: 'error',
      code: 'TIMEOUT',
      message: 'Worker did not answer get-status in time'
    })
  })

  it('should move to an error when the worker exits after being ready', () => {
    const next = connectionReducer(ready, { type: 'worker-exited' })

    expect(next).toEqual({
      status: 'error',
      code: 'WORKER_EXITED',
      message: 'The background worker stopped unexpectedly.'
    })
  })

  it('should go back to connecting when retrying from an error', () => {
    expect(connectionReducer(failed, { type: 'connect' })).toEqual({ status: 'connecting' })
  })

  it('should not let a late ready response hide an error', () => {
    expect(connectionReducer(failed, { type: 'ready', writerKey: 'late' })).toBe(failed)
  })
})
