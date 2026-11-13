import { useApp } from './state/app-context'
import { PickSkier } from './screens/pick-skier'
import { Mountain } from './screens/mountain'
import { Dots } from './components/dots'
import welcome from './assets/backgrounds/welcome.jpg'
import yeti from './assets/dropzone/yeti-idle.png'
import bump from './assets/track/bump.png'
import './styles/connection.css'

export function App(): React.JSX.Element {
  const { connection, retry, state } = useApp()

  if (connection.status === 'ready' && state) {
    return state.me.skier ? <Mountain /> : <PickSkier />
  }

  const failed = connection.status === 'error'

  return (
    <main className='welcome'>
      <img className='backdrop' src={welcome} alt='' />
      <section className='connection card card--cream' data-state={connection.status}>
        {failed ? (
          <>
            <img className='connection__art' src={bump} alt='' />
            <h1 className='heading connection__title' role='alert'>
              Can&apos;t reach the mountain
            </h1>
            <p className='connection__note'>{connection.message}</p>
            <button type='button' className='button button--cta button--big' onClick={retry}>
              Retry
            </button>
          </>
        ) : (
          <>
            <img className='connection__art' src={yeti} alt='' />
            <Dots />
            <h1 className='heading connection__title' role='status'>
              Connecting to the mountain…
            </h1>
            <p className='connection__note'>Fetching everyone&apos;s runs.</p>
          </>
        )}
      </section>
    </main>
  )
}
