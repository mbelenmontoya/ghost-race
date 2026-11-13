type Unsubscribe = () => void

export interface Bridge {
  pkg(): { name: string; productName?: string; version: string }
  startWorker(specifier: string): Promise<boolean>
  writeWorkerIPC(specifier: string, data: string): Promise<boolean>
  onWorkerIPC(specifier: string, listener: (data: Uint8Array) => void): Unsubscribe
  onWorkerStdout(specifier: string, listener: (data: Uint8Array) => void): Unsubscribe
  onWorkerStderr(specifier: string, listener: (data: Uint8Array) => void): Unsubscribe
  onWorkerExit(specifier: string, listener: (code: number) => void): Unsubscribe
}

declare global {
  interface Window {
    bridge: Bridge
  }
}
