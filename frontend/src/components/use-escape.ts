import { useEffect, useRef } from 'react'

export function useEscape(close: () => void): void {
  const ref = useRef(close)
  ref.current = close

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ref.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
