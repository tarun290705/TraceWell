'use strict';

const crypto = require('node:crypto');

class Span {
    constructor({ name, traceId, parentSpanId, spanId, metadata}) {
        this.spanId = spanId || crypto.randomUUID().replace(/-/g, '');
        this.traceId = traceId || this.spanId;
        this.parentSpanId = parentSpanId || null;
        this.name = name;
        this.startTime = null;
        this.endTime = null;
        this.status = 'in_progress';
        this.metadata = metadata || {};
    }

    start() {
        this.startTime = Date.now() / 1000;
        return this;
    }

    end(status = 'ok') {
        this.endTime = Date.now() / 1000;
        this.status = status;
        return this;
    }

    get durationMs() {
        if(this.startTime == null || this.endTime == null) return null;
        return Math.round((this.endTime - this.startTime) * 1000 * 1000) / 1000;
    }

    toDict() {
        return {
            span_id: this.spanId,
            trace_id: this.traceId,
            parent_span_id: this.parentSpanId,
            name: this.name,
            start_time: this.startTime,
            end_time: this.endTime,
            duration_ms: this.durationMs,
            status: this.status,
            metadata: this .metadata,
        };
    }
}

module.exports = { Span };