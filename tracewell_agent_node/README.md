# tracewell-agent-node

Node.js instrumentation agent for [TraceWell](../README.md) — the Express counterpart to the Python `tracewell_agent` package.

## Install

```bash
npm install <path-to-tracewell_agent_node>
```

## Usage

```javascript
const { createTracer } = require('tracewell_agent_node');
const { tracewellMiddleware, getTracer } = require('tracewell_agent_node/src/adapters/express.js');

const tracer = createTracer({ appName: 'my-app', framework: 'express' });
app.use(tracewellMiddleware(tracer));

app.post('/orders', async (req, res) => {
  const t = getTracer();
  await t.span('validate_order', { orderId: req.body.id }, async (span) => {
    // ...
  });
  res.json({ status: 'ok' });
});
```

## Automatic MongoDB query capture

```javascript
const { instrumentMongoCommands } = require('tracewell_agent_node/src/db/mongoCapture.js');

mongoose.connect(uri, { monitorCommands: true }).then(() => {
  instrumentMongoCommands(mongoose.connection.getClient(), tracer);
});
```

Captures collection name and field keys for every command — never actual field values (see the main README's design notes for why).

## Concurrency model

Uses `AsyncLocalStorage` to track the current span across concurrent async requests, the Node equivalent of Python's `contextvars`. Verified in `tests/smoke_test.js` with genuinely concurrent operations, not just sequential ones.

## Tests

```bash
npm test
```

Runs `tests/smoke_test.js` (core concurrency), `tests/client_test.js` (WebSocket client, reconnect, heartbeat), `tests/express_adapter_test.js` (middleware, including the >=500-without-throwing status fix), and `tests/mongo_capture_test.js` (MongoDB capture, including a test proving no field value ever leaks into span metadata).