from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'District Banana Head'),
        ('owner', 'Billing Owner/User'),
    )
    
    name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='owner')
    district = models.CharField(max_length=100, blank=True)
    business_name = models.CharField(max_length=255, blank=True, null=True)
    native_place = models.CharField(max_length=255, blank=True, null=True)
    signature = models.TextField(blank=True, null=True) # Can store base64 string or image url
    is_approved = models.BooleanField(default=False)
    
    # We want users to log in using email or username, so we make sure email is not empty.
    REQUIRED_FIELDS = ['email']

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

class SignupPasscode(models.Model):
    passcode = models.CharField(max_length=50, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_passcodes')

    def __str__(self):
        return self.passcode

class BananaRate(models.Model):
    banana_type = models.CharField(max_length=100, unique=True)
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.banana_type} - ₹{self.rate}/kg"

class BananaRateHistory(models.Model):
    banana_type = models.CharField(max_length=100)
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    changed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.banana_type} history: ₹{self.rate} on {self.changed_at}"

class Customer(models.Model):
    name = models.CharField(max_length=255)
    place = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    banana_type = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.place})"

class Invoice(models.Model):
    STATUS_CHOICES = (
        ('settled', 'Settled'),
        ('partially_settled', 'Partially Settled'),
        ('not_settled', 'Not Settled'),
    )

    invoice_no = models.CharField(max_length=50, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='invoices')
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invoices')
    
    total_pieces = models.IntegerField()
    gross_weight = models.DecimalField(max_digits=12, decimal_places=2)
    removable_weight_per_piece = models.DecimalField(max_digits=10, decimal_places=3)
    total_removable_weight = models.DecimalField(max_digits=12, decimal_places=2)
    net_weight = models.DecimalField(max_digits=12, decimal_places=2)
    rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    final_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_settled')
    
    date = models.DateField(auto_now_add=True)
    time = models.TimeField(auto_now_add=True)

    def __str__(self):
        return self.invoice_no

class WeightEntry(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='weight_entries')
    serial_no = models.IntegerField()
    banana_type = models.CharField(max_length=100, blank=True, null=True)
    rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    piece_count = models.IntegerField()
    weight = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.invoice.invoice_no} - Row {self.serial_no} ({self.banana_type})"

class Payment(models.Model):
    STATUS_CHOICES = (
        ('settled', 'Settled'),
        ('partially_settled', 'Partially Settled'),
        ('not_settled', 'Not Settled'),
    )
    PAYMENT_MODE_CHOICES = (
        ('cash', 'Cash'),
        ('upi', 'UPI'),
        ('bank_transfer', 'Bank Transfer'),
    )

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    payment_mode = models.CharField(max_length=20, choices=PAYMENT_MODE_CHOICES)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2)
    balance_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_settled')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment for {self.invoice.invoice_no}: Paid ₹{self.paid_amount}"

class VehicleTransport(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vehicle_transports')
    vehicle_no = models.CharField(max_length=50)
    vehicle_type = models.CharField(max_length=100)
    driver_name = models.CharField(max_length=255)
    driver_phone = models.CharField(max_length=20)
    total_gross_weight = models.DecimalField(max_digits=12, decimal_places=2)
    total_net_weight = models.DecimalField(max_digits=12, decimal_places=2)
    total_pieces = models.IntegerField()
    bananas = models.TextField() # Stored as comma-separated values (e.g. Poovan, Nendran)
    date = models.DateField(auto_now_add=True)
    time = models.TimeField(auto_now_add=True)

    def __str__(self):
        return f"Vehicle {self.vehicle_no} loaded with {self.bananas} on {self.date}"
