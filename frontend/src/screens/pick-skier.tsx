import { useState, type FormEvent } from 'react'
import { useApp } from '../state/app-context'
import { SKIER_COLORS, type SkierColor } from '../worker/protocol'
import { faces } from '../components/faces'
import welcome from '../assets/backgrounds/welcome.jpg'
import '../styles/pick.css'

export function PickSkier(): React.JSX.Element {
  const { chooseSkier } = useApp()
  const [name, setName] = useState('')
  const [color, setColor] = useState<SkierColor>('pink')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await chooseSkier({ name: name.trim(), color })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

  return (
    <main className='welcome'>
      <img className='backdrop' src={welcome} alt='' />
      <form className='pick card card--cream' onSubmit={submit}>
        <h1 className='title'>Who&apos;s skiing?</h1>

        <fieldset className='pick__faces'>
          <legend>Pick your skier</legend>
          {SKIER_COLORS.map((c) => (
            <label key={c} className='pick__face' data-color={c}>
              <input
                className='sr-only'
                type='radio'
                name='color'
                value={c}
                checked={color === c}
                onChange={() => setColor(c)}
              />
              <img src={faces[c]} alt='' />
              <span>{c}</span>
            </label>
          ))}
        </fieldset>

        <label className='pick__name'>
          Name
          <input
            className='field'
            value={name}
            maxLength={24}
            required
            autoFocus
            autoComplete='nickname'
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        {error && (
          <p className='pick__error' role='alert'>
            {error}
          </p>
        )}

        <button
          type='submit'
          className='button button--cta button--big'
          disabled={saving || !name.trim()}
        >
          {saving ? 'Saving…' : 'Hit the slopes'}
        </button>
      </form>
    </main>
  )
}
