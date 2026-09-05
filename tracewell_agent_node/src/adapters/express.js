'use strict';

let _tracer = null;

function getTracer() {
    if (!_tracer) {
        throw new Error('tracewell_agent: tracer not initializer -- did tracewellMiddleware() run before this route?');
    }
    return _tracer;
}

function tracewellMiddleware(tracer) {
    _tracer = tracer;

    return function (req, res, next) {
        const spanName = `${req.method} ${req.path}`;

        tracer
            .span(spanName, {method: req.method, path: req.path}, (span) => {
                return new Promise((resolve) => {
                    let settled = false;
                    const finish = () => {
                        if (settled) return;
                        settled = true;
                        if (req.route) {
                            span.metadata.route = (req.baseUrl || '') + req.route.path;
                        }
                        span.metadata.status_code = res.statusCode;
                        if(res.statusCode >= 500) {
                            span.status = 'error';
                        }
                        resolve();
                    };
                    res.once('finish', finish);
                    res.once('close', finish);
                    next();
                });
            })
            .catch((err) => {
                next(err);
            });
    };
}

module.exports = { tracewellMiddleware, getTracer };