function createRequestHandler(handlers) {
  return async (frame) => {
    let request
    try {
      request = JSON.parse(frame.toString())
    } catch (err) {
      return failure(null, 'BAD_REQUEST', 'Request is not valid JSON')
    }

    const id = typeof request?.id === 'string' ? request.id : null
    if (id === null || typeof request.type !== 'string') {
      return failure(id, 'BAD_REQUEST', 'Request needs a string id and type')
    }

    if (!Object.hasOwn(handlers, request.type)) {
      return failure(id, 'UNKNOWN_TYPE', 'Unknown request type: ' + request.type)
    }

    try {
      const result = await handlers[request.type](request.payload ?? {})
      return { id, ok: true, result }
    } catch (err) {
      return failure(id, err.code || 'INTERNAL', err.message)
    }
  }
}

function failure(id, code, message) {
  return { id, ok: false, error: { code, message } }
}

function toEvent(type, payload) {
  return JSON.stringify({ type, payload })
}

module.exports = { createRequestHandler, toEvent }
