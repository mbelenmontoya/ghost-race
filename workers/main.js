const PearRuntime = require('pear-runtime') // pear-runtime on desktop; pear-mobile on mobile
const Hyperswarm = require('hyperswarm')
const Corestore = require('corestore')
const goodbye = require('graceful-goodbye')
const FramedStream = require('framed-stream')
const path = require('bare-path')
const dir = require('bare-storage')
const { isBareKit } = require('which-runtime')
const { createRequestHandler, toEvent } = require('./protocol')
const runs = require('./runs')
const Vault = require('./vault')
const { arrivals } = require('./group')

// mobile doesn't have the executable path (argv[0])
// and the worker entry path (argv[1]) in the workers argv‘s
// ... to reuse the same worker in all platforms this logic is needed
const argv = (index) => Bare.argv[index + (isBareKit ? 0 : 2)]

const updaterConfig = {
  updates: argv(0) !== 'false',
  version: argv(1),
  upgrade: argv(2),
  name: argv(3),
  dir: argv(4) || dir.persistent(), // argv[4] is undefined in mobile
  app: argv(5) // argv[5] is undefined in mobile
}

const pipe = new FramedStream(Bare.IPC)
const store = new Corestore(path.join(updaterConfig.dir, 'pear-runtime', 'corestore'))
const swarm = new Hyperswarm()
const pear = new PearRuntime({ ...updaterConfig, swarm, store })

const vault = new Vault(path.join(updaterConfig.dir, 'app-storage'), () => publish())
const opened = vault.open()
opened.catch((err) => console.error('Autopass failed to open:', err))

const send = (type, payload) => pipe.write(toEvent(type, payload))

pear.updater.on('error', (err) => send('updater', { status: 'error', message: err.message }))

if (updaterConfig.updates !== false) {
  swarm.on('connection', (connection) => store.replicate(connection))
  swarm.join(pear.updater.drive.core.discoveryKey, {
    client: true,
    server: false
  })
}

// An append on the app's drive doesn't check for an update straight away: the
// updater defers it by a random delay of up to an hour (see PearRuntimeUpdater)
// so that a released fleet doesn't hit the seeder all at once. Forward the
// delay so the app can say it is waiting rather than look inert — without it,
// a staged update is indistinguishable from a broken updater for up to an hour.
pear.updater.on('update-scheduled', (delay) => send('updater', { status: 'scheduled', delay }))
pear.updater.on('updating', () => send('updater', { status: 'updating' }))
pear.updater.on('updated', () => send('updater', { status: 'updated' }))
pear.on('minver-required', () => send('updater', { status: 'minver-required' })) // for mobile store update notification

goodbye(async () => {
  await vault.cancelJoin().catch(() => {})
  if (vault.pass) {
    await vault.unload().catch((err) => console.error('Autopass failed to close:', err))
  }
  await swarm.destroy()
  await pear.close()
  await store.close()
})

const db = runs(vault)

async function ready() {
  try {
    await opened
  } catch (err) {
    throw Object.assign(new Error('Could not open the vault: ' + err.message), {
      code: 'VAULT_UNAVAILABLE'
    })
  }
  if (!vault.pass) {
    throw Object.assign(new Error('Joining a group, give it a moment'), {
      code: 'VAULT_UNAVAILABLE'
    })
  }
}

let invite = null
let last = null
let seen = null
let shownFor = null

const handle = createRequestHandler({
  'get-status': async () => {
    await ready()
    publish()
    return { writerKey: vault.me }
  },
  'set-skier': async (payload) => {
    await ready()
    return db.setSkier(payload)
  },
  'add-run': () => ready().then(db.addRun),
  'remove-run': async (payload) => {
    await ready()
    return db.removeRun(payload)
  },
  // TODO: read-only invites so a friend can watch without adding runs
  'create-invite': async () => {
    await ready()
    invite = { creating: true }
    publish()
    const code = await vault.pass.createInvite().catch((err) => {
      invite = null
      publish()
      throw err
    })
    const { podium } = await db.read()
    invite = { code, known: new Set(podium.map((p) => p.key)) }
    publish()
    return null
  },
  'cancel-invite': async () => {
    await ready()
    await vault.pass.deleteInvite()
    invite = null
    publish()
    return null
  },
  join: async ({ code, bring } = {}) => {
    await ready()
    const valid = vault.check(code)
    invite = null
    vault.join(valid, !!bring).catch((err) => console.error('Join failed:', err))
    return null
  },
  'cancel-join': async () => {
    await opened
    await vault.cancelJoin()
    return null
  },
  'apply-update': async () => {
    await pear.ready()
    await pear.updater.applyUpdate()
    return null
  }
})

pipe.on('data', async (data) => {
  pipe.write(JSON.stringify(await handle(data)))
})

async function inviteState(podium) {
  if (!invite) return null
  if (invite.creating) return { creating: true }
  if (invite.joined) return { joined: invite.joined }
  const live = await vault.pass.base.view.findOne('@autopass/invite', {})
  if (live) return { code: invite.code }
  const fresh = podium.find((p) => !invite.known.has(p.key))
  if (fresh) invite = { joined: fresh.name }
  return fresh ? { joined: fresh.name } : { code: invite.code, used: true }
}

let busy = false
let again = false
async function publish() {
  if (busy) {
    again = true
    return
  }
  busy = true
  try {
    do {
      again = false
      if (!vault.pass) {
        if (last) send('state', { ...last, join: vault.joining, arrived: [] })
        continue
      }
      const state = await db.read({ online: vault.online(), join: vault.joining })
      if (shownFor !== vault.name) {
        seen = new Set(state.runs.map((r) => r.key))
        shownFor = vault.name
      }
      state.arrived = arrivals(seen, state.runs, vault.me)
      for (const r of state.runs) seen.add(r.key)
      state.invite = await inviteState(state.podium)
      last = state
      send('state', state)
    } while (again)
  } catch (err) {
    console.error('Could not build the state:', err)
  } finally {
    busy = false
  }
}
