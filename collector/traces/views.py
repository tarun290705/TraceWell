from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Span, ConnectedApp
from .serializers import SpanSerializer, ConnectedAppSerializer
from django.db.models import Avg, Count, Max, Min, Q
import statistics

def _endpoint_baselines(roots):
    grouped = {}
    for span in roots:
        route = span.metadata.get('route') if isinstance(span.metadata, dict) else None
        key = (span.app_name, route or span.name)
        grouped.setdefault(key, []).append(span.duration_ms)

    baselines = {}
    for key, durations in grouped.items():
        durations = [d for d in durations if d is not None]
        if len(durations) >= 2:
            baselines[key] = (statistics.mean(durations), statistics.stdev(durations))
    return baselines

@api_view(['GET'])
def list_traces(request):
    all_roots = list(Span.objects.filter(parent_span_id__isnull=True))
    baselines = _endpoint_baselines(all_roots)
    trace_ids = Span.objects.order_by().values_list('trace_id', flat=True).distinct()
    summaries = []

    for trace_id in trace_ids:
        root = Span.objects.filter(trace_id=trace_id, parent_span_id__isnull=True).first()
        if not root:
            continue

        route = root.metadata.get('route') if isinstance(root.metadata, dict) else None
        key = (root.app_name, route or root.name)
        baseline = baselines.get(key)

        is_anomalous = False
        if baseline and root.duration_ms is not None:
            mean, stdev = baseline
            if stdev > 0:
                is_anomalous = root.duration_ms > (mean + 2 * stdev)

        summaries.append({
            'trace_id': trace_id,
            'root_name': root.name,
            'app_name': root.app_name,
            'status': root.status,
            'start_time': root.start_time,
            'duration_ms': root.duration_ms,
            'is_anomalous': is_anomalous,
        })
    summaries.sort(key=lambda s: s['start_time'] or 0, reverse=True)
    return Response(summaries)

@api_view(['GET'])
def trace_detail(request, trace_id):
    spans = Span.objects.filter(trace_id=trace_id)
    return Response(SpanSerializer(spans, many=True).data)

@api_view(['GET'])
def list_connected_apps(request):
    apps = ConnectedApp.objects.all()
    return Response(ConnectedAppSerializer(apps, many=True).data)

@api_view(['GET'])
def endpoint_stats(request):
    roots = Span.objects.filter(parent_span_id__isnull=True)
    grouped = {}
    for span in roots:
        route = span.metadata.get('route') if isinstance(span.metadata, dict) else None
        key_name = route or span.name
        key = (span.app_name, span.name)
        grouped.setdefault(key, []).append(span)

    results = []
    for (app_name, name), spans in grouped.items():
        durations = [s.duration_ms for s in spans if s.duration_ms is not None]
        error_count = sum(1 for s in spans if s.status == 'error')
        results.append({
            'name': name,
            'app_name': app_name,
            'count': len(spans),
            'avg_duration_ms': sum(durations) / len(durations) if durations else None,
            'min_duration_ms': min(durations) if durations else None,
            'max_duration_ms': max(durations) if durations else None,
            'error_rate': error_count / len(spans) if spans else 0,
        })
    results.sort(key=lambda r: r['avg_duration_ms'] or 0, reverse=True)
    return Response(results)