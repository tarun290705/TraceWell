from django.test import TestCase

from .models import Span
from .views import _endpoint_baselines

class EndpointStatsGroupingTests(TestCase):
    def setUp(self):
        Span.objects.create(
            span_id="a1", trace_id="a1", parent_span_id=None,
            name="POST /orders/", app_name="sample-fastapi-app",
            start_time=1000.0, end_time=1000.05, duration_ms=50.0, status="ok",
        )
        Span.objects.create(
            span_id="a2", trace_id="a2", parent_span_id=None,
            name="POST /orders/", app_name="sample-django-app",
            start_time=1000.0, end_time=1000.03, duration_ms=30.0, status="ok",
        )

    def test_same_name_different_apps_are_not_merged(self):
        response = self.client.get("/api/stats/")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        fastapi_entry = next(r for r in data if r["app_name"] == "sample-fastapi-app")
        django_entry = next(r for r in data if r["app_name"] == "sample-django-app")

        self.assertEqual(fastapi_entry["count"], 1)
        self.assertEqual(django_entry["count"], 1)
        self.assertEqual(fastapi_entry["avg_duration_ms"], 50.0)
        self.assertEqual(django_entry["avg_duration_ms"], 30.0)


class TraceListDedupTests(TestCase):
    def setUp(self):
        Span.objects.create(
            span_id="root1", trace_id="trace1", parent_span_id=None,
            name="POST /orders/", app_name="test-app",
            start_time=2000.0, end_time=2000.05, duration_ms=50.0, status="ok",
        )
        Span.objects.create(
            span_id="child1", trace_id="trace1", parent_span_id="root1",
            name="authentication", app_name="test-app",
            start_time=2000.0, end_time=2000.01, duration_ms=10.0, status="ok",
        )
        Span.objects.create(
            span_id="child2", trace_id="trace1", parent_span_id="root1",
            name="db_insert", app_name="test-app",
            start_time=2000.02, end_time=2000.04, duration_ms=20.0, status="ok",
        )

    def test_trace_appears_exactly_once(self):
        response = self.client.get("/api/traces/")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        matching = [t for t in data if t["trace_id"] == "trace1"]
        self.assertEqual(
            len(matching), 1,
            "trace with multiple spans sharing a start_time must appear once, not duplicated"
        )


class AnomalyBaselineTests(TestCase):
    def test_no_baseline_with_fewer_than_two_samples(self):
        roots = [Span(app_name="app", name="GET /x", duration_ms=10.0, metadata={})]
        baselines = _endpoint_baselines(roots)
        self.assertEqual(baselines, {}, "a single sample must not produce a baseline (stdev undefined)")

    def test_baseline_computed_with_two_or_more_samples(self):
        roots = [
            Span(app_name="app", name="GET /x", duration_ms=10.0, metadata={}),
            Span(app_name="app", name="GET /x", duration_ms=12.0, metadata={}),
        ]
        baselines = _endpoint_baselines(roots)
        self.assertIn(("app", "GET /x"), baselines)
        mean, _stdev = baselines[("app", "GET /x")]
        self.assertAlmostEqual(mean, 11.0)