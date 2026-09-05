'use strict';

const { WebSocketServer } = require('ws');
const { SpanClient } = require('../src/core/client.js');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testRegistrationAndSpanDelivery() {
  const received = [];
  const wss = new WebSocketServer({ port: 8765 });
  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      received.push(JSON.parse(raw.toString()));
    });
  });

  const client = new SpanClient({
    collectorWsUrl: 'ws://localhost:8765',
    appName: 'test-node-app',
    framework: 'express',
    reconnectDelayMs: 200,
    drainTickMs: 20,
  });
  client.start();

  await sleep(150);
  client.send({ span_id: 'a', trace_id: 'a', parent_span_id: null, name: 'root', status: 'ok' });
  client.send({ span_id: 'b', trace_id: 'a', parent_span_id: 'a', name: 'child', status: 'ok' });
  await sleep(150);

  client.stop();
  await sleep(50);
  wss.close();

  if (received.length !== 3) throw new Error(`expected 3 messages, got ${received.length}`);
  if (received[0].type !== 'register') throw new Error('first message must be registration');
  if (received[0].app_name !== 'test-node-app') throw new Error('registration must include app_name');
  if (received[1].data.span_id !== 'a') throw new Error('span "a" out of order or missing');
  if (received[2].data.span_id !== 'b') throw new Error('span "b" out of order or missing');

  console.log('[PASS] registration + span delivery, in order');
}

async function testHeartbeat() {
  const received = [];
  const wss = new WebSocketServer({ port: 8766 });
  wss.on('connection', (ws) => {
    ws.on('message', (raw) => received.push(JSON.parse(raw.toString())));
  });

  const client = new SpanClient({
    collectorWsUrl: 'ws://localhost:8766',
    appName: 'idle-app',
    framework: 'express',
    heartbeatIntervalMs: 100,
    drainTickMs: 20,
  });
  client.start();

  await sleep(300);

  client.stop();
  await sleep(50);
  wss.close();

  const heartbeats = received.filter((m) => m.type === 'heartbeat');
  if (heartbeats.length < 1) throw new Error('expected at least one heartbeat while idle, got 0');

  console.log(`[PASS] heartbeat fires while idle (${heartbeats.length} received in 300ms with 100ms interval)`);
}

async function testReconnectAfterServerDrop() {
  let connectionCount = 0;
  const wss = new WebSocketServer({ port: 8767 });
  wss.on('connection', (ws) => {
    connectionCount++;
    if (connectionCount === 1) {
      setTimeout(() => ws.close(), 50);
    }
  });

  const client = new SpanClient({
    collectorWsUrl: 'ws://localhost:8767',
    appName: 'flaky-test-app',
    framework: 'express',
    reconnectDelayMs: 100,
    drainTickMs: 20,
  });
  client.start();

  const deadline = Date.now() + 3000;
  while (connectionCount < 2 && Date.now() < deadline) {
    await sleep(100);
  }

  client.stop();
  await sleep(50);
  wss.close();

  if (connectionCount < 2) throw new Error(`expected at least 2 connection attempts, got ${connectionCount} after 3s`);
  console.log(`[PASS] reconnects automatically after the collector drops the connection (${connectionCount} connections observed)`);
}

async function main() {
  await testRegistrationAndSpanDelivery();
  await testHeartbeat();
  await testReconnectAfterServerDrop();
  console.log('\nAll Node client checks passed.');
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});