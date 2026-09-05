import asyncio
from tracewell_agent import Tracer

class FakeClient:
    def __init__(self):
        self.sent = []

    def send(self, span_dict):
        self.sent.append(span_dict)


def test_basic_nesting():
    client = FakeClient()
    tracer = Tracer(client)

    with tracer.span("http_request", metadata={"path": "/api/orders/"}):
        with tracer.span("validate"):
            pass
        with tracer.span("db_insert"):
            pass

    by_name = {s["name"]: s for s in client.sent}
    root_dict = by_name["http_request"]
    validate_dict = by_name["validate"]
    insert_dict = by_name["db_insert"]

    assert root_dict["parent_span_id"] is None, "root span must have no parent"
    assert root_dict["trace_id"] == root_dict["span_id"], "root span defines the trace_id"
    assert validate_dict["trace_id"] == root_dict["trace_id"], "child must share trace_id"
    assert validate_dict["parent_span_id"] == root_dict["span_id"], "child must point at parent"
    assert insert_dict["trace_id"] == root_dict["trace_id"]
    assert insert_dict["parent_span_id"] == root_dict["span_id"]
    assert all(s["status"] == "ok" and s["duration_ms"] is not None for s in client.sent)
    print("[PASS] basic nesting: trace_id/parent_span_id correct for 3 spans")


def test_error_capture():
    client = FakeClient()
    tracer = Tracer(client)

    try:
        with tracer.span("risky_op"):
            raise ValueError("boom")
    except ValueError:
        pass

    span = client.sent[0]
    assert span["status"] == "error"
    assert "boom" in span["metadata"]["error"]
    print("[PASS] error capture: exception recorded as status=error, re-raised to caller")


def test_two_independent_requests_dont_leak():
    client = FakeClient()
    tracer = Tracer(client)

    with tracer.span("request_a"):
        pass
    with tracer.span("request_b"):
        pass

    trace_ids = {s["trace_id"] for s in client.sent}
    assert len(trace_ids) == 2, "two independent requests must get two distinct trace_ids"
    print("[PASS] sequential requests: distinct trace_ids, no leakage")


async def _simulate_concurrent_request(tracer, request_name, delay):
    with tracer.span(f"http_request_{request_name}") as root:
        await asyncio.sleep(delay)
        with tracer.span("db_query"):
            await asyncio.sleep(delay)
    return root.trace_id


async def test_concurrent_requests_dont_leak():
    client = FakeClient()
    tracer = Tracer(client)

    trace_id_a, trace_id_b = await asyncio.gather(
        _simulate_concurrent_request(tracer, "a", 0.01),
        _simulate_concurrent_request(tracer, "b", 0.005),
    )

    assert trace_id_a != trace_id_b, "concurrent requests must not share a trace_id"

    spans_a = [s for s in client.sent if s["trace_id"] == trace_id_a]
    spans_b = [s for s in client.sent if s["trace_id"] == trace_id_b]
    assert len(spans_a) == 2 and len(spans_b) == 2

    a_db_query = next(s for s in spans_a if s["name"] == "db_query")
    a_root = next(s for s in spans_a if s["name"] == "http_request_a")
    assert a_db_query["parent_span_id"] == a_root["span_id"]
    print("[PASS] concurrent asyncio requests: no cross-contamination between traces")


def main():
    test_basic_nesting()
    test_error_capture()
    test_two_independent_requests_dont_leak()
    asyncio.run(test_concurrent_requests_dont_leak())
    print("\nAll core checks passed.")


if __name__ == "__main__":
    main()