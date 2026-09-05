from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from tracewell_agent import Tracer
from tracewell_agent.adapters.fastapi_adapter import TracewellMiddleware, get_tracer


class FakeClient:
    def __init__(self):
        self.sent = []

    def send(self, span_dict):
        self.sent.append(span_dict)


def build_app(client):
    tracer = Tracer(client)
    app = FastAPI()
    app.add_middleware(TracewellMiddleware, tracer=tracer)

    @app.get("/orders/{order_id}")
    async def get_order(order_id: str):
        t = get_tracer()
        async with t.aspan("fetch_order", metadata={"order_id": order_id}) as span:
            span.metadata["found"] = True
        return {"id": order_id, "item": "widget"}

    @app.get("/broken")
    async def broken():
        return JSONResponse(status_code=500, content={"error": "something broke"})

    @app.get("/throws")
    async def throws():
        raise ValueError("unexpected failure")

    return app


def test_nested_span_on_success():
    client = FakeClient()
    app = build_app(client)
    test_client = TestClient(app)

    response = test_client.get("/orders/42")
    assert response.status_code == 200

    root = next(s for s in client.sent if s["name"] == "GET /orders/42")
    child = next(s for s in client.sent if s["name"] == "fetch_order")

    assert child["parent_span_id"] == root["span_id"], "child must nest under root"
    assert root["metadata"]["status_code"] == 200
    assert root["status"] == "ok"
    print("[PASS] nested span on success: correct parent linkage, status_code captured")


def test_five_hundred_marks_error_without_raising():
    client = FakeClient()
    app = build_app(client)
    test_client = TestClient(app, raise_server_exceptions=False)

    response = test_client.get("/broken")
    assert response.status_code == 500

    root = next(s for s in client.sent if s["name"] == "GET /broken")
    assert root["metadata"]["status_code"] == 500
    assert root["status"] == "error", (
        f"expected status='error' for a 500 response returned WITHOUT raising, "
        f"got '{root['status']}' -- this is the overwrite bug the Tracer fix addresses"
    )
    print("[PASS] 500 response (no exception) correctly marked status=error -- override fix works")


def test_thrown_exception_marks_error():
    """Unhandled exception, no registered handler -- propagates through
    the middleware as a real exception, exercising aspan's except-branch
    rather than the manual status-override branch above."""
    client = FakeClient()
    app = build_app(client)
    test_client = TestClient(app, raise_server_exceptions=False)

    response = test_client.get("/throws")
    assert response.status_code == 500

    root = next(s for s in client.sent if s["name"] == "GET /throws")
    assert root["status"] == "error"
    assert "unexpected failure" in root["metadata"]["error"]
    print("[PASS] thrown exception correctly marked status=error via aspan's exception handling")


def main():
    test_nested_span_on_success()
    test_five_hundred_marks_error_without_raising()
    test_thrown_exception_marks_error()
    print("\nAll FastAPI adapter checks passed.")


if __name__ == "__main__":
    main()