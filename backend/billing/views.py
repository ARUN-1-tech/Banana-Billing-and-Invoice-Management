import datetime
from django.db.models import Sum, Count
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model, authenticate
from rest_framework.exceptions import AuthenticationFailed

from .models import SignupPasscode, BananaRate, BananaRateHistory, Customer, Invoice, WeightEntry, Payment, VehicleTransport
from .serializers import (
    UserSerializer, SignupSerializer, SignupPasscodeSerializer,
    BananaRateSerializer, BananaRateHistorySerializer, CustomerSerializer,
    InvoiceSerializer, PaymentSerializer, VehicleTransportSerializer
)

User = get_user_model()

# Custom JWT Authentication View
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_or_email = attrs.get("username")
        password = attrs.get("password")
        
        user = None
        if "@" in username_or_email:
            try:
                user_obj = User.objects.get(email=username_or_email)
                username_or_email = user_obj.username
            except User.DoesNotExist:
                pass
                
        user = authenticate(username=username_or_email, password=password)
        
        if not user:
            raise AuthenticationFailed("No active account found with the given credentials")
            
        if not user.is_approved and not user.is_superuser:
            raise AuthenticationFailed("Your account is pending registration approval by the District Banana Head.")
        
        attrs['username'] = user.username
        data = super().validate(attrs)
        
        data['user'] = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'name': user.name,
            'role': user.role,
            'district': user.district,
            'business_name': user.business_name,
            'native_place': user.native_place,
            'signature': user.signature,
            'pin': user.pin,
        }
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


# Signup View (Public)
class SignupView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = SignupSerializer
    permission_classes = [permissions.AllowAny]


# Profile View/Update
class ProfileView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user


# Admin permissions check helper
class IsDistrictBananaHead(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


# Signup Passcodes ViewSet (Admin Only)
class SignupPasscodeViewSet(viewsets.ModelViewSet):
    serializer_class = SignupPasscodeSerializer
    permission_classes = [IsDistrictBananaHead]

    def get_queryset(self):
        return SignupPasscode.objects.filter(created_by__district=self.request.user.district).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# User Approvals ViewSet (Admin Only)
class UserApprovalViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsDistrictBananaHead]

    def get_queryset(self):
        return User.objects.filter(role='owner', district=self.request.user.district).order_by('-date_joined')

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        user = self.get_object()
        user.is_approved = True
        user.save()
        return Response({'status': f'User {user.username} approved successfully'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        user = self.get_object()
        user.delete()
        return Response({'status': 'User registration rejected and deleted'})


# Banana Rate ViewSet
class BananaRateViewSet(viewsets.ModelViewSet):
    queryset = BananaRate.objects.all().order_by('banana_type')
    serializer_class = BananaRateSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsDistrictBananaHead()]

    def perform_create(self, serializer):
        with transaction.atomic():
            rate_obj = serializer.save()
            BananaRateHistory.objects.create(
                banana_type=rate_obj.banana_type,
                rate=rate_obj.rate
            )

    def perform_update(self, serializer):
        with transaction.atomic():
            rate_obj = serializer.save()
            BananaRateHistory.objects.create(
                banana_type=rate_obj.banana_type,
                rate=rate_obj.rate
            )

    @action(detail=False, methods=['get'])
    def history(self, request):
        banana_type = request.query_params.get('banana_type')
        history_qs = BananaRateHistory.objects.all().order_by('-changed_at')
        if banana_type:
            history_qs = history_qs.filter(banana_type=banana_type)
        serializer = BananaRateHistorySerializer(history_qs[:50], many=True)
        return Response(serializer.data)


# Customer ViewSet
class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('name')
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]


# Invoice ViewSet
class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Admin has no billing history and cannot view owners' invoices
        if user.role == 'admin':
            return Invoice.objects.none()
            
        queryset = Invoice.objects.filter(owner=user).order_by('-date', '-time')

        # Apply Filters
        date_str = self.request.query_params.get('date')
        customer_name = self.request.query_params.get('customer')
        banana_type = self.request.query_params.get('banana_type')
        invoice_no = self.request.query_params.get('invoice_no')
        payment_status = self.request.query_params.get('payment_status')

        if date_str:
            queryset = queryset.filter(date=date_str)
        if customer_name:
            queryset = queryset.filter(customer__name__icontains=customer_name)
        if banana_type:
            queryset = queryset.filter(customer__banana_type__icontains=banana_type)
        if invoice_no:
            queryset = queryset.filter(invoice_no__icontains=invoice_no)
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)

        return queryset

    @action(detail=True, methods=['post'])
    def update_payment(self, request, pk=None):
        invoice = self.get_object()
        paid_amount = request.data.get('paid_amount')
        payment_mode = request.data.get('payment_mode')
        
        if paid_amount is None or payment_mode is None:
            return Response({'error': 'paid_amount and payment_mode are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            paid_amount = float(paid_amount)
        except ValueError:
            return Response({'error': 'paid_amount must be a number'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Get latest payment ledger balance or compute from scratch
            total_paid = sum(float(p.paid_amount) for p in invoice.payments.all()) + paid_amount
            final_amount = float(invoice.final_amount)
            balance = final_amount - total_paid

            if balance <= 0:
                payment_status = 'settled'
                balance = 0
            elif total_paid > 0:
                payment_status = 'partially_settled'
            else:
                payment_status = 'not_settled'

            invoice.payment_status = payment_status
            invoice.save()

            # Create payment ledger entry
            Payment.objects.create(
                invoice=invoice,
                payment_mode=payment_mode,
                paid_amount=paid_amount,
                balance_amount=balance,
                status=payment_status
            )
            
        serializer = InvoiceSerializer(invoice)
        return Response(serializer.data)


# Reports API View
class ReportsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        if user.role == 'admin':
            approved = User.objects.filter(role='owner', is_approved=True, district=user.district).count()
            pending = User.objects.filter(role='owner', is_approved=False, district=user.district).count()
            active_codes = SignupPasscode.objects.filter(is_active=True, created_by__district=user.district).count()
            total_codes = SignupPasscode.objects.filter(created_by__district=user.district).count()
            
            return Response({
                'is_admin': True,
                'district': user.district,
                'stats': {
                    'approved_owners': approved,
                    'pending_owners': pending,
                    'active_passcodes': active_codes,
                    'total_passcodes': total_codes
                }
            })

        is_admin = False
        today = timezone.localdate()
        start_of_week = today - datetime.timedelta(days=today.weekday())
        start_of_month = today.replace(day=1)

        # Base queries based on permissions (only Billing Owners reach here)
        invoices_today = Invoice.objects.filter(owner=user, date=today)
        invoices_week = Invoice.objects.filter(owner=user, date__gte=start_of_week)
        invoices_month = Invoice.objects.filter(owner=user, date__gte=start_of_month)

        # Helper method for consistent daily/weekly/monthly metrics returns
        def get_invoice_metrics(invoices):
            count = invoices.count()
            gross = invoices.aggregate(sum=Sum('gross_weight'))['sum'] or 0.0
            net = invoices.aggregate(sum=Sum('net_weight'))['sum'] or 0.0
            amount = invoices.aggregate(sum=Sum('final_amount'))['sum'] or 0.0
            total_paid = Payment.objects.filter(invoice__in=invoices).aggregate(sum=Sum('paid_amount'))['sum'] or 0.0
            pending = max(0.0, float(amount) - float(total_paid))
            return {
                'bills': count,
                'gross_weight': float(gross),
                'net_weight': float(net),
                'amount': float(amount),
                'pending': float(pending)
            }

        daily_metrics = get_invoice_metrics(invoices_today)
        weekly_metrics = get_invoice_metrics(invoices_week)
        monthly_metrics = get_invoice_metrics(invoices_month)

        # Top banana type this week
        top_banana_type_week = (
            invoices_week.values('customer__banana_type')
            .annotate(count=Count('id'))
            .order_by('-count')
            .first()
        )
        top_banana_type = top_banana_type_week['customer__banana_type'] if top_banana_type_week else "None"

        # Unique customers served this month
        monthly_customers = invoices_month.values('customer').distinct().count()

        # Let's prepare a chart data dictionary for weekly trend
        weekly_chart = []
        for i in range(7):
            day = today - datetime.timedelta(days=i)
            day_payments = Payment.objects.filter(invoice__owner=user, created_at__date=day)
            day_invoices = invoices_week.filter(date=day)
            weekly_chart.append({
                'day': day.strftime('%a'),
                'revenue': float(day_payments.aggregate(sum=Sum('paid_amount'))['sum'] or 0.0),
                'weight': float(day_invoices.aggregate(sum=Sum('net_weight'))['sum'] or 0.0)
            })
        weekly_chart.reverse()

        # Let's prepare a monthly trend dictionary for 6 months
        monthly_chart = []
        for i in range(6):
            # Calculate months back
            month_date = today - datetime.timedelta(days=i*30)
            m_start = month_date.replace(day=1)
            # Find invoices / payments for this month
            m_payments = Payment.objects.filter(invoice__owner=user, created_at__date__gte=m_start, created_at__date__lt=m_start + datetime.timedelta(days=32))
            m_invoices = Invoice.objects.filter(owner=user, date__gte=m_start, date__lt=m_start + datetime.timedelta(days=32))

            monthly_chart.append({
                'month': m_start.strftime('%b %Y'),
                'revenue': float(m_payments.aggregate(sum=Sum('paid_amount'))['sum'] or 0.0),
                'bills': m_invoices.count(),
                'customers': m_invoices.values('customer').distinct().count()
            })
        monthly_chart.reverse()

        return Response({
            'daily': daily_metrics,
            'weekly': {
                **weekly_metrics,
                'top_banana_type': top_banana_type,
                'chart_data': weekly_chart,
            },
            'monthly': {
                **monthly_metrics,
                'customers': monthly_customers,
                'chart_data': monthly_chart,
            }
        })

class VehicleTransportViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleTransportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return VehicleTransport.objects.none()
        return VehicleTransport.objects.filter(owner=user).order_by('-date', '-time')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=['get'])
    def pending_cargo(self, request):
        user = request.user
        if user.role == 'admin':
            return Response({
                'pieces': 0,
                'gross_weight': 0.0,
                'net_weight': 0.0,
                'bananas': []
            })
            
        last_dispatch = VehicleTransport.objects.filter(owner=user).order_by('-date', '-time').first()
        invoices = Invoice.objects.filter(owner=user)
        
        if last_dispatch:
            from django.db.models import Q
            invoices = invoices.filter(
                Q(date__gt=last_dispatch.date) |
                Q(date=last_dispatch.date, time__gt=last_dispatch.time)
            )
            
        totals = invoices.aggregate(
            sum_pieces=Sum('total_pieces'),
            sum_gross=Sum('gross_weight'),
            sum_net=Sum('net_weight')
        )
        
        pieces = totals['sum_pieces'] or 0
        gross_weight = float(totals['sum_gross'] or 0.0)
        net_weight = float(totals['sum_net'] or 0.0)
        
        banana_types = list(
            WeightEntry.objects.filter(invoice__in=invoices)
            .values_list('banana_type', flat=True)
            .distinct()
        )
        banana_types = [b for b in banana_types if b]
        
        return Response({
            'pieces': pieces,
            'gross_weight': gross_weight,
            'net_weight': net_weight,
            'bananas': banana_types
        })
