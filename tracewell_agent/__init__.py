from .config import TracewellConfig
from .core.client import SpanCLient
from .core.span import Span, Tracer

__all__ = ['Span', 'Tracer', 'SpanClient', 'TracewellConfig', 'create_tracer']

def create_tracer(config: TracewellConfig) -> Tracer:
    client = SpanCLient(
        collector_ws_url=config.collector_ws_url,
        app_name=config.app_name,
        framework=config.framework
    )

    if config.enabled:
        client.start()

    return Tracer(client)