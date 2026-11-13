const test = require('brittle')
const snapshot = require('../workers/snapshot')

const skier = (key, name, color) => ({
  key: 'skier:' + key,
  value: JSON.stringify({ name, color })
})

const run = (who, name, color, startedAt, distance, drop = 500, topSpeed = 50) => ({
  key: `run:${startedAt}-${who}`,
  value: JSON.stringify({
    v: 1,
    skier: { key: who, name, color },
    startedAt,
    stats: { distance, drop, topSpeed, duration: 200 },
    track: [
      [0, 1000, 0],
      [10, 900, distance]
    ]
  })
})

const records = [
  skier('ana', 'Ana', 'pink'),
  skier('bel', 'Bel', 'lilac'),
  skier('cam', 'Cam', 'black'),
  run('ana', 'Ana', 'pink', '2026-01-02T10:00:00.000Z', 2000, 300, 40),
  run('bel', 'Bel', 'lilac', '2026-01-01T10:00:00.000Z', 3000),
  run('ana', 'Ana', 'pink', '2026-01-01T09:00:00.000Z', 2500, 500, 55)
]

test('folds the vault into one state', (t) => {
  const s = snapshot(records, 'ana')

  t.alike(s.me, { key: 'ana', skier: { name: 'Ana', color: 'pink' } })
  t.alike(
    s.runs.map((r) => r.startedAt),
    ['2026-01-01T09:00:00.000Z', '2026-01-01T10:00:00.000Z', '2026-01-02T10:00:00.000Z']
  )
  t.is(s.runs[0].track.length, 2)
  t.alike(s.arrived, [])
  t.is(s.invite, null)
  t.is(s.join, null)
})

test('podium sums km per skier and keeps skiers with no runs', (t) => {
  const { podium } = snapshot(records, 'ana')

  t.alike(
    podium.map((p) => [p.key, p.distance, p.count, p.drop, p.topSpeed]),
    [
      ['ana', 4500, 2, 800, 55],
      ['bel', 3000, 1, 500, 50],
      ['cam', 0, 0, 0, 0]
    ]
  )
  t.is(podium[0].latest, 'run:2026-01-02T10:00:00.000Z-ana')
  t.is(podium[2].latest, null)
  t.is(podium[2].name, 'Cam')
})

test('ignores entries it cannot read', (t) => {
  const broken = [
    ...records,
    { key: 'run:bad', value: '{nope' },
    { key: 'run:old', value: JSON.stringify({ v: 0 }) },
    { key: 'skier:zed', value: 'garbage' }
  ]

  const s = snapshot(broken, 'ana')

  t.is(s.runs.length, 3)
  t.is(s.podium.length, 3)
})

test('a device without a skier yet', (t) => {
  t.alike(snapshot([], 'new').me, { key: 'new', skier: null })
})
