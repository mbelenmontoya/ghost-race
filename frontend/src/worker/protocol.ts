export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNKNOWN_TYPE'
  | 'INTERNAL'
  | 'VAULT_UNAVAILABLE'
  | 'TIMEOUT'
  | 'WORKER_EXITED'
  | 'INVALID_GPX'
  | 'NO_SKIER'
  | 'SAVE_FAILED'
  | 'NOT_FOUND'
  | 'NOT_YOURS'

export interface WorkerError {
  code: ErrorCode
  message: string
}

export const SKIER_COLORS = ['pink', 'lilac', 'black'] as const
export type SkierColor = (typeof SKIER_COLORS)[number]

export interface Skier {
  name: string
  color: SkierColor
}

export interface RunStats {
  distance: number
  drop: number
  topSpeed: number
  duration: number
}

export type TrackPoint = [seconds: number, elevation: number, distance: number]

export interface Run {
  key: string
  skier: Skier & { key: string }
  startedAt: string
  stats: RunStats
  track: TrackPoint[]
}

export interface PodiumEntry {
  key: string
  name: string
  color: SkierColor
  online: boolean
  distance: number
  drop: number
  topSpeed: number
  count: number
  latest: string | null
}

export type Invite = { creating: true } | { code: string; used?: true } | { joined: string }

export interface JoinState {
  status: 'connecting' | 'moving' | 'error'
  message?: string
}

export interface Snapshot {
  me: { key: string; skier: Skier | null }
  podium: PodiumEntry[]
  runs: Run[]
  arrived: string[]
  invite: Invite | null
  join: JoinState | null
}

type Empty = Record<string, never>

export interface RequestMap {
  'get-status': { payload: Empty; result: { writerKey: string } }
  'set-skier': { payload: Skier; result: null }
  'add-run': { payload: Empty; result: { key: string } }
  'remove-run': { payload: { key: string }; result: null }
  'create-invite': { payload: Empty; result: null }
  'cancel-invite': { payload: Empty; result: null }
  join: { payload: { code: string; bring: boolean }; result: null }
  'cancel-join': { payload: Empty; result: null }
}

export type RequestType = keyof RequestMap

export type WorkerResponse =
  | { id: string | null; ok: true; result: unknown }
  | { id: string | null; ok: false; error: WorkerError }

export type UpdaterStatus = 'scheduled' | 'updating' | 'updated' | 'minver-required' | 'error'

export type WorkerEvent =
  | { type: 'updater'; payload: { status: UpdaterStatus; message?: string; delay?: number } }
  | { type: 'state'; payload: Snapshot }

export class WorkerRequestError extends Error {
  readonly code: ErrorCode

  constructor({ code, message }: WorkerError) {
    super(message)
    this.name = 'WorkerRequestError'
    this.code = code
  }
}
