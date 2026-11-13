const fs = require('bare-fs/promises')
const path = require('bare-path')
const gpx = require('./gpx')
const snapshot = require('./snapshot')

const COLORS = ['pink', 'lilac', 'black']

const fail = (code, message) => Object.assign(new Error(message), { code })

// TODO: let each skier pick her own GPX instead of the sample for her colour
function loadSample(color) {
  return fs.readFile(path.join(__dirname, 'samples', color + '.gpx'))
}

module.exports = function runs(vault) {
  const mine = () => vault.me
  const me = () => 'skier:' + mine()

  async function getSkier() {
    const entry = await vault.pass.get(me())
    return entry ? JSON.parse(entry.value) : null
  }

  async function setSkier({ name, color } = {}) {
    name = typeof name === 'string' ? name.trim() : ''
    if (!name || name.length > 24) {
      throw fail('BAD_REQUEST', 'Pick a name between 1 and 24 characters')
    }
    if (!COLORS.includes(color)) throw fail('BAD_REQUEST', 'Pick one of the three skiers')

    const peer = vault.pass.swarm?.keyPair.publicKey.toString('hex')
    await vault.pass.add(me(), JSON.stringify({ name, color, peer }))
    return null
  }

  async function addRun() {
    const skier = await getSkier()
    if (!skier) throw fail('NO_SKIER', 'Choose your skier before adding a run')

    const file = await loadSample(skier.color)
    const { startedAt, stats, track } = gpx.summarize(gpx.parse(file.toString()).points)
    const key = `run:${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const run = {
      v: 1,
      skier: { key: mine(), ...skier },
      startedAt,
      stats,
      track
    }

    try {
      await vault.pass.add(key, JSON.stringify(run), file)
    } catch (err) {
      throw fail('SAVE_FAILED', 'Could not save the run: ' + err.message)
    }
    return { key }
  }

  async function removeRun({ key } = {}) {
    const entry =
      typeof key === 'string' && key.startsWith('run:') ? await vault.pass.get(key) : null
    if (!entry) throw fail('NOT_FOUND', 'That run is already gone')
    if (JSON.parse(entry.value).skier?.key !== mine()) {
      throw fail('NOT_YOURS', 'You can only delete your own runs')
    }
    await vault.pass.remove(key)
    return null
  }

  async function read(extra) {
    return snapshot(await vault.pass.list().toArray(), mine(), extra)
  }

  return { setSkier, addRun, removeRun, read }
}
