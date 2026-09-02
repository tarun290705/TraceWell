'use strict';

const { AsyncLocalStorage } = require('node:async_hooks');
const { Span } = require('./span.js');

class Tracer {
    constructor(client) {
        this._client = client;
        this._als = new AsyncLocalStorage();
    }

    async span(name, metadataOrFn, maybeFn) {
        const metadata = typeof metadataOrFn === 'function' ? {} : metadataOrFn || {};
        const fn = typeof metadataOrFn === 'function' ? metadataOrFn : maybeFn;
        const parentStore = this._als.getStore();
        const span = new Span({
            name,
            traceId: parentStore?.traceId,
            parentSpanId: parentStore?.spanId,
            metadata,
        });
        span.start();

        const childStore = { traceId: span.traceId, spanId: span.spanId };

        return this._als.run(childStore, async () => {
            try{
                const result = await fn(span);
                if (span.status === 'in_progress') {
                    span.end('ok');
                } else {
                    span.endTime = Date.now() / 1000;
                }
                return result;
            } catch(err) {
                span.metadata.error = String(err);
                span.end('error');
                throw err;
            } finally {
                this._client.send(span.toDict());
            }
        });
    }

    get currentTraceId() {
        return this._als.getStore()?.traceId ??  null;
    }

    get currentSpanId() {
        return this._als.getStore()?.spanId ?? null;
    }
}

module.exports = { Tracer };