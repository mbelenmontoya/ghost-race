const EARTH = 6371000

function invalid(message) {
  return Object.assign(new Error(message), { code: 'INVALID_GPX' })
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}="([^"]+)"`))
  return m ? Number(m[1]) : NaN
}

function child(body, name) {
  const m = body.match(new RegExp(`<${name}>([^<]+)</${name}>`))
  return m ? m[1].trim() : null
}

function parse(text) {
  const points = []
  for (const [, tag, body] of text.matchAll(/<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/g)) {
    const ele = child(body, 'ele')
    const time = child(body, 'time')
    if (ele === null) throw invalid('A track point has no elevation')
    if (time === null) throw invalid('A track point has no time')

    const p = {
      lat: attr(tag, 'lat'),
      lon: attr(tag, 'lon'),
      ele: Number(ele),
      time: Date.parse(time)
    }
    if ([p.lat, p.lon, p.ele, p.time].some(Number.isNaN)) {
      throw invalid('A track point has a value that is not a number')
    }

    const prev = points[points.length - 1]
    if (prev && p.time < prev.time) throw invalid('The time goes backwards in this track')
    points.push(p)
  }

  if (points.length < 2) throw invalid('No track points found in this file')
  return { points }
}

const rad = (deg) => (deg * Math.PI) / 180

function haversine(a, b) {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH * Math.asin(Math.sqrt(h))
}

const round = (n, places = 1) => Math.round(n * 10 ** places) / 10 ** places

// TODO: spot falls (sudden stop, elevation jump) so the skier can crash on the slope
function summarize(points) {
  const first = points[0]
  const last = points[points.length - 1]
  const drop = first.ele - last.ele
  if (drop <= 0) throw invalid("This doesn't look like a descent: it ends higher than it starts")

  const dist = [0]
  for (let i = 1; i < points.length; i++) {
    dist.push(dist[i - 1] + haversine(points[i - 1], points[i]))
  }
  const secs = points.map((p) => (p.time - first.time) / 1000)

  let top = 0
  let j = 0
  for (let i = 0; i < points.length; i++) {
    while (j < points.length - 1 && secs[j] - secs[i] < 5) j++
    if (secs[j] - secs[i] >= 5) top = Math.max(top, (dist[j] - dist[i]) / (secs[j] - secs[i]))
  }
  if (top === 0 && secs.at(-1) > 0) top = dist.at(-1) / secs.at(-1)

  const track = []
  let kept = -Infinity
  points.forEach((p, i) => {
    if (secs[i] - kept >= 2 || i === points.length - 1) {
      track.push([Math.round(secs[i]), round(p.ele), round(dist[i])])
      kept = secs[i]
    }
  })

  return {
    startedAt: new Date(first.time).toISOString(),
    stats: {
      distance: round(dist.at(-1)),
      drop: round(drop),
      topSpeed: round(top * 3.6),
      duration: Math.round(secs.at(-1))
    },
    track
  }
}

module.exports = { parse, summarize }
