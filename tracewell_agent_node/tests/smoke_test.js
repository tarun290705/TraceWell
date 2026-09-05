'use strict';

const { Tracer } = require('../src/core/tracer.js');

class FakeClient {
  constructor() {
    this.sent = [];
  }
  send(spanDict) {
    this.sent.push(spanDict);
  }
}

async function testBasicNesting() {
  const client = new FakeClient();
  const tracer = new Tracer(client);

  await tracer.span('http_request', { path: '/api/orders/' }, async () => {
    await tracer.span('authentication', async () => {});
    await tracer.span('validation', async () => {});
    await tracer.span('db_insert', async () => {});
  });

  const byName = Object.fromEntries(client.sent.map((s) => [s.name, s]));
  const root = byName['http_request'];
  const auth = byName['authentication'];
  const validate = byName['validation'];
  const dbInsert = byName['db_insert'];

  if (root.parent_span_id !== null) throw new Error('root span must have no parent');
  if (root.trace_id !== root.span_id) throw new Error('root span defines the trace_id');
  if (auth.trace_id !== root.trace_id) throw new Error('child must share trace_id');
  if (auth.parent_span_id !== root.span_id) throw new Error('child must point at parent');
  if (validate.parent_span_id !== root.span_id) throw new Error('validate must point at root');
  if (dbInsert.parent_span_id !== root.span_id) throw new Error('db_insert must point at root');
  if (!client.sent.every((s) => s.status === 'ok' && s.duration_ms !== null)) {
    throw new Error('all spans must be ok with a real duration');
  }
  console.log('[PASS] basic nesting: trace_id/parent_span_id correct for 4 spans');
}

async function testErrorCapture() {
  const client = new FakeClient();
  const tracer = new Tracer(client);

  try {
    await tracer.span('risky_op', async () => {
      throw new Error('boom');
    });
  } catch (e) {
    // expected
  }

  const span = client.sent[0];
  if (span.status !== 'error') throw new Error('expected status=error');
  if (!span.metadata.error.includes('boom')) throw new Error('expected error message captured');
  console.log('[PASS] error capture: exception recorded as status=error, re-thrown to caller');
}

async function testSequentialRequestsDontLeak() {
  const client = new FakeClient();
  const tracer = new Tracer(client);

  await tracer.span('request_a', async () => {});
  await tracer.span('request_b', async () => {});

  const traceIds = new Set(client.sent.map((s) => s.trace_id));
  if (traceIds.size !== 2) throw new Error('two independent requests must get two distinct trace_ids');
  console.log('[PASS] sequential requests: distinct trace_ids, no leakage');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function simulateConcurrentRequest(tracer, label, delayMs) {
  let traceId;
  await tracer.span(`http_request_${label}`, async (rootSpan) => {
    traceId = rootSpan.traceId;
    await sleep(delayMs);
    await tracer.span('db_query', async () => {
      await sleep(delayMs);
    });
  });
  return traceId;
}

async function testConcurrentRequestsDontLeak() {
  const client = new FakeClient();
  const tracer = new Tracer(client);

  const [traceIdA, traceIdB] = await Promise.all([
    simulateConcurrentRequest(tracer, 'A', 20),
    simulateConcurrentRequest(tracer, 'B', 10),
  ]);

  if (traceIdA === traceIdB) throw new Error('concurrent requests must not share a trace_id');

  const spansA = client.sent.filter((s) => s.trace_id === traceIdA);
  const spansB = client.sent.filter((s) => s.trace_id === traceIdB);
  if (spansA.length !== 2 || spansB.length !== 2) {
    throw new Error(`expected 2 spans each, got A=${spansA.length} B=${spansB.length}`);
  }

  const dbQueryA = spansA.find((s) => s.name === 'db_query');
  const rootA = spansA.find((s) => s.name === 'http_request_A');
  if (dbQueryA.parent_span_id !== rootA.span_id) {
    throw new Error("request A's db_query must nest under request A's root");
  }
  console.log('[PASS] concurrent async requests: no cross-contamination between traces');
}

async function main() {
  await testBasicNesting();
  await testErrorCapture();
  await testSequentialRequestsDontLeak();
  await testConcurrentRequestsDontLeak();
  console.log('\nAll Node core checks passed.');
}

main().catch((err) => {
  console.error('SMOKE TEST FAILED:', err);
  process.exit(1);
});