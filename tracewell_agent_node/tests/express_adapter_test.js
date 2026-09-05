'use strict';

const express = require('express');
const { Tracer } = require('../src/core/tracer.js');
const { tracewellMiddleware, getTracer } = require('../src/adapters/express.js');

class FakeClient {
  constructor() {
    this.sent = [];
  }
  send(spanDict) {
    this.sent.push(spanDict);
  }
}

function buildApp(client) {
  const tracer = new Tracer(client);
  const app = express();
  app.use(express.json());
  app.use(tracewellMiddleware(tracer));

  app.get('/orders/:id', (req, res) => {
    const t = getTracer();
    t.span('fetch_order', { orderId: req.params.id }, async (span) => {
      span.metadata.found = true;
    }).then(() => {
      res.json({ id: req.params.id, item: 'widget' });
    });
  });

  app.get('/broken', (req, res) => {
    res.status(500).json({ error: 'something broke' });
  });

  app.get('/throws', (req, res, next) => {
    throw new Error('unexpected failure');
  });

  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });

  return app;
}

function get(port, path) {
  return fetch(`http://localhost:${port}${path}`);
}

async function testNestedSpanOnSuccess() {
  const client = new FakeClient();
  const app = buildApp(client);
  const server = app.listen(0);
  const port = server.address().port;

  const res = await get(port, '/orders/42');
  await res.json();
  await new Promise((r) => setTimeout(r, 50));

  server.close();

  const root = client.sent.find((s) => s.name === 'GET /orders/42');
  const child = client.sent.find((s) => s.name === 'fetch_order');

  if (!root) throw new Error('root span missing');
  if (!child) throw new Error('child span missing');
  if (child.parent_span_id !== root.span_id) throw new Error('child must nest under root');
  if (root.metadata.status_code !== 200) throw new Error(`expected status_code 200, got ${root.metadata.status_code}`);
  if (root.status !== 'ok') throw new Error(`expected root status ok, got ${root.status}`);

  console.log('[PASS] nested span on success: correct parent linkage, status_code captured');
}

async function testFiveHundredMarksErrorWithoutThrowing() {
  const client = new FakeClient();
  const app = buildApp(client);
  const server = app.listen(0);
  const port = server.address().port;

  await get(port, '/broken');
  await new Promise((r) => setTimeout(r, 50));
  server.close();

  const root = client.sent.find((s) => s.name === 'GET /broken');
  if (!root) throw new Error('root span missing');
  if (root.metadata.status_code !== 500) throw new Error(`expected status_code 500, got ${root.metadata.status_code}`);
  if (root.status !== 'error') {
    throw new Error(`expected status='error' for a 500 response returned WITHOUT throwing, got '${root.status}'`);
  }

  console.log('[PASS] 500 response (no exception) correctly marked status=error');
}

async function testThrownExceptionMarksError() {
  const client = new FakeClient();
  const app = buildApp(client);
  const server = app.listen(0);
  const port = server.address().port;

  await get(port, '/throws');
  await new Promise((r) => setTimeout(r, 50));
  server.close();

  const root = client.sent.find((s) => s.name === 'GET /throws');
  if (!root) throw new Error('root span missing');
  if (root.metadata.status_code !== 500) throw new Error(`expected status_code 500, got ${root.metadata.status_code}`);
  if (root.status !== 'error') throw new Error(`expected status=error, got ${root.status}`);

  console.log('[PASS] thrown exception, caught by Express error handler, still correctly marked status=error');
}

async function main() {
  await testNestedSpanOnSuccess();
  await testFiveHundredMarksErrorWithoutThrowing();
  await testThrownExceptionMarksError();
  console.log('\nAll Express adapter checks passed.');
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});