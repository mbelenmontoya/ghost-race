const test = require('brittle')
const { createRequestHandler, toEvent } = require('../workers/protocol')

const frame = (message) => Buffer.from(JSON.stringify(message))

test('runs the handler for the request type and returns its result', async (t) => {
  const handle = createRequestHandler({
    'get-status': (payload) => ({ echoed: payload.value })
  })

  const response = await handle(frame({ id: 'r1', type: 'get-status', payload: { value: 42 } }))

  t.alike(response, { id: 'r1', ok: true, result: { echoed: 42 } })
})

test('rejects a frame that is not JSON', async (t) => {
  const handle = createRequestHandler({})

  const response = await handle(Buffer.from('pear:applyUpdate'))

  t.is(response.id, null)
  t.is(response.ok, false)
  t.is(response.error.code, 'BAD_REQUEST')
})

test('rejects a request without a string id or type', async (t) => {
  const handle = createRequestHandler({ 'get-status': () => ({}) })

  const missingId = await handle(frame({ type: 'get-status' }))
  const numericType = await handle(frame({ id: 'r2', type: 7 }))

  t.alike([missingId.id, missingId.ok, missingId.error.code], [null, false, 'BAD_REQUEST'])
  t.alike([numericType.id, numericType.ok, numericType.error.code], ['r2', false, 'BAD_REQUEST'])
})

test('answers an unknown type with UNKNOWN_TYPE and keeps the id', async (t) => {
  const handle = createRequestHandler({ 'get-status': () => ({}) })

  const response = await handle(frame({ id: 'r3', type: 'delete-everything' }))

  t.alike(response, {
    id: 'r3',
    ok: false,
    error: { code: 'UNKNOWN_TYPE', message: 'Unknown request type: delete-everything' }
  })
})

test('does not treat inherited object keys as request types', async (t) => {
  const handle = createRequestHandler({})

  const response = await handle(frame({ id: 'r4', type: 'toString' }))

  t.is(response.error.code, 'UNKNOWN_TYPE')
})

test('passes the error code thrown by a handler through to the response', async (t) => {
  const handle = createRequestHandler({
    'get-status': () => {
      const err = new Error('Vault is locked by another instance')
      err.code = 'VAULT_UNAVAILABLE'
      throw err
    }
  })

  const response = await handle(frame({ id: 'r5', type: 'get-status' }))

  t.alike(response, {
    id: 'r5',
    ok: false,
    error: { code: 'VAULT_UNAVAILABLE', message: 'Vault is locked by another instance' }
  })
})

test('reports a handler error without a code as INTERNAL', async (t) => {
  const handle = createRequestHandler({
    'get-status': () => {
      throw new Error('boom')
    }
  })

  const response = await handle(frame({ id: 'r6', type: 'get-status' }))

  t.alike(response.error, { code: 'INTERNAL', message: 'boom' })
})

test('defaults a missing payload to an empty object', async (t) => {
  let received = null
  const handle = createRequestHandler({
    'get-status': (payload) => {
      received = payload
      return null
    }
  })

  await handle(frame({ id: 'r7', type: 'get-status' }))

  t.alike(received, {})
})

test('serializes events as JSON without an id', (t) => {
  t.alike(JSON.parse(toEvent('updater', { status: 'updating' })), {
    type: 'updater',
    payload: { status: 'updating' }
  })
})
