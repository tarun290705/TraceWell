from django.db import models

class ConnectedApp(models.Model):
    app_name = models.CharField(max_length=255, unique=True)
    framework = models.CharField(max_length=50)
    is_connected = models.BooleanField(default=True)
    last_seen = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.app_name} ({self. framework})'

class Span(models.Model):
    span_id =  models.CharField(max_length=64, unique=True)
    trace_id = models.CharField(max_length=64, db_index=True)
    parent_span_id = models.CharField(max_length=64, null=True, blank=True)
    name = models.CharField(max_length=255)
    app_name = models.CharField(max_length=255)
    start_time = models.FloatField(null=True)
    end_time = models.FloatField(null=True)
    duration_ms = models.FloatField(null=True)
    status = models.CharField(max_length=20, default='in_progress')
    metadata = models.JSONField(default=dict, blank=True)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['start_time']

    def __str__(self):
        return f'{self.name} [{self.status}] trace={self.trace_id[:8]}'