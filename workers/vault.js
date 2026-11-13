const fs = require('bare-fs/promises')
const path = require('bare-path')
const Corestore = require('corestore')
const Autopass = require('autopass')
const z32 = require('z32')
const { decodeInvite } = require('blind-pairing-core')
const { move } = require('./group')

const HOME = 'autopass'
const fail = (code, message) => Object.assign(new Error(message), { code })
const hex = (buf) => buf.toString('hex')

// Autopass never resolves pairing when the base is already writable, so finished() hangs
function patchPairing(pairing) {
  pairing._whenWritable = function () {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      this.onresolve?.(this.pass)
    }
    if (this.pass.base.writable) return finish()
    const check = () => {
      if (!this.pass.base.writable) return
      this.pass.base.off('update', check)
      finish()
    }
    this.pass.base.on('update', check)
  }
}

class Vault {
  constructor(dir, onChange) {
    this.dir = dir
    this.onChange = onChange
    this.pass = null
    this.store = null
    this.name = null
    this.joining = null
    this.pairing = null
  }

  get me() {
    return hex(this.pass.writerKey)
  }

  async open() {
    let name = HOME
    try {
      name = (await fs.readFile(path.join(this.dir, 'current'))).toString().trim() || HOME
    } catch {}
    await this.load(name)
  }

  async load(name, store = new Corestore(path.join(this.dir, name)), pass = new Autopass(store)) {
    await pass.ready()
    this.pass = pass
    this.store = store
    this.name = name

    const ping = () => this.onChange()
    pass.on('update', ping)
    pass.swarm?.on('connection', (conn) => {
      ping()
      conn.on('close', ping)
    })
    await this.stampPeer()
    ping()
  }

  async stampPeer() {
    const key = 'skier:' + this.me
    const entry = await this.pass.get(key)
    const peer = this.pass.swarm && hex(this.pass.swarm.keyPair.publicKey)
    if (!entry || !peer) return
    const skier = JSON.parse(entry.value)
    if (skier.peer !== peer) await this.pass.add(key, JSON.stringify({ ...skier, peer }))
  }

  online() {
    if (!this.pass?.swarm) return new Set()
    return new Set([...this.pass.swarm.connections].map((c) => hex(c.remotePublicKey)))
  }

  async unload() {
    this.pass.removeAllListeners('update')
    await this.pass.close()
    await this.store.close()
    this.pass = null
  }

  setJoin(state) {
    this.joining = state
    this.onChange()
  }

  check(code) {
    code = typeof code === 'string' ? code.trim() : ''
    try {
      decodeInvite(z32.decode(code))
    } catch {
      throw fail('BAD_REQUEST', 'That code looks cut off. Copy it again and paste the whole thing.')
    }
    if (this.pairing || this.joining?.status === 'moving') {
      throw fail('BAD_REQUEST', 'Already joining a group')
    }
    return code
  }

  async join(code, bring) {
    const from = this.me
    const records = await this.pass.list().toArray()
    const mine = records.find((r) => r.key === 'skier:' + from)
    const carry = bring ? records : []
    const back = this.name

    this.setJoin({ status: 'connecting' })
    await this.unload()

    const name = 'group-' + Date.now()
    const store = new Corestore(path.join(this.dir, name))
    const pairing = Autopass.pair(store, code, { name: mine ? JSON.parse(mine.value).name : null })
    patchPairing(pairing)
    this.pairing = pairing

    let pass = null
    try {
      pass = await pairing.finished()
      this.pairing = null
      await pass.ready()

      this.setJoin({ status: 'moving' })
      for (const r of move(carry, from, hex(pass.writerKey))) await pass.add(r.key, r.value, r.file)

      await fs.writeFile(path.join(this.dir, 'current'), name)
      await this.load(name, store, pass)
      await fs.rm(path.join(this.dir, back), { recursive: true, force: true }).catch(() => {})
      this.setJoin(null)
    } catch (err) {
      const cancelled = this.pairing === null && !pass
      this.pairing = null
      await pairing.close().catch(() => {})
      if (pass) await pass.close().catch(() => {})
      await store.close().catch(() => {})
      await fs.rm(path.join(this.dir, name), { recursive: true, force: true }).catch(() => {})
      await this.load(back)
      this.setJoin(cancelled ? null : { status: 'error', message: err.message })
    }
  }

  // TODO: leave a group and go back to your own mountain

  async cancelJoin() {
    const pairing = this.pairing
    if (!pairing) return
    this.pairing = null
    await pairing.close()
  }
}

module.exports = Vault
