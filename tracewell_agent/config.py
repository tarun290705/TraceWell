from dataclasses import dataclass

@dataclass
class TracewellConfig:
    app_name: str
    framework: str
    collector_ws_url: str = 'ws://localhost:8000/ws/ingest/'
    enabled: bool = True
    