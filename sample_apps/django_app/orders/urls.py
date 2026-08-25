from django.urls import path
from .views import create_order, get_order

urlpatterns = [
    path('orders/', create_order),
    path('orders/<str:order_id>/', get_order),
]