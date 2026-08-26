from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from sqlalchemy import event as sa_event

_tracer = None

def get_tracer():
    if _tracer is None:
        raise RuntimeError('tracewell_agent: tracer not initialized -- did TracewellMiddleware run yet?')
    return _tracer

class TracewellMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, tracer):
        super().__init__(app)
        global _tracer
        self.tracer = tracer
        _tracer = tracer

    async def dispatch(self, request: Request, call_next):
        span_name = f'{request.method} {request.url.path}'
        async with self.tracer.aspan(span_name, metadata={
            'method': request.method,
            'path': request.url.path,
        }) as span:
            response = await call_next(request)
            span.metadata['status_code'] = response.status_code
            if response.status_code >= 500:
                span.status = 'error'
            return response

def instrument_sqlalchemy(engine):
    @sa_event.listens_for(engine, 'before_cursor_execute')
    def _before(conn, cursor, statement, parameters, context, executemany):
        handle = get_tracer().start_span('sql_query', metadata={'statement': statement[:300]})
        conn.info.setdefault('_tracewell_stack', []).append(handle)

    @sa_event.listens_for(engine, 'after_cursor_execute')
    def _after(conn, cursor, statement, parameters, context, executemany):
        stack = conn.info.get('_tracewell_stack')
        if stack:
            get_tracer().end_span(stack.pop(), status='ok')

    @sa_event.listens_for(engine, 'handle_error')
    def _on_error(exception_context):
        conn = exception_context.coonection
        stack = conn.info.get('_tracewell_stack') if conn is not None else None
        if stack:
            get_tracer().end_span(stack.pop(), error=exception_context.original_exception)            