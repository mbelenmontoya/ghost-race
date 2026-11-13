import type { PodiumEntry } from '../worker/protocol'
import { faces } from './faces'
import steps from '../assets/track/podium.png'
import '../styles/podium.css'

interface Props {
  podium: PodiumEntry[]
  onPick: (key: string) => void
}

const km = (m: number) => (m / 1000).toFixed(2) + ' km'

export function Podium({ podium, onPick }: Props): React.JSX.Element {
  const ranked = podium.filter((p) => p.count > 0)

  return (
    <section className='podium card' aria-labelledby='podium-title'>
      <header className='podium__head'>
        <h2 id='podium-title' className='heading'>
          Podium
        </h2>
        <span className='muted'>by kilometres</span>
      </header>

      <div className='podium__steps'>
        <img src={steps} alt='' />
        {ranked.slice(0, 3).map((p, i) => (
          <img
            key={p.key}
            className='podium__winner face'
            data-place={i + 1}
            src={faces[p.color]}
            alt=''
          />
        ))}
      </div>

      {podium.length === 0 && <p className='podium__empty muted'>No one on the podium yet.</p>}

      <ol className='podium__list'>
        {podium.map((p, i) => (
          <li key={p.key}>
            <button
              type='button'
              className='podium__row'
              data-color={p.color}
              aria-label={`See all of ${p.name}'s runs`}
              onClick={() => onPick(p.key)}
            >
              <span className='podium__place'>{i + 1}</span>
              <img className='face' src={faces[p.color]} alt='' />
              <span className='podium__name'>
                {p.name}
                <span className='dot' />
              </span>
              <span className='podium__km'>{km(p.distance)}</span>
              <span className='podium__count muted'>
                {p.count} {p.count === 1 ? 'run' : 'runs'}
              </span>
              <svg className='icon' viewBox='0 0 24 24' aria-hidden='true'>
                <path d='M9 5l7 7-7 7' />
              </svg>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
