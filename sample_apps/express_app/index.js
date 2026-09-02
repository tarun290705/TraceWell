'use strict';

const express = require('express');
const crypto = require('node:crypto');

const { createTracer } = require('tracewell_agent_node');
const { tracewellMiddleware, getTracer } = require('tracewell_agent_node/src/adapters/express.js');

const app = express();
app.use(express.json());

const tracer = createTracer({ appName: 'sample-express-app', framework: 'express' });
app.use(tracewellMiddleware(tracer));

const ordersDb = {};

function fakeIo(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

app.post('/orders', async (req, res) => {
    const t = getTracer();
    const { item, quantity } = req.body;

    await t.span('authentication', async () => {
        await fakeIo(5);
    });

    let validationFailed = false;
    await t.span('validation', { item }, async (span) => {
        if (!quantity || quantity <= 0) {
            validationFailed = true;
            span.metadata.error_reason = 'quantity must be positive';
        }
    });

    if(validationFailed) {
        return res.status(400).json({ detail: 'quantity must be positive' });
    }

    let orderId;
    await t.span('business_logic', async () => {
        orderId = crypto.randomUUID().slice(0, 8);
        await fakeIo(10);
    });

    await t.span('db_insert', { orderId }, async (span) => {
        ordersDb[orderId] = { item, quantity };
        await fakeIo(20);
        span.metadata.rows_affected = 1;
    });

    res.json({ order_id: orderId, status: 'created' });
});

app.get('orders/:id', (req, res) => {
    const order = ordersDb[req.params.id];
    if (!order) {
        return res.status(404).json({ detail: 'order not found' });
    }
    res.json(order);
});

const PORT = 9003;
app.listen(PORT, () => {
    console.log(`sample-expres-app listening on port ${PORT}`);
});