from django.conf import settings
from django.db import connection
from .. import create_tracer
from ..config import TracewellConfig

_tracer = None

def get_tracer():
    if _tracer is None:
        raise RuntimeError(
            'tracewell_agent: tracer not initialized -- is TracewellMiddleware in you MIDDLEWARE setting?'
        )

    return _tracer

class TracewellMiddleware:
    def __init__(self, get_response):
        global _tracer
        self.get_response = get_response
        if _tracer is None:
            config = TracewellConfig(
                app_name=getattr(settings, 'TRACEWELL_APP_NAME', 'django-app'),
                framework='django',
            )
            _tracer = create_tracer(config)
        self.tracer = _tracer

    def __call__(self, request):
        span_name = f'{request.method} {request.path}'

        def _query_wrapper(execute, sql, params, many, context):
            handle = self.tracer.start_span('sql_query', metadata={'statement': sql[:300]})
            try:
                result = execute(sql, params, many, context)
            except Exception as exc:
                self.tracer.end_span(handle, error=exc)
                raise
            else:
                self.tracer.end_span(handle, status='ok')
                return result

        with connection.execute_wrapper(_query_wrapper):
            with self.tracer.span(span_name, metadata={
                'method': request.method,
                'path': request.path,
            }) as span:
                response = self.get_response(request)
                span.metadata['status_code'] = response.status_code
                if response.status_code >= 500:
                    span.status = 'error'
                return response