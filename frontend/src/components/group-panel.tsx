import { useEffect, useState, type FormEvent } from 'react'
import { useApp } from '../state/app-context'
import { faces } from './faces'
import { useEscape } from './use-escape'
import snowman from '../assets/ui/snowman-empty.png'
import snowflake from '../assets/particles/snowflake.png'
import yeti from '../assets/dropzone/yeti-hover.png'
import spray from '../assets/particles/spray.png'
import impact from '../assets/particles/impact.png'
import crashPink from '../assets/skiers/crash-pink.png'
import crashLilac from '../assets/skiers/crash-lilac.png'
import crashBlack from '../assets/skiers/crash-black.png'
import '../styles/group.css'

const crash = { pink: crashPink, lilac: crashLilac, black: crashBlack }

const why = (err: unknown) => (err instanceof Error ? err.message : String(err))

export function GroupPanel({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { state, createInvite, cancelInvite, join, cancelJoin } = useApp()
  const [code, setCode] = useState('')
  const [bring, setBring] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refused, setRefused] = useState<string | null>(null)
  useEscape(onClose)

  const invite = state?.invite ?? null
  const joining = state?.join ?? (refused ? { status: 'error' as const, message: refused } : null)
  const myKey = state?.me.key
  const color = state?.me.skier?.color ?? 'pink'
  const members = state?.podium ?? []
  const shown = invite && 'code' in invite ? invite.code : null

  useEffect(() => setCopied(false), [shown])

  const run = (fn: () => Promise<unknown>) => {
    setError(null)
    fn().catch((err) => setError(why(err)))
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setRefused(null)
    join(code, bring).catch((err) => setRefused(why(err)))
  }

  const busy = joining?.status === 'connecting' || joining?.status === 'moving'

  return (
    <div className='overlay group__scrim' onClick={onClose}>
      <aside className='group' aria-label='Ride with friends' onClick={(e) => e.stopPropagation()}>
        <header className='group__head'>
          <h2 className='heading'>Ride with friends</h2>
          <button
            type='button'
            className='button button--icon'
            aria-label='Close'
            onClick={onClose}
          >
            <svg className='icon' viewBox='0 0 24 24' aria-hidden='true'>
              <path d='M6 6l12 12M18 6L6 18' />
            </svg>
          </button>
        </header>
        <p className='muted group__lead'>
          Your runs land on their mountain and theirs land on yours.
        </p>

        <section aria-labelledby='invite-title' className='group__part'>
          <h3 id='invite-title'>Invite</h3>
          {!invite && (
            <button type='button' className='button button--cta' onClick={() => run(createInvite)}>
              Invite a friend
            </button>
          )}
          {invite && 'creating' in invite && (
            <p role='status' className='group__wait'>
              Making a code…
            </p>
          )}
          {shown && (
            <>
              <div className='group__row'>
                <code className='group__code'>{shown}</code>
                <button
                  type='button'
                  className='button group__copy'
                  data-done={copied}
                  onClick={() => run(() => copy(shown))}
                >
                  <svg className='icon' viewBox='0 0 24 24' aria-hidden='true'>
                    {copied ? (
                      <path d='M5 12.5l4.5 4.5L19 7.5' />
                    ) : (
                      <path d='M9 9h11v11H9zM5 15V4h11' />
                    )}
                  </svg>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className='muted'>
                This code lets one friend join. Once she uses it, it stops working and you&apos;ll
                get a new one next time.
              </p>
              <button
                type='button'
                className='button group__cancel'
                onClick={() => run(cancelInvite)}
              >
                Cancel invite
              </button>
            </>
          )}
          {invite && 'joined' in invite && (
            <div className='group__joined' role='status'>
              <strong>{invite.joined} joined!</strong>
              <button type='button' className='button' onClick={() => run(createInvite)}>
                Invite someone else
              </button>
            </div>
          )}
        </section>

        <section aria-labelledby='join-title' className='group__part'>
          <h3 id='join-title'>Join with a code</h3>
          {!busy && (
            <form onSubmit={submit} className='group__join'>
              <div className='group__row'>
                <label className='sr-only' htmlFor='join-code'>
                  Code from a friend
                </label>
                <input
                  id='join-code'
                  className='field group__input'
                  value={code}
                  autoComplete='off'
                  onChange={(e) => {
                    setCode(e.target.value)
                    setRefused(null)
                  }}
                  required
                />
                <button type='submit' className='button button--cta' disabled={!code.trim()}>
                  Join
                </button>
              </div>
              <fieldset className='group__bring'>
                <legend className='sr-only'>Your runs</legend>
                <label>
                  <input
                    className='sr-only'
                    type='radio'
                    checked={bring}
                    onChange={() => setBring(true)}
                  />
                  Bring my runs
                </label>
                <label>
                  <input
                    className='sr-only'
                    type='radio'
                    checked={!bring}
                    onChange={() => setBring(false)}
                  />
                  Start from zero
                </label>
              </fieldset>
            </form>
          )}
          {joining && (
            <div className='journey' data-state={joining.status}>
              <div className='journey__stage' aria-hidden='true'>
                {joining.status === 'connecting' && (
                  <>
                    <img className='journey__hero' src={snowman} alt='' />
                    <img className='journey__fx' src={snowflake} alt='' />
                    <img className='journey__fx' src={snowflake} alt='' />
                  </>
                )}
                {joining.status === 'moving' && (
                  <>
                    <img className='journey__hero' src={yeti} alt='' />
                    <img className='journey__fx' src={spray} alt='' />
                  </>
                )}
                {joining.status === 'error' && (
                  <>
                    <img className='journey__hero' src={crash[color]} alt='' />
                    <img className='journey__fx' src={impact} alt='' />
                  </>
                )}
              </div>
              <p role={joining.status === 'error' ? 'alert' : 'status'}>
                {joining.status === 'connecting' && 'Waiting for someone in the group…'}
                {joining.status === 'moving' && 'Bringing your runs…'}
                {joining.status === 'error' && joining.message}
              </p>
              {joining.status === 'connecting' && (
                <button type='button' className='button' onClick={() => run(cancelJoin)}>
                  Cancel
                </button>
              )}
            </div>
          )}
        </section>

        <section aria-labelledby='members-title' className='group__part'>
          <h3 id='members-title'>On the mountain</h3>
          <ul className='group__members'>
            {members.map((m) => (
              <li key={m.key} className='member' data-color={m.color}>
                <img className='face' src={faces[m.color]} alt='' />
                <span className='member__name'>
                  {m.name}
                  {m.key === myKey && <span className='muted'>(you)</span>}
                </span>
                <span className='member__status' data-online={m.online || m.key === myKey}>
                  <span className='dot' />
                  {m.online || m.key === myKey ? 'Online' : 'Offline'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {error && (
          <p role='alert' className='group__error'>
            {error}
          </p>
        )}
      </aside>
    </div>
  )
}
