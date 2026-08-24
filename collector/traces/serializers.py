from rest_framework import serializers
from .models import Span, ConnectedApp

class SpanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Span
        fields = [
            'span_id', 'trace_id', 'parent_span_id', 'name', 'app_name',
            'start_time', 'end_time', 'duration_ms', 'status', 'metadata',
        ]

class ConnectedAppSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConnectedApp
        fields = ['app_name', 'framework', 'is_connected', 'last_seen']
