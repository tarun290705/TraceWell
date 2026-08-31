from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Span, ConnectedApp
from .serializers import SpanSerializer, ConnectedAppSerializer
from django.db.models import Avg, Count, Max, Min, Q

@api_view(['GET'])
def list_traces(request):
    trace_ids = Span.objects.order_by().values_list('trace_id', flat=True).distinct()
    summaries = []

    for trace_id in trace_ids:
        root = Span.objects.filter(trace_id=trace_id, parent_span_id__isnull=True).first()
        if not root:
            continue

        summaries.append({
            'trace_id': trace_id,
            'root_name': root.name,
            'app_name': root.app_name,
            'status': root.status,
            'start_time': root.start_time,
            'duration_ms': root.duration_ms,
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