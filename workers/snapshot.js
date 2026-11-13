const mine = (s) => (s ? { name: s.name, color: s.color } : null)

function read(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

module.exports = function snapshot(records, myKey, extra = {}) {
  const online = extra.online ?? new Set()
  const skiers = new Map()
  const runs = []

  for (const { key, value } of records) {
    if (key.startsWith('skier:')) {
      const s = read(value)
      if (s?.name && s.color) {
        skiers.set(key.slice(6), { name: s.name, color: s.color, peer: s.peer ?? null })
      }
    } else if (key.startsWith('run:')) {
      const r = read(value)
      if (r?.v !== 1) {
        console.error('Skipping unreadable run', key)
        continue
      }
      runs.push({ key, skier: r.skier, startedAt: r.startedAt, stats: r.stats, track: r.track })
    }
  }

  runs.sort((a, b) => a.startedAt.localeCompare(b.startedAt))

  const rows = new Map()
  for (const [key, { peer, ...s }] of skiers) {
    rows.set(key, {
      key,
      ...s,
      online: !!peer && online.has(peer),
      distance: 0,
      drop: 0,
      topSpeed: 0,
      count: 0,
      latest: null
    })
  }
  for (const r of runs) {
    let row = rows.get(r.skier.key)
    if (!row) {
      row = {
        key: r.skier.key,
        name: r.skier.name,
        color: r.skier.color,
        online: false,
        distance: 0,
        drop: 0,
        topSpeed: 0,
        count: 0
      }
      rows.set(r.skier.key, row)
    }
    row.distance += r.stats.distance
    row.drop += r.stats.drop
    row.topSpeed = Math.max(row.topSpeed, r.stats.topSpeed)
    row.count++
    row.latest = r.key
  }

  const podium = [...rows.values()]
    .map((p) => ({ ...p, distance: Math.round(p.distance), drop: Math.round(p.drop) }))
    .sort((a, b) => b.distance - a.distance || a.name.localeCompare(b.name))

  return {
    me: { key: myKey, skier: mine(skiers.get(myKey)) },
    podium,
    runs,
    arrived: extra.arrived ?? [],
    invite: extra.invite ?? null,
    join: extra.join ?? null
  }
}
