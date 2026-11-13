const test = require('brittle')
const { parse, summarize } = require('../workers/gpx')

function gpx(points, extra = '') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>run</name>${extra}<trkseg>
${points.join('\n')}
  </trkseg></trk>
</gpx>`
}

const pt = (lat, ele, time) =>
  `<trkpt lat="${lat}" lon="-68.0"><ele>${ele}</ele><time>${time}</time></trkpt>`

const descent = [
  pt(-54.7, 1000, '2026-08-14T10:00:00-03:00'),
  pt(-54.701, 990, '2026-08-14T10:00:10-03:00'),
  pt(-54.702, 980, '2026-08-14T10:00:20-03:00')
]

test('reads points and summarizes a descent', (t) => {
  const { points } = parse(gpx(descent))
  t.is(points.length, 3)
  t.is(points[1].ele, 990)

  const { stats, track, startedAt } = summarize(points)

  t.ok(Math.abs(stats.distance - 222.4) < 0.5, 'distance ' + stats.distance)
  t.is(stats.drop, 20)
  t.is(stats.duration, 20)
  t.ok(Math.abs(stats.topSpeed - 40) < 0.5, 'top speed ' + stats.topSpeed)
  t.is(startedAt, '2026-08-14T13:00:00.000Z')
  t.alike(
    track.map(([s, ele]) => [s, ele]),
    [
      [0, 1000],
      [10, 990],
      [20, 980]
    ]
  )
})

test('ignores attribute order and extra elements', (t) => {
  const odd = [
    `<trkpt lon="-68.0" lat="-54.7"><ele>500.5</ele><time>2026-01-01T00:00:00Z</time><hdop>3</hdop><extensions><gte:gps speed="1"/></extensions></trkpt>`,
    `<trkpt lon="-68.0" lat="-54.7005">
      <ele>480</ele>
      <time>2026-01-01T00:00:05Z</time>
    </trkpt>`
  ]
  const { points } = parse(gpx(odd, '<type>AlpineSki</type>'))
  t.alike(
    points.map((p) => [p.lat, p.ele]),
    [
      [-54.7, 500.5],
      [-54.7005, 480]
    ]
  )
})

test('rejects files it cannot race with', (t) => {
  const cases = [
    ['no points', '<gpx></gpx>'],
    [
      'missing elevation',
      gpx(['<trkpt lat="1" lon="1"><time>2026-01-01T00:00:00Z</time></trkpt>'])
    ],
    ['missing time', gpx(['<trkpt lat="1" lon="1"><ele>10</ele></trkpt>'])],
    [
      'going uphill',
      gpx([...descent].reverse().map((p, i) => p.replace(/T10:00:\d\d/, `T10:00:${10 + i * 10}`)))
    ]
  ]

  const messages = new Set()
  for (const [label, text] of cases) {
    try {
      summarize(parse(text).points)
      t.fail(label + ' should throw')
    } catch (err) {
      t.is(err.code, 'INVALID_GPX', label)
      messages.add(err.message)
    }
  }
  t.is(messages.size, cases.length, 'each problem has its own message')
})

test('time that goes backwards is rejected', (t) => {
  const back = [descent[1], descent[0]]
  t.exception(() => parse(gpx(back)), /time/)
})
