const test = require('brittle')
const { arrivals, move } = require('../workers/group')

const run = (key, who, startedAt) => ({ key, skier: { key: who }, startedAt })

test('arrivals keeps the newest unseen run of each other skier', (t) => {
  const runs = [
    run('a1', 'ana', '2026-01-01T10:00:00Z'),
    run('a2', 'ana', '2026-01-02T10:00:00Z'),
    run('b1', 'bel', '2026-01-01T09:00:00Z'),
    run('m1', 'me', '2026-01-03T10:00:00Z'),
    run('c1', 'cam', '2026-01-01T08:00:00Z')
  ]
  const seen = new Set(['c1'])

  t.alike(arrivals(seen, runs, 'me').sort(), ['a2', 'b1'])
})

test('arrivals is empty when everything was already seen', (t) => {
  const runs = [run('a1', 'ana', '2026-01-01T10:00:00Z')]
  t.alike(arrivals(new Set(['a1']), runs, 'me'), [])
})

test('move rewrites my skier and runs to the new writer key', (t) => {
  const gpx = Buffer.from('<gpx/>')
  const records = [
    { key: 'skier:old', value: JSON.stringify({ name: 'Belu', color: 'pink', peer: 'p1' }) },
    {
      key: 'run:1',
      value: JSON.stringify({
        v: 1,
        skier: { key: 'old', name: 'Belu', color: 'pink' },
        track: []
      }),
      file: gpx
    },
    { key: 'run:2', value: JSON.stringify({ v: 1, skier: { key: 'someone' } }) },
    { key: 'skier:someone', value: '{}' },
    { key: 'run:3', value: 'not json' }
  ]

  const out = move(records, 'old', 'new')

  t.alike(
    out.map((r) => r.key),
    ['skier:new', 'run:1']
  )
  t.is(JSON.parse(out[0].value).name, 'Belu')
  t.is(JSON.parse(out[1].value).skier.key, 'new')
  t.is(out[1].file, gpx)
})
