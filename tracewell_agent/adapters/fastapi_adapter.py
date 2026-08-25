from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class TracewellMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, tracer):
        super().__init__(app)
        self.tracer = tracer

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