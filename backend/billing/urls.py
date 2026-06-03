from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SignupView, CustomTokenObtainPairView, ProfileView, ReportsView,
    SignupPasscodeViewSet, UserApprovalViewSet, BananaRateViewSet,
    CustomerViewSet, InvoiceViewSet, VehicleTransportViewSet
)

router = DefaultRouter()
router.register(r'admin/passcodes', SignupPasscodeViewSet, basename='admin-passcodes')
router.register(r'admin/users', UserApprovalViewSet, basename='admin-users')
router.register(r'rates', BananaRateViewSet, basename='rates')
router.register(r'customers', CustomerViewSet, basename='customers')
router.register(r'invoices', InvoiceViewSet, basename='invoices')
router.register(r'vehicles', VehicleTransportViewSet, basename='vehicles')

urlpatterns = [
    # Router endpoints
    path('', include(router.urls)),
    
    # Custom endpoints
    path('auth/signup/', SignupView.as_view(), name='signup'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('auth/profile/', ProfileView.as_view(), name='profile'),
    path('reports/', ReportsView.as_view(), name='reports'),
]
