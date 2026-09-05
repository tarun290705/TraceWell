'use strict';

const { EventEmitter } = require('node:events');
const { Tracer } = require('../src/core/tracer.js');
const { instrumentMongoCommands, describeCommand } = require('../src/db/mongoCapture.js');

class FakeClient {
  constructor() {
    this.sent = [];
  }
  send(spanDict) {
    this.sent.push(spanDict);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testNestedUnderManualSpan() {
  const client = new FakeClient();
  const tracer = new Tracer(client);
  const fakeMongo = new EventEmitter();
  instrumentMongoCommands(fakeMongo, tracer);

  await tracer.span('fetch_passenger', async () => {
    const requestId = 1;
    fakeMongo.emit('commandStarted', { requestId, commandName: 'find' });
    await sleep(10);
    fakeMongo.emit('commandSucceeded', { requestId });
  });

  const root = client.sent.find((s) => s.name === 'fetch_passenger');
  const dbSpan = client.sent.find((s) => s.name === 'db_query');

  if (!root) throw new Error('root span missing');
  if (!dbSpan) throw new Error('db_query span missing');
  if (dbSpan.parent_span_id !== root.span_id) {
    throw new Error('db_query did NOT nest under fetch_passenger -- AsyncLocalStorage context was lost');
  }
  if (dbSpan.status !== 'ok') throw new Error('expected db_query status ok');

  console.log('[PASS] db_query correctly nests under the manual span that triggered it');
}

async function testFailedCommandMarksError() {
  const client = new FakeClient();
  const tracer = new Tracer(client);
  const fakeMongo = new EventEmitter();
  instrumentMongoCommands(fakeMongo, tracer);

  await tracer.span('risky_write', async () => {
    const requestId = 2;
    fakeMongo.emit('commandStarted', { requestId, commandName: 'insert' });
    await sleep(5);
    fakeMongo.emit('commandFailed', { requestId, failure: new Error('duplicate key') });
  });

  const dbSpan = client.sent.find((s) => s.name === 'db_query');
  if (!dbSpan) throw new Error('db_query span missing');
  if (dbSpan.status !== 'error') throw new Error('expected db_query status=error on commandFailed');
  if (!dbSpan.metadata.error.includes('duplicate key')) throw new Error('expected failure message captured');

  console.log('[PASS] commandFailed correctly marks the db_query span as error');
}

async function testConcurrentQueriesDontCrossLink() {
  const client = new FakeClient();
  const tracer = new Tracer(client);
  const fakeMongo = new EventEmitter();
  instrumentMongoCommands(fakeMongo, tracer);

  async function simulateRequest(label, requestId, delayMs) {
    let rootId;
    await tracer.span(`op_${label}`, async (span) => {
      rootId = span.spanId;
      fakeMongo.emit('commandStarted', { requestId, commandName: 'find' });
      await sleep(delayMs);
      fakeMongo.emit('commandSucceeded', { requestId });
    });
    return rootId;
  }

  const [rootA, rootB] = await Promise.all([
    simulateRequest('A', 10, 20),
    simulateRequest('B', 11, 10),
  ]);

  const dbSpans = client.sent.filter((s) => s.name === 'db_query');
  if (dbSpans.length !== 2) throw new Error(`expected 2 db_query spans, got ${dbSpans.length}`);

  const parents = dbSpans.map((s) => s.parent_span_id).sort();
  const expected = [rootA, rootB].sort();
  if (JSON.stringify(parents) !== JSON.stringify(expected)) {
    throw new Error('concurrent db_query spans were cross-linked to the wrong parent');
  }

  console.log('[PASS] concurrent queries correctly nest under their own request, no cross-contamination');
}

async function testNeverLeaksActualValues() {
  const event = {
    commandName: 'insert',
    command: {
      insert: 'passengers',
      documents: [{ name: 'Alice', email: 'alice@example.com', password: 'super-secret-123' }],
    },
  };

  const description = describeCommand(event);
  const serialized = JSON.stringify(description);

  if (serialized.includes('super-secret-123')) {
    throw new Error('LEAK: the actual password value appeared in captured metadata');
  }
  if (serialized.includes('alice@example.com')) {
    throw new Error('LEAK: the actual email value appeared in captured metadata');
  }
  if (description.collection !== 'passengers') throw new Error('expected collection name to be captured');
  if (!description.document_keys.includes('password')) {
    throw new Error('expected field KEY "password" to be visible (keys are fine, values are not)');
  }

  console.log('[PASS] captures field names/shape but never actual values -- password value confirmed absent');
}

async function main() {
  await testNestedUnderManualSpan();
  await testFailedCommandMarksError();
  await testConcurrentQueriesDontCrossLink();
  await testNeverLeaksActualValues();
  console.log('\nAll mongo capture checks passed.');
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});