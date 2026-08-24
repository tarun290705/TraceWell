from django.urls import path
from .views import list_traces, trace_detail, list_connected_apps

urlpatterns = [
    path('traces/', list_traces),
    path('traces/<str: trace_id>/', trace_detail),
    path('apps/', list_connected_apps),
]