import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { createWorkerClient, type WorkerClient } from '../worker/worker-client'
import {
  WorkerRequestError,
  type RequestMap,
  type RequestType,
  type Skier,
  type Snapshot,
  type WorkerError
} from '../worker/protocol'
import { connectionReducer, initialConnection, type ConnectionState } from './connection'

interface AppContextValue {
  connection: ConnectionState
  retry: () => void
  state: Snapshot | null
  chooseSkier: (skier: Skier) => Promise<null>
  addRun: () => Promise<{ key: string }>
  removeRun: (key: string) => Promise<null>
  createInvite: () => Promise<null>
  cancelInvite: () => Promise<null>
  join: (code: string, bring: boolean) => Promise<null>
  cancelJoin: () => Promise<null>
}

const AppContext = createContext<AppContextValue | null>(null)

function toWorkerError(err: unknown): WorkerError {
  if (err instanceof WorkerRequestError) return { code: err.code, message: err.message }
  return { code: 'INTERNAL', message: err instanceof Error ? err.message : String(err) }
}

export function AppProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [connection, dispatch] = useReducer(connectionReducer, initialConnection)
  const [state, setState] = useState<Snapshot | null>(null)
  const clientRef = useRef<WorkerClient | null>(null)

  const connect = useCallback(async (client: WorkerClient) => {
    const isCurrent = (): boolean => clientRef.current === client
    dispatch({ type: 'connect' })
    try {
      await client.start()
      const { writerKey } = await client.request('get-status', {})
      if (isCurrent()) dispatch({ type: 'ready', writerKey })
    } catch (err) {
      if (isCurrent()) dispatch({ type: 'failed', error: toWorkerError(err) })
    }
  }, [])

  useEffect(() => {
    const client = createWorkerClient(window.bridge)
    clientRef.current = client
    client.onExit(() => dispatch({ type: 'worker-exited' }))
    client.onEvent((event) => {
      if (event.type === 'state') setState(event.payload)
    })
    void connect(client)

    return () => {
      client.dispose()
      clientRef.current = null
    }
  }, [connect])

  const retry = useCallback(() => {
    if (clientRef.current) void connect(clientRef.current)
  }, [connect])

  const call = useCallback(function call<T extends RequestType>(
    type: T,
    payload: RequestMap[T]['payload']
  ) {
    const client = clientRef.current
    if (!client) {
      return Promise.reject(
        new WorkerRequestError({ code: 'WORKER_EXITED', message: 'Not connected to the worker' })
      )
    }
    return client.request(type, payload)
  }, [])

  const chooseSkier = useCallback((next: Skier) => call('set-skier', next), [call])
  const addRun = useCallback(() => call('add-run', {}), [call])
  const removeRun = useCallback((key: string) => call('remove-run', { key }), [call])
  const createInvite = useCallback(() => call('create-invite', {}), [call])
  const cancelInvite = useCallback(() => call('cancel-invite', {}), [call])
  const join = useCallback((code: string, bring: boolean) => call('join', { code, bring }), [call])
  const cancelJoin = useCallback(() => call('cancel-join', {}), [call])

  const value = useMemo(
    () => ({
      connection,
      retry,
      state,
      chooseSkier,
      addRun,
      removeRun,
      createInvite,
      cancelInvite,
      join,
      cancelJoin
    }),
    [
      connection,
      retry,
      state,
      chooseSkier,
      addRun,
      removeRun,
      createInvite,
      cancelInvite,
      join,
      cancelJoin
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside <AppProvider>')
  return value
}
