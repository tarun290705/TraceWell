'use strict';

const WebSocket = require('ws');

class SpanClient {
  constructor({
    collectorWsUrl,
    appName,
    framework,
    queueMaxSize = 1000,
    reconnectDelayMs = 3000,
    heartbeatIntervalMs = 5000,
    drainTickMs = 200,
  }) {
    this.collectorWsUrl = collectorWsUrl;
    this.appName = appName;
    this.framework = framework;
    this.queueMaxSize = queueMaxSize;
    this.reconnectDelayMs = reconnectDelayMs;
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.drainTickMs = drainTickMs;

    this._queue = [];
    this._stopped = false;
    this._started = false;
    this._ws = null;
  }

  start() {
    if (this._started) return;
    this._started = true;
    this._runLoop(); 
  }

  stop() {
    this._stopped = true;
    if (this._ws) {
      try {
        this._ws.close();
      } catch (_) {
        
      }
    }
  }

  send(spanDict) {
    if (this._queue.length >= this.queueMaxSize) {
      console.warn(`tracewell_agent: queue full (${this.queueMaxSize}), dropping span ${spanDict.span_id}`);
      return;
    }
    this._queue.push(spanDict);
  }

    async _runLoop() {
    while (!this._stopped) {
      try {
        await this._connectAndDrain();
      } catch (err) {
        console.warn(`tracewell_agent: connection failed (${err.message}), retrying in ${this.reconnectDelayMs}ms`);
      }
      if (this._stopped) break;
      await sleep(this.reconnectDelayMs);
    }
  }

  _connectAndDrain() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.collectorWsUrl);
      this._ws = ws;
      let tickTimer = null;
      let lastHeartbeat = Date.now();
      let settled = false;

      const finish = (err) => {
        if (tickTimer) clearInterval(tickTimer);
        if (settled) return;
        settled = true;
        if (err) reject(err);
        else resolve();
      };

      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'register', app_name: this.appName, framework: this.framework }));
        lastHeartbeat = Date.now();

        tickTimer = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) return;

          while (this._queue.length > 0) {
            const spanDict = this._queue.shift();
            ws.send(JSON.stringify({ type: 'span', data: spanDict }));
          }

          if (Date.now() - lastHeartbeat >= this.heartbeatIntervalMs) {
            ws.send(JSON.stringify({ type: 'heartbeat' }));
            lastHeartbeat = Date.now();
          }
        }, this.drainTickMs);
      });

      ws.on('close', () => finish(null));
      ws.on('error', (err) => finish(err));
    });
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { SpanClient };