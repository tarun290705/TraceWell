import asyncio
import json
import time
import uuid
import websockets

async def main():
    async with websockets.connect("ws://localhost:8000/ws/ingest/") as ws:
        await ws.send(json.dumps({
            "type": "register", "app_name": "test-app", "framework": "fastapi",
        }))

        trace_id = uuid.uuid4().hex
        root_span_id = trace_id  # root convention from Phase 1
        now = time.time()

        root = {
            "span_id": root_span_id, "trace_id": trace_id, "parent_span_id": None,
            "name": "http_request", "start_time": now, "end_time": now + 0.05,
            "duration_ms": 50.0, "status": "ok", "metadata": {"path": "/api/orders/"},
        }
        auth_span_id = uuid.uuid4().hex
        auth = {
            "span_id": auth_span_id, "trace_id": trace_id, "parent_span_id": root_span_id,
            "name": "authentication", "start_time": now, "end_time": now + 0.01,
            "duration_ms": 10.0, "status": "ok", "metadata": {},
        }
        db = {
            "span_id": uuid.uuid4().hex, "trace_id": trace_id, "parent_span_id": root_span_id,
            "name": "db_insert", "start_time": now + 0.01, "end_time": now + 0.04,
            "duration_ms": 30.0, "status": "ok", "metadata": {"query": "INSERT INTO orders..."},
        }

        for span in [root, auth, db]:
            await ws.send(json.dumps({"type": "span", "data": span}))
            await asyncio.sleep(0.1)

        print("Sent trace_id:", trace_id)

asyncio.run(main())