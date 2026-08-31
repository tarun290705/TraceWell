from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from .models import Span, ConnectedApp

STALE_AFTER_SECONDS = 15

class SpanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Span
        fields = [
            'span_id', 'trace_id', 'parent_span_id', 'name', 'app_name',
            'start_time', 'end_time', 'duration_ms', 'status', 'metadata',
        ]

class ConnectedAppSerializer(serializers.ModelSerializer):
    is_connected = serializers.SerializerMethodField()
    class Meta:
        model = ConnectedApp
        fields = ['app_name', 'framework', 'is_connected', 'last_seen']

    def get_is_connected(self, obj):
        if not obj.is_connected:
            return False
        return (timezone.now() - obj.last_seen) < timedelta(seconds=STALE_AFTER_SECONDS)
