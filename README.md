<div align="center">

# TraceWell

**Multi-Framework Backend Execution Tracer**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Django](https://img.shields.io/badge/Django-Channels-092E20?style=flat-square&logo=django&logoColor=white)](https://djangoproject.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)

TraceWell makes the hidden internal execution of an API request visible - authentication, validation, business logic, and every database query - as a real-time, structured trace, across multiple backend frameworks and languages.

</div>

---

## 📌 Overview

Most tools show you a request and its response. TraceWell shows you everything that happened in between.

When `POST /orders/` returns a response, a lot happened invisibly on the way there - an auth check, a validation step, a couple of database queries. TraceWell captures that sequence as a tree of **spans**: named operations with real durations, status, and metadata, automatically nested to reflect what actually executed. An instrumented app streams these spans to a central collector over WebSocket; a React dashboard renders them as a flowchart, a timeline, or a raw technical tree, and surfaces per-endpoint statistics with anomaly flagging.

It works the same way across three frameworks and two languages - a request traced in a FastAPI service and one traced in an Express service produce structurally identical output.

---

## ✨ Features

- 🌲 **Automatic root-span + DB-query capture** - registered once per app, zero per-endpoint boilerplate
- 🧩 **Manual business-logic spans** - name the steps that actually matter (`check_access`, `verify_passenger`, `eligibility_check`)
- 🔀 **Three frameworks, one schema** - FastAPI, Django, and Express all emit the same span shape to the same collector
- 🗄️ **Dual database support** - PostgreSQL (via SQLAlchemy events / Django's `execute_wrapper`) and MongoDB (via driver command monitoring, values never logged)
- 🔌 **Real-time collaboration tracing** - proven across Django Channels consumers and `sync_to_async` thread boundaries, not just plain HTTP
- 📊 **Per-endpoint statistics** - request counts, average/min/max duration, error rate, grouped by route pattern
- 🚨 **Anomaly flagging** - statistical thresholding (mean + 2 standard deviations) against live historical data, not a fixed guess
- 🧵 **Verified concurrency safety** - `contextvars` (Python) and `AsyncLocalStorage` (Node) proven correct under genuinely concurrent load, not assumed
- 🖥️ **Three trace views** - plain-language flowchart, proportional timeline, and a technical tree for raw inspection
- ✅ **CI-tested** - every core guarantee runs automatically on push against a real PostgreSQL service container

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│          Instrumented apps (FastAPI · Django · Express)          │
│                                                                  │
│ tracewell_agent (Python) / tracewell_agent_node (JS)             │
│ — root span per request                                          │
│ — manual spans for business logic                                │
│ — automatic spans for every DB query                             │
└────────────────────────────┬─────────────────────────────────────┘
                             │ WebSocket (ws://.../ws/ingest/)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                 Collector — Django + DRF + Channels              │
│           stores spans · exposes REST API · computes stats       │
└──────────┬─────────────────────────┬────────────────────────────┘
           │                         │
           ▼                         ▼
┌────────────────────┐ ┌───────────────────────────────┐
│     PostgreSQL     │ │     React (Vite) Dashboard    │
│    Spans · Apps    │ │     Flowchart · Timeline ·    │
└────────────────────┘ │     Technical tree · Stats    │
                       └───────────────────────────────┘
```


Each instrumented app runs an agent that streams spans to the collector. The dashboard reconstructs the trace tree client-side from each span's `parent_span_id` - the collector never builds the tree itself, it just stores and serves flat records.

---

## 🛠️ Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Python agent** | `contextvars` | Concurrency-safe "current span" tracking across async requests |
| | FastAPI / Django adapters | Middleware wrapping every request in a root span |
| | SQLAlchemy events / `execute_wrapper` | Automatic PostgreSQL query capture |
| **Node agent** | `AsyncLocalStorage` | Node's equivalent concurrency-safety mechanism |
| | Express adapter | Same root-span + child-span model as the Python side |
| | MongoDB driver command monitoring | Automatic query capture - collection + field keys only, never values |
| **Collector** | Django REST Framework | REST API for traces, apps, and stats |
| | Django Channels | WebSocket ingestion from every connected agent |
| | PostgreSQL | Span storage |
| **Frontend** | React 18 + Vite | Dashboard SPA |
| | Recharts-free custom timeline | Proportional duration bars, built from raw span data |

---

## 🔬 How a Trace Is Built

Every span - manual or automatic - carries the same shape, regardless of language:

```json
{
  "span_id": "af66bf29bac04b649bdd51dcdd004b81",
  "trace_id": "d4a8920f1f7e4d558508dae39a4e02db",
  "parent_span_id": "d4a8920f1f7e4d558508dae39a4e02db",
  "name": "verify_flight",
  "app_name": "sky-connect",
  "duration_ms": 3.0,
  "status": "ok",
  "metadata": { "found": true, "flightId": "6a96d71aeb745ebc64b401e6" }
}
```

The dashboard uses `parent_span_id` alone to reconstruct the full tree - no framework needs to know about any other framework's internals for this to work.

### Manual + automatic spans, nested together

```
POST /api/bookings 25.0 ms
├─ verify_passenger 5.0 ms
│ └─ db_query (find) 2.0 ms ← automatic, MongoDB
├─ verify_flight 3.0 ms
│ └─ db_query (find) 1.0 ms ← automatic, MongoDB
└─ create_booking 15.0 ms
  └─ db_query (insert) 1.0 ms ← automatic, MongoDB
```


`verify_passenger`, `verify_flight`, and `create_booking` are manually named business steps. Every `db_query` underneath them was captured automatically, with zero code written at the call site - the manual span just needed to be open when the query fired.

---

## 📁 Project Structure

```
TraceWell/
├── .github/workflows/                          # CI — runs all test suites on every push
├── collector/                                  # Django + DRF + Channels
│ └── traces/
│ ├── management/commands/cleanup_traces.py     # retention command
│ ├── consumers.py                              # WebSocket ingestion
│ └── views.py                                  # REST API, stats, anomaly baseline
├── frontend/                                   # React + Vite dashboard
├── sample_apps/                                # Synthetic FastAPI / Django / Express apps
│ ├── fastapi_app/
│ ├── django_app/
│ └── express_app/
├── test_scripts/
│ └── simulate_agent.py                         # Standalone WS client for collector-only testing
├── tests/                                      # Python core & adapter tests
│ ├── smoke_test.py
│ ├── fastapi_adapter_test.py
│ └── django_adapter_test.py
├── tracewell_agent/                            # Python agent — FastAPI + Django adapters
│ ├── core/                                     # Span, Tracer (contextvars-based)
│ └── adapters/
├── tracewell_agent_node/                       # Node.js agent — Express adapter
│ ├── src/
│ │ ├── core/                                   # Span, Tracer (AsyncLocalStorage-based)
│ │ ├── adapters/express.js
│ │ └── db/mongoCapture.js
│ └── tests/
├── docs/
│ └── integrations.md                           # Real-project integrations, what's instrumented
└── pyproject.toml
```


---

## ⚙️ Installation & Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL

### 1. Clone the repository

```bash
git clone https://github.com/tarun290705/TraceWell.git
cd TraceWell
```

### 2. Collector

```bash
cd collector
python -m venv venv
venv\Scripts\Activate        # Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
daphne -p 8000 config.asgi:application
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **[http://localhost:5174](http://localhost:5174)**.

### 4. Instrument a backend app

**FastAPI:**
```python
from tracewell_agent import create_tracer
from tracewell_agent.config import TracewellConfig
from tracewell_agent.adapters.fastapi_adapter import TracewellMiddleware

tracer = create_tracer(TracewellConfig(app_name="my-app", framework="fastapi"))
app.add_middleware(TracewellMiddleware, tracer=tracer)
```

**Express:**
```javascript
const { createTracer } = require('tracewell_agent_node');
const { tracewellMiddleware } = require('tracewell_agent_node/src/adapters/express.js');

const tracer = createTracer({ appName: 'my-app', framework: 'express' });
app.use(tracewellMiddleware(tracer));
```

See `tracewell_agent_node/README.md` for the Node package in full, and `docs/integrations.md` for how this was applied to three real, independent projects.

---

## 🧪 Testing

```bash
python tests/smoke_test.py                          # Python core — concurrency safety, nesting
python tests/fastapi_adapter_test.py                # FastAPI middleware
python tests/django_adapter_test.py                 # Django middleware
cd collector && python manage.py test traces        # Dedup, stats grouping, anomaly baseline
cd tracewell_agent_node && npm test                 # Node core, WS client, Express adapter, Mongo capture
```

All of the above run automatically on every push via GitHub Actions, with the collector suite running against a real PostgreSQL service container - not mocked.

---

## 🧠 Design Notes

- **Automatic vs. manual is a hard boundary, not a limitation to fix.** Root spans and DB queries are automatic because they hook framework/driver internals every request passes through. Naming a business step (`check_access`, `verify_passenger`) requires knowing what the code *means* - no static analysis or bytecode inspection can infer that, in any tracing tool, ever.
- **Concurrency safety is proven, not assumed.** Both `contextvars` and `AsyncLocalStorage` are tested against genuinely concurrent operations in the respective test suites - a naive global-variable approach was deliberately reproduced and shown to fail first, so the fix is demonstrably necessary, not cargo-culted.
- **MongoDB capture never logs field values, only keys.** Unlike SQL, where statement text and bound values are separate, a MongoDB command contains real data directly - logging it raw would risk leaking sensitive values into trace metadata.
- **Live WebSocket push to the dashboard was attempted and dropped.** Cross-consumer delivery proved unreliable in this environment across two different Redis backends (Dockerized and native). Rather than continue chasing an environment-specific issue, the dashboard uses 3-second REST polling - reliable, if not instantaneous. Documented trade-off, not a silent gap.
- **No authentication on the collector.** A local development tool; anyone reaching its port can read trace data. Out of scope by design, stated explicitly rather than left implicit.

---

## 📚 Further Reading

- [`docs/integrations.md`](docs/integrations.md) - how TraceWell was integrated into three real, independent projects (Reliable Job Queue, CoWrite, SkyConnect), including a re-verified concurrency guarantee and re-verified security fixes after instrumentation
- [`tracewell_agent_node/README.md`](tracewell_agent_node/README.md) - the Node.js agent package on its own
