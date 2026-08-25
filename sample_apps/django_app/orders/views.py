import time
import uuid
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from tracewell_agent.adapters.django_adapter import get_tracer

_orders_db = {}

@csrf_exempt
@require_POST
def create_order(request):
    tracer = get_tracer()
    body = json.loads(request.body)

    with tracer.span('authentication'):
        time.sleep(0.005)

    with tracer.span('validation', metadata={'item': body.get('item')}):
        if body.get('quantity', 0) <= 0:
            return JsonResponse({'detail': 'quantity must be positive'}, status=400)

    with tracer.span('business_logic'):
        order_id = str(uuid.uuid4())[:8]
        time.sleep(0.01)

    with tracer.span('db_insert', metadata={'order_id': order_id}) as span:
        _orders_db[order_id] = {'item': body.get('item'), 'quantity': body.get('qunatity')}
        time.sleep(0.02)
        span.metadata['rows_affected'] = 1

    return JsonResponse({'order_id': order_id, 'status': 'created'})

@require_GET
def get_order(request, order_id):
    if order_id not in _orders_db:
        return JsonResponse({'detail': 'order not found'}, status=404)
    return JsonResponse(_orders_db[order_id])