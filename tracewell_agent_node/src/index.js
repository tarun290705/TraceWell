'use strict';

const { Tracer } = require('./core/tracer.js');
const { SpanClient } = require('./core/client.js');
const { Span } = require('./core/span.js');

function createTracer({ appName, framework, collectorWsUrl = 'ws://localhost:8000/ws/ingest/', enabled = true }) {
    const client = new SpanClient({ collectorWsUrl, appName, framework });
    if (enabled) {
        client.start();
    }

    return new Tracer(client);
}

module.exports = { createTracer, Tracer, SpanClient, Span };