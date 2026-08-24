from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Span, ConnectedApp
from .serializers import SpanSerializer, ConnectedAppSerializer

@api_view(['GET'])
def list_traces(request):
    trace_ids = Span.objects.values_list('trace_id', flat=True).distinct()
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

    return Response(summaries)

@api_view(['GET'])
def trace_detail(request, trace_id):
    spans = Span.objects.filter(trace_id=trace_id)
    return Response(SpanSerializer(spans, many=True).data)

@api_view(['GET'])
def list_connected_apps(request):
    apps = ConnectedApp.objects.all()
    return Response(ConnectedAppSerializer(apps, many=True).data)