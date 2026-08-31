from django.utils import timezone
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Span, ConnectedApp

class IngestConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.app_name = None
        await self.accept()

    async def disconnect(self, close_code):
        print(f"[TRACE] IngestConsumer.disconnect() called, app_name={self.app_name}, close_code={close_code}")
        if self.app_name:
            await self._mark_disconnected(self.app_name)

    async def receive_json(self, content, **kwargs):
        msg_type = content.get('type')
        if msg_type == 'register':
            self.app_name = content.get('app_name')
            await self._save_registration(content)
        elif msg_type == 'span':
            await self._save_span(content.get('data', {}))
        elif msg_type == 'heartbeat':
            print(f"[TRACE] heartbeat received from {self.app_name}")
            await self._touch_last_seen(self.app_name)

    @database_sync_to_async
    def _save_registration(self, content):
        ConnectedApp.objects.update_or_create(
            app_name=content.get('app_name'),
            defaults={'framework': content.get('framework'), 'is_connected': True},
        )

    @database_sync_to_async
    def _save_span(self, data):
        Span.objects.create(
            span_id=data.get('span_id'),
            trace_id=data.get('trace_id'),
            parent_span_id=data.get('parent_span_id'),
            name=data.get('name'),
            app_name=self.app_name or 'unknown',
            start_time=data.get('start_time'),
            end_time=data.get('end_time'),
            duration_ms=data.get('duration_ms'),
            status=data.get('status'),
            metadata=data.get('metadata') or {},
        )

    @database_sync_to_async
    def _touch_last_seen(self, app_name):
        if app_name:
            ConnectedApp.objects.filter(app_name=app_name).update(last_seen=timezone.now())

    @database_sync_to_async
    def _mark_disconnected(self, app_name):
        ConnectedApp.objects.filter(app_name=app_name).update(is_connected=False)