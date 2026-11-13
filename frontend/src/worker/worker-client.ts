import type { Bridge } from '../bridge'
import {
  WorkerRequestError,
  type RequestMap,
  type RequestType,
  type WorkerEvent,
  type WorkerResponse
} from './protocol'

const MAIN_WORKER = '/workers/main.js'
const REQUEST_TIMEOUT_MS = 10_000

interface PendingRequest {
  resolve: (result: unknown) => void
  reject: (error: WorkerRequestError) => void
  timer: ReturnType<typeof setTimeout>
}

export interface WorkerClient {
  start(): Promise<boolean>
  request<T extends RequestType>(
    type: T,
    payload: RequestMap[T]['payload']
  ): Promise<RequestMap[T]['result']>
  onEvent(listener: (event: WorkerEvent) => void): () => void
  onExit(listener: () => void): () => void
  dispose(): void
}

export function createWorkerClient(bridge: Bridge, specifier = MAIN_WORKER): WorkerClient {
  const decoder = new TextDecoder()
  const pending = new Map<string, PendingRequest>()
  const eventListeners = new Set<(event: WorkerEvent) => void>()
  const exitListeners = new Set<() => void>()
  let lastId = 0

  const settle = (id: string): PendingRequest | undefined => {
    const request = pending.get(id)
    if (!request) return undefined
    clearTimeout(request.timer)
    pending.delete(id)
    return request
  }

  const offIpc = bridge.onWorkerIPC(specifier, (data) => {
    let message: WorkerResponse | WorkerEvent
    try {
      message = JSON.parse(decoder.decode(data))
    } catch {
      console.warn('Ignoring a frame from the worker that is not JSON')
      return
    }

    if (!('ok' in message)) {
      for (const listener of eventListeners) listener(message)
      return
    }

    const request = message.id === null ? undefined : settle(message.id)
    if (!request) {
      if (!message.ok) console.warn('Worker rejected a request:', message.error)
      return
    }
    if (message.ok) request.resolve(message.result)
    else request.reject(new WorkerRequestError(message.error))
  })

  const offExit = bridge.onWorkerExit(specifier, () => {
    for (const id of [...pending.keys()]) {
      settle(id)?.reject(
        new WorkerRequestError({
          code: 'WORKER_EXITED',
          message: 'The background worker stopped unexpectedly.'
        })
      )
    }
    for (const listener of exitListeners) listener()
  })

  return {
    start: () => bridge.startWorker(specifier),

    request(type, payload) {
      const id = 'r' + ++lastId
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          settle(id)
          reject(
            new WorkerRequestError({
              code: 'TIMEOUT',
              message: `The worker did not answer "${type}" in time.`
            })
          )
        }, REQUEST_TIMEOUT_MS)

        pending.set(id, { resolve: resolve as (result: unknown) => void, reject, timer })

        bridge.writeWorkerIPC(specifier, JSON.stringify({ id, type, payload })).catch((err) => {
          settle(id)?.reject(
            new WorkerRequestError({ code: 'WORKER_EXITED', message: err.message })
          )
        })
      })
    },

    onEvent(listener) {
      eventListeners.add(listener)
      return () => eventListeners.delete(listener)
    },

    onExit(listener) {
      exitListeners.add(listener)
      return () => exitListeners.delete(listener)
    },

    dispose() {
      offIpc()
      offExit()
      for (const request of pending.values()) clearTimeout(request.timer)
      pending.clear()
      eventListeners.clear()
      exitListeners.clear()
    }
  }
}
