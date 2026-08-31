import asyncio
import json
import logging
import queue
import threading
from typing import Any, Dict
import websockets

logger = logging.getLogger('tracewell_agent')

HEARTBEAT_INTERVAL_SECONDS = 5.0

class SpanCLient:
    def __init__(
            self,
            collector_ws_url: str,
            app_name: str,
            framework: str,
            queue_maxsize: int = 1000,
            reconnect_delay_seconds: float = 3.0,
    ):
        self.collector_ws_url = collector_ws_url
        self.app_name = app_name
        self.framework = framework
        self.reconnect_delay_seconds = reconnect_delay_seconds

        self._queue: 'queue.Queue[Dict[str, Any]]' = queue.Queue(maxsize=queue_maxsize)
        self._stop_event = threading.Event()
        self._thread = threading.Thread(target=self._run_loop, daemon=True, name='tracewell-agent-io')
        self._started = False

    def start(self) -> None:
        if self._started:
            return
        self._started = True
        self._thread.start()
        logger.info('tracewell_agent: started (%s/%s) -> %s', self.app_name, self.framework, self.collector_ws_url)

    def stop(self, timeout: float = 2.0) -> None:
        self._stop_event.set()
        self._thread.join(timeout=timeout)

    def send(self, span_dict: Dict[str, Any]) -> None:
        try:
            self._queue.put_nowait(span_dict)
        except queue.Full:
            logger.warning('tracewell_agent: queue full, dropping span %s', span_dict.get('span_id'))
        except Exception:
            logger.exception('tracewell_agent: unexpected error enqueueing span')

    def _run_loop(self) -> None:
        try:
            asyncio.run(self._async_main())
        except Exception:
            logger.exception('tracewell_agent: background I/O loop crashed')

    async def _async_main(self) -> None:
        registration = {'type': 'register', 'app_name': self.app_name, 'framework': self.framework}
        while not self._stop_event.is_set():
            try:
                async with websockets.connect(self.collector_ws_url) as ws:
                    await ws.send(json.dumps(registration))
                    print(f"[TRACE] agent connected and registered: {self.app_name}")
                    logger.info('tracewell_agent: connected to collector')
                    await self._drain_queue(ws)
                    print(f"[TRACE] _drain_queue returned normally (loop exited without exception)")
            except Exception as exc:
                print(f"[TRACE] agent connection EXCEPTION: {exc!r}")
                logger.warning('tracewell_agent: connection failed (%s), retrying in %ss', exc, self.reconnect_delay_seconds)
                await asyncio.sleep(self.reconnect_delay_seconds)

    async def _drain_queue(self, ws) -> None:
        loop = asyncio.get_event_loop()
        last_heartbeat = loop.time()

        while not self._stop_event.is_set():
            try:
                span_dict = await loop.run_in_executor(None, self._queue.get, True, 1.0)
                await ws.send(json.dumps({'type': 'span', 'data': span_dict}))
            except queue.Empty:
                pass  

            now = loop.time()
            if now - last_heartbeat >= HEARTBEAT_INTERVAL_SECONDS:
                await ws.send(json.dumps({'type': 'heartbeat'}))
                last_heartbeat = now