from rest_framework import serializers
from django.db import transaction
from django.contrib.auth import get_user_model
from .models import SignupPasscode, BananaRate, BananaRateHistory, Customer, Invoice, WeightEntry, Payment, VehicleTransport

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'name', 'phone', 'role', 'district', 
                  'business_name', 'native_place', 'signature', 'is_approved', 'password', 'pin')
        read_only_fields = ('id', 'is_approved')

    def validate_pin(self, value):
        if value and (not value.isdigit() or len(value) != 4):
            raise serializers.ValidationError("PIN must be exactly a 4-digit number.")
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        
        # Prevent editing district once approved
        if instance.is_approved and 'district' in validated_data and validated_data['district'] != instance.district:
            raise serializers.ValidationError({"district": "District cannot be modified once approved."})
            
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

class SignupSerializer(serializers.ModelSerializer):
    passcode = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Password must contain at least one digit.")
        if not any(char.isalpha() for char in value):
            raise serializers.ValidationError("Password must contain at least one letter.")
        return value

    class Meta:
        model = User
        fields = (
            'username',
            'email',
            'password',
            'confirm_password',
            'name',
            'phone',
            'district',
            'passcode'
        )

    def validate(self, attrs):

        # Password match validation
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                "password": "Passwords do not match"
            })

        # Passcode validation
        try:
            passcode_obj = SignupPasscode.objects.get(
                passcode=attrs['passcode'],
                is_active=True
            )

        except SignupPasscode.DoesNotExist:
            raise serializers.ValidationError({
                "passcode": "Invalid or inactive signup passcode"
            })

        # Enforce district validation matching creator and registrant
        creator_district = passcode_obj.created_by.district.strip().lower() if passcode_obj.created_by.district else ""
        registrant_district = attrs['district'].strip().lower() if attrs.get('district') else ""
        
        if creator_district != registrant_district:
            raise serializers.ValidationError({
                "passcode": f"This passcode is not valid for district '{attrs.get('district') or ''}'."
            })

        return attrs

    def create(self, validated_data):

        validated_data.pop('confirm_password')
        validated_data.pop('passcode')

        password = validated_data.pop('password')

        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            name=validated_data.get('name', ''),
            phone=validated_data.get('phone', ''),
            district=validated_data.get('district', ''),
            role='owner',
            is_approved=False
        )

        user.set_password(password)
        user.save()

        return user

class SignupPasscodeSerializer(serializers.ModelSerializer):
    created_by_name = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = SignupPasscode
        fields = '__all__'
        read_only_fields = ('created_by',)

class BananaRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BananaRate
        fields = '__all__'

class BananaRateHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BananaRateHistory
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'

class WeightEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = WeightEntry
        fields = ('id', 'serial_no', 'banana_type', 'rate', 'piece_count', 'weight')

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ('id', 'payment_mode', 'paid_amount', 'balance_amount', 'status', 'created_at')

class InvoiceSerializer(serializers.ModelSerializer):
    customer_details = CustomerSerializer(source='customer', read_only=True)
    owner_details = UserSerializer(source='owner', read_only=True)
    weight_entries = WeightEntrySerializer(many=True)
    payments = PaymentSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = (
            'id', 'invoice_no', 'customer', 'customer_details', 'owner', 'owner_details',
            'total_pieces', 'gross_weight', 'removable_weight_per_piece', 
            'total_removable_weight', 'net_weight', 'rate', 'final_amount', 
            'payment_status', 'date', 'time', 'weight_entries', 'payments'
        )
        read_only_fields = ('invoice_no', 'owner')

    def create(self, validated_data):
        weight_entries_data = validated_data.pop('weight_entries')
        payments_data = validated_data.pop('payments', [])
        
        request = self.context.get('request')
        owner = request.user if request else None
        
        with transaction.atomic():
            # Generate invoice number: INV-YYYY-00001
            import datetime
            year = datetime.datetime.now().year
            count = Invoice.objects.filter(invoice_no__startswith=f"INV-{year}-").count() + 1
            invoice_no = f"INV-{year}-{count:05d}"
            
            invoice = Invoice.objects.create(
                invoice_no=invoice_no,
                owner=owner,
                **validated_data
            )
            
            # Save weight entries
            for entry_data in weight_entries_data:
                WeightEntry.objects.create(invoice=invoice, **entry_data)
                
            # Save payments
            for payment_data in payments_data:
                Payment.objects.create(invoice=invoice, **payment_data)
                
            return invoice

class VehicleTransportSerializer(serializers.ModelSerializer):
    owner_name = serializers.ReadOnlyField(source='owner.username')

    class Meta:
        model = VehicleTransport
        fields = '__all__'
        read_only_fields = ('id', 'owner', 'date', 'time')
