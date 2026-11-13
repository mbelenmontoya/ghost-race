import type { Run } from '../worker/protocol'
import { faces } from './faces'
import { summary } from './run-list'
import '../styles/toast.css'

interface Props {
  run: Run
  onWatch: () => void
  onClose: () => void
}

export function Toast({ run, onWatch, onClose }: Props): React.JSX.Element {
  return (
    <div className='toast card' role='status' key={run.key}>
      <img className='face face--ring' src={faces[run.skier.color]} alt='' />
      <div className='toast__text'>
        <span className='toast__badge'>New run</span>
        <strong>{run.skier.name} just dropped a run</strong>
        <span className='muted'>{summary(run)}</span>
      </div>
      <button type='button' className='button button--cta' onClick={onWatch}>
        Watch
      </button>
      <button
        type='button'
        className='button button--icon toast__close'
        aria-label='Dismiss'
        onClick={onClose}
      >
        <svg className='icon' viewBox='0 0 24 24' aria-hidden='true'>
          <path d='M6 6l12 12M18 6L6 18' />
        </svg>
      </button>
    </div>
  )
}
