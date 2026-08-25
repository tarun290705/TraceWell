import time
import uuid
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from tracewell_agent import create_tracer
from tracewell_agent.adapters.fastapi_adapter import TracewellMiddleware
from tracewell_agent.config import TracewellConfig

app = FastAPI()

tracer = create_tracer(TracewellConfig(app_name='sample-fastapi-app', framework='fastapi'))
app.state.tracewell_tracer = tracer
app.add_middleware(TracewellMiddleware, tracer=tracer)

_orders_db = {}

class OrderIn(BaseModel):
    item: str
    quantity: int


@app.post("/orders/")
async def create_order(order: OrderIn, request: Request):
    tracer = request.app.state.tracewell_tracer

    async with tracer.aspan("authentication"):
        await _fake_io(0.005) 

    async with tracer.aspan("validation", metadata={"item": order.item}):
        if order.quantity <= 0:
            raise HTTPException(status_code=400, detail="quantity must be positive")

    async with tracer.aspan("business_logic"):
        order_id = str(uuid.uuid4())[:8]
        await _fake_io(0.01)

    async with tracer.aspan("db_insert", metadata={"order_id": order_id}) as span:
        _orders_db[order_id] = {"item": order.item, "quantity": order.quantity}
        await _fake_io(0.02)
        span.metadata["rows_affected"] = 1

    return {"order_id": order_id, "status": "created"}


@app.get("/orders/{order_id}")
async def get_order(order_id: str):
    if order_id not in _orders_db:
        raise HTTPException(status_code=404, detail="order not found")
    return _orders_db[order_id]


async def _fake_io(seconds: float):
    import asyncio
    await asyncio.sleep(seconds)