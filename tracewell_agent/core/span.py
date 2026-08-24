import time
import uuid
import contextlib
import contextvars
from typing import Any, Dict, Optional

_current_trace_id = contextvars.ContextVar('tracewell_trace_id', default=None)
_current_span_id = contextvars.ContextVar('tracewell_span_id', default=None)

class Span:
    def __init__(
            self,
            name: str,
            trace_id: Optional[str] = None,
            parent_span_id: Optional[str] = None,
            span_id: Optional[str] = None,
            metadata: Optional[Dict[str, Any]] = None,
    ):

        self.span_id = span_id or uuid.uuid4().hex
        self.trace_id = trace_id or self.span_id
        self.parent_span_id = parent_span_id
        self.name = name
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None
        self.status = 'in_progress'
        self.metadata: Dict[str, Any] = metadata or {}

    def start(self) -> 'Span':
        self.start = time.time()
        return self

    def end(self, status: str = 'ok') -> 'Span':
        self.end_time = time.time()
        self.status = status
        return self

    @property
    def duration_ms(self) -> Optional[float]:
        if self.start_time is None or self.end_time is None:
            return None
        return round((self.end_time - self.start_time) * 1000, 3)

    def to_dict(self) ->Dict[str, Any]:
        return {
            'span_id': self.span_id,
            'trace_id': self.trace_id,
            'parent_span_id': self.parent_span_id,
            'name': self.name,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'duration_ms': self.duration_ms,
            'status': self.status,
            'metadata': self.metadata,
        }

class Tracer:
    def __init__(self, client):
        self._client = client

    @contextlib.contextmanager
    def span(self, name: str, metadata: Optional[Dict[str, Any]] = None):
        parent_span_id = _current_span_id.get()
        trace_id = _current_trace_id.get()

        span = Span(name=name, trace_id=trace_id, parent_span_id=parent_span_id, metadata=metadata)

        trace_token = _current_trace_id.set(span.trace_id)
        span_token = _current_span_id.set(span.span_id)
        span.start()

        try:
            yield span
        except Exception as exc:
            span.metadata['error'] = repr(exc)
            span.end(status='error')
            raise
        else:
            span.end(status='ok')
        finally:
            self._client.send(span.to_dict())
            _current_span_id.reset(span_token)
            _current_trace_id.reset(trace_token)

    @contextlib.asynccontextmanager
    async def aspan(self, name: str, metadata: Optional[Dict[str, Any]] = None):
        parent_span_id = _current_span_id.get()
        trace_id = _current_trace_id.get()

        span = Span(name=name, trace_id=trace_id, parent_span_id=parent_span_id, metadata=metadata)

        trace_token = _current_trace_id.set(span.trace_id)
        span_token = _current_span_id.set(span.span_id)

        try:
            yield span
        except Exception as exc:
            span.metadata['error'] = repr(exc)
            span.end(status='error')
            raise
        else:
            span.end(status='ok')
        finally:
            self._client.send(span.to_dict())
            _current_span_id.reset(span_token)
            _current_trace_id.reset(trace_token)