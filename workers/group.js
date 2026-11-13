function arrivals(seen, runs, me) {
  const newest = new Map()
  for (const r of runs) {
    if (seen.has(r.key) || r.skier.key === me) continue
    const prev = newest.get(r.skier.key)
    if (!prev || r.startedAt > prev.startedAt) newest.set(r.skier.key, r)
  }
  return [...newest.values()].map((r) => r.key)
}

function move(records, from, to) {
  const out = []
  for (const rec of records) {
    if (rec.key === 'skier:' + from) {
      out.push({ key: 'skier:' + to, value: rec.value })
      continue
    }
    if (!rec.key.startsWith('run:')) continue

    let run
    try {
      run = JSON.parse(rec.value)
    } catch {
      continue
    }
    if (run?.skier?.key !== from) continue
    run.skier.key = to
    out.push({ key: rec.key, value: JSON.stringify(run), file: rec.file })
  }
  return out
}

module.exports = { arrivals, move }
