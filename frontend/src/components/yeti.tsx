import idle from '../assets/dropzone/yeti-idle.png'
import surprised from '../assets/dropzone/yeti-hover.png'
import bump from '../assets/track/bump.png'
import happy from '../assets/dropzone/yeti-success.png'
import type { YetiState } from '../state/yeti'
import { Dots } from './dots'
import '../styles/yeti.css'

interface Props {
  state: YetiState
  watching: string | null
  onClick: () => void
}

function say(state: YetiState, watching: string | null): string {
  switch (state.name) {
    case 'saving':
      return 'Reading your run…'
    case 'descending':
      return 'Run saved!'
    case 'error':
      return state.message
    case 'idle':
      return watching ? `Watching ${watching}'s run!` : 'Click me to add a run'
  }
}

export function Yeti({ state, watching, onClick }: Props): React.JSX.Element {
  const busy = state.name === 'saving' || state.name === 'descending'
  const mood = state.name === 'idle' && watching ? 'happy' : state.name
  const art = { idle, saving: idle, descending: happy, happy, error: bump }[mood]

  return (
    <div className='yeti' data-state={mood}>
      <button
        type='button'
        className='yeti__button'
        onClick={onClick}
        disabled={busy}
        aria-busy={busy}
        aria-label={state.name === 'error' ? 'Try adding a run again' : 'Add a run'}
      >
        <img className='yeti__art' src={art} alt='' />
        {mood === 'idle' && <img className='yeti__art yeti__art--peek' src={surprised} alt='' />}
      </button>
      {state.name === 'saving' ? <Dots /> : <span className='dots' />}
      <p className='yeti__message' role='status'>
        {say(state, watching)}
      </p>
    </div>
  )
}
