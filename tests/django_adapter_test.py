import django
from django.conf import settings

if not settings.configured:
    settings.configure(
        DEBUG=True,
        DATABASES={"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}},
        ALLOWED_HOSTS=["*"],
        SECRET_KEY="test",
        DEFAULT_AUTO_FIELD="django.db.models.AutoField",
    )
    django.setup()

from django.http import HttpResponse
from django.test import RequestFactory

from tracewell_agent import Tracer
from tracewell_agent.adapters.django_adapter import TracewellMiddleware


class FakeClient:
    def __init__(self):
        self.sent = []

    def send(self, span_dict):
        self.sent.append(span_dict)


def make_middleware(get_response, tracer):
    # Bypass __init__ deliberately -- it builds a REAL tracer via
    # create_tracer()/SpanClient, which would try to open a WebSocket
    # connection. Injecting a fake-client Tracer directly keeps this
    # test fully offline, same as the FastAPI test does via add_middleware.
    middleware = TracewellMiddleware.__new__(TracewellMiddleware)
    middleware.get_response = get_response
    middleware.tracer = tracer
    return middleware


def test_root_span_on_success():
    client = FakeClient()
    tracer = Tracer(client)
    middleware = make_middleware(lambda request: HttpResponse(status=200), tracer)

    request = RequestFactory().get("/notes/2/")
    middleware(request)

    root = client.sent[0]
    assert root["name"] == "GET /notes/2/"
    assert root["parent_span_id"] is None
    assert root["metadata"]["status_code"] == 200
    assert root["status"] == "ok"
    print("[PASS] root span created correctly for a successful request")


def test_five_hundred_marks_error_without_raising():
    client = FakeClient()
    tracer = Tracer(client)
    middleware = make_middleware(lambda request: HttpResponse(status=500), tracer)

    request = RequestFactory().get("/broken/")
    middleware(request)

    root = client.sent[0]
    assert root["metadata"]["status_code"] == 500
    assert root["status"] == "error", (
        f"expected status='error' for a 500 response returned WITHOUT raising, got '{root['status']}'"
    )
    print("[PASS] 500 response (no exception) correctly marked status=error")


def test_thrown_exception_marks_error():
    def raises(request):
        raise ValueError("unexpected failure")

    client = FakeClient()
    tracer = Tracer(client)
    middleware = make_middleware(raises, tracer)

    request = RequestFactory().get("/throws/")
    try:
        middleware(request)
    except ValueError:
        pass  # expected -- middleware re-raises after marking the span

    root = client.sent[0]
    assert root["status"] == "error"
    assert "unexpected failure" in root["metadata"]["error"]
    print("[PASS] thrown exception correctly marked status=error")


def main():
    test_root_span_on_success()
    test_five_hundred_marks_error_without_raising()
    test_thrown_exception_marks_error()
    print("\nAll Django adapter checks passed.")


if __name__ == "__main__":
    main()