from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, SignupPasscode, BananaRate, BananaRateHistory, Customer, Invoice, WeightEntry, Payment, VehicleTransport

class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Profile Info', {
            'fields': ('role', 'district', 'phone', 'business_name', 'native_place', 'signature', 'is_approved'),
        }),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Profile Info', {
            'fields': ('role', 'district', 'phone', 'business_name', 'native_place', 'is_approved'),
        }),
    )
    list_display = ('username', 'email', 'role', 'district', 'is_approved', 'is_staff')
    list_filter = ('role', 'district', 'is_approved', 'is_staff')
    search_fields = ('username', 'email', 'name', 'district')

admin.site.register(User, CustomUserAdmin)
admin.site.register(SignupPasscode)
admin.site.register(BananaRate)
admin.site.register(BananaRateHistory)
admin.site.register(Customer)
admin.site.register(Invoice)
admin.site.register(WeightEntry)
admin.site.register(Payment)
admin.site.register(VehicleTransport)
