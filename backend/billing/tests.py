from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal

from billing.models import SignupPasscode, BananaRate, Customer, Invoice, WeightEntry, Payment, VehicleTransport

User = get_user_model()

class BananaBillingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create Trichy Admin (District Head)
        self.trichy_admin = User.objects.create_superuser(
            username='trichy_admin',
            email='trichy_admin@banana.com',
            password='testpassword',
            role='admin',
            district='Trichy',
            is_approved=True
        )
        
        # Create Madurai Admin (District Head)
        self.madurai_admin = User.objects.create_superuser(
            username='madurai_admin',
            email='madurai_admin@banana.com',
            password='testpassword',
            role='admin',
            district='Madurai',
            is_approved=True
        )
        
        # Create passcodes for both admins
        self.trichy_passcode = SignupPasscode.objects.create(
            passcode='TRICHY99',
            is_active=True,
            created_by=self.trichy_admin
        )
        
        self.madurai_passcode = SignupPasscode.objects.create(
            passcode='MADURAI99',
            is_active=True,
            created_by=self.madurai_admin
        )

        self.rate_poovan = BananaRate.objects.create(banana_type='Poovan', rate=Decimal('35.00'))

    def test_signup_validation_district_matching(self):
        # 1. Signup with district 'Trichy' but passcode created by 'Madurai' admin -> Should fail
        signup_fail_data = {
            'username': 'owner_fail',
            'email': 'owner_fail@banana.com',
            'password': 'testpassword',
            'confirm_password': 'testpassword',
            'name': 'Trichy Trader Mismatch',
            'phone': '1234567890',
            'district': 'Trichy',
            'passcode': 'MADURAI99'  # Passcode belongs to Madurai admin
        }
        
        response = self.client.post('/api/auth/signup/', signup_fail_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("passcode", response.data)
        self.assertIn("not valid for district", response.data['passcode'][0])

        # 2. Signup with district 'Trichy' and passcode created by 'Trichy' admin -> Should succeed (Pending state)
        signup_success_data = {
            'username': 'trichy_owner',
            'email': 'trichy_owner@banana.com',
            'password': 'testpassword',
            'confirm_password': 'testpassword',
            'name': 'Trichy Owner',
            'phone': '9999999999',
            'district': 'Trichy',
            'passcode': 'TRICHY99'  # Matches Trichy admin district
        }
        
        response = self.client.post('/api/auth/signup/', signup_success_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        user = User.objects.get(username='trichy_owner')
        self.assertFalse(user.is_approved)

    def test_admin_approvals_district_filtered(self):
        # Create Trichy owner and Madurai owner
        trichy_owner = User.objects.create_user(
            username='trichy_owner',
            email='trichy_owner@banana.com',
            password='testpassword',
            role='owner',
            district='Trichy',
            is_approved=False
        )
        
        madurai_owner = User.objects.create_user(
            username='madurai_owner',
            email='madurai_owner@banana.com',
            password='testpassword',
            role='owner',
            district='Madurai',
            is_approved=False
        )

        # 1. Trichy Admin logs in
        self.client.force_authenticate(user=self.trichy_admin)
        response = self.client.get('/api/admin/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify Trichy admin ONLY sees the Trichy pending owner
        usernames = [u['username'] for u in response.data]
        self.assertIn('trichy_owner', usernames)
        self.assertNotIn('madurai_owner', usernames)

        # 2. Madurai Admin logs in
        self.client.force_authenticate(user=self.madurai_admin)
        response = self.client.get('/api/admin/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify Madurai admin ONLY sees the Madurai pending owner
        usernames = [u['username'] for u in response.data]
        self.assertIn('madurai_owner', usernames)
        self.assertNotIn('trichy_owner', usernames)

    def test_passcode_disable_toggling(self):
        self.client.force_authenticate(user=self.trichy_admin)
        
        # Disable Trichy passcode
        response = self.client.patch(f'/api/admin/passcodes/{self.trichy_passcode.id}/', {'is_active': False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_active'])
        
        self.trichy_passcode.refresh_from_db()
        self.assertFalse(self.trichy_passcode.is_active)

        # Try to register a user with the disabled passcode -> Should fail
        self.client.force_authenticate(user=None)
        signup_data = {
            'username': 'owner_disabled',
            'email': 'owner_disabled@banana.com',
            'password': 'testpassword',
            'confirm_password': 'testpassword',
            'name': 'Trader Disabled',
            'phone': '1234567890',
            'district': 'Trichy',
            'passcode': 'TRICHY99'
        }
        
        response = self.client.post('/api/auth/signup/', signup_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("passcode", response.data)
        self.assertIn("Invalid or inactive", response.data['passcode'][0])

    def test_invoices_hidden_from_admin(self):
        # Create a settled invoice for a customer owned by Trichy owner
        trichy_owner = User.objects.create_user(
            username='trichy_owner',
            email='trichy_owner@banana.com',
            password='testpassword',
            role='owner',
            district='Trichy',
            is_approved=True
        )
        
        customer = Customer.objects.create(name='Grower', place='Thottiyam', phone='9876543210')
        Invoice.objects.create(
            invoice_no='INV-2026-99999',
            customer=customer,
            owner=trichy_owner,
            total_pieces=10,
            gross_weight=Decimal('20.0'),
            removable_weight_per_piece=Decimal('1.0'),
            total_removable_weight=Decimal('10.0'),
            net_weight=Decimal('10.0'),
            rate=Decimal('30.0'),
            final_amount=Decimal('300.0'),
            payment_status='settled'
        )

        # 1. Owner requests invoices list -> sees 1 invoice
        self.client.force_authenticate(user=trichy_owner)
        response = self.client.get('/api/invoices/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # 2. Admin requests invoices list -> returns empty list (Admin has no invoices and cannot view others)
        self.client.force_authenticate(user=self.trichy_admin)
        response = self.client.get('/api/invoices/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_district_lock_approved_user(self):
        trichy_owner = User.objects.create_user(
            username='trichy_owner_lock',
            email='trichy_owner_lock@banana.com',
            password='testpassword',
            role='owner',
            district='Trichy',
            is_approved=True
        )
        self.client.force_authenticate(user=trichy_owner)
        
        # 1. Update name -> Should succeed
        response = self.client.patch('/api/auth/profile/', {'name': 'Updated Name'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Name')

        # 2. Update district -> Should fail
        response = self.client.patch('/api/auth/profile/', {'district': 'Madurai'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('district', response.data)

    def test_vehicle_transport_creation_and_listing(self):
        trichy_owner = User.objects.create_user(
            username='trichy_owner_veh',
            email='trichy_owner_veh@banana.com',
            password='testpassword',
            role='owner',
            district='Trichy',
            is_approved=True
        )
        self.client.force_authenticate(user=trichy_owner)

        # 1. Register vehicle dispatch
        payload = {
            'vehicle_no': 'TN-45-A-1234',
            'vehicle_type': 'Tata Ace',
            'driver_name': 'Raja',
            'driver_phone': '9876543210',
            'total_gross_weight': '1500.00',
            'total_pieces': 100,
            'total_net_weight': '1300.00',
            'bananas': 'Poovan, Nendran'
        }
        response = self.client.post('/api/vehicles/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['vehicle_no'], 'TN-45-A-1234')

        # 2. Get list of vehicles
        response = self.client.get('/api/vehicles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_multi_variety_invoice_creation(self):
        trichy_owner = User.objects.create_user(
            username='trichy_owner_inv',
            email='trichy_owner_inv@banana.com',
            password='testpassword',
            role='owner',
            district='Trichy',
            is_approved=True
        )
        self.client.force_authenticate(user=trichy_owner)
        
        customer = Customer.objects.create(name='Grower Multi', place='Thottiyam', phone='9876543210')
        
        # Save invoice with row-level rates and varieties
        invoice_payload = {
            'customer': customer.id,
            'total_pieces': 30,
            'gross_weight': '150.00',
            'removable_weight_per_piece': '1.000',
            'total_removable_weight': '30.00',
            'net_weight': '120.00',
            'rate': None,
            'final_amount': '5400.00',
            'payment_status': 'not_settled',
            'weight_entries': [
                {
                    'serial_no': 1,
                    'banana_type': 'Poovan',
                    'rate': '35.00',
                    'piece_count': 10,
                    'weight': '50.00'
                },
                {
                    'serial_no': 2,
                    'banana_type': 'Nendran',
                    'rate': '50.00',
                    'piece_count': 20,
                    'weight': '100.00'
                }
            ],
            'payments': []
        }
        
        response = self.client.post('/api/invoices/', invoice_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['weight_entries'][0]['banana_type'], 'Poovan')
        self.assertEqual(response.data['weight_entries'][1]['banana_type'], 'Nendran')
        
        # Verify db persistence
        db_entries = WeightEntry.objects.filter(invoice__invoice_no=response.data['invoice_no'])
        self.assertEqual(db_entries.count(), 2)

    def test_pending_cargo_accumulation_and_reset(self):
        trichy_owner = User.objects.create_user(
            username='trichy_owner_cargo',
            email='trichy_owner_cargo@banana.com',
            password='testpassword',
            role='owner',
            district='Trichy',
            is_approved=True
        )
        self.client.force_authenticate(user=trichy_owner)
        
        # Initially, pending cargo should be 0 because there are no invoices
        response = self.client.get('/api/vehicles/pending_cargo/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['pieces'], 0)
        self.assertEqual(response.data['gross_weight'], 0.0)

        # Create 1 invoice
        customer = Customer.objects.create(name='Grower Cargo', place='Thottiyam', phone='9876543210')
        Invoice.objects.create(
            invoice_no='INV-2026-88881',
            customer=customer,
            owner=trichy_owner,
            total_pieces=15,
            gross_weight=Decimal('30.0'),
            removable_weight_per_piece=Decimal('1.0'),
            total_removable_weight=Decimal('15.0'),
            net_weight=Decimal('15.0'),
            rate=Decimal('30.0'),
            final_amount=Decimal('450.0'),
            payment_status='settled'
        )

        # Pending cargo should accumulate this invoice
        response = self.client.get('/api/vehicles/pending_cargo/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['pieces'], 15)
        self.assertEqual(response.data['gross_weight'], 30.0)
        self.assertEqual(response.data['net_weight'], 15.0)

        # Create a VehicleTransport log -> resets the accumulation
        VehicleTransport.objects.create(
            owner=trichy_owner,
            vehicle_no='TN-45-A-9999',
            vehicle_type='Tata Ace',
            driver_name='Driver Raja',
            driver_phone='9876543210',
            total_gross_weight=Decimal('30.0'),
            total_pieces=15,
            total_net_weight=Decimal('15.0'),
            bananas='Poovan'
        )

        # Pending cargo should now be 0 since the vehicle log was created after the invoice
        response = self.client.get('/api/vehicles/pending_cargo/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['pieces'], 0)
        self.assertEqual(response.data['gross_weight'], 0.0)

    def test_piece_based_billing_invoice(self):
        trichy_owner = User.objects.create_user(
            username='trichy_owner_piece',
            email='trichy_owner_piece@banana.com',
            password='testpassword',
            role='owner',
            district='Trichy',
            is_approved=True
        )
        self.client.force_authenticate(user=trichy_owner)
        
        customer = Customer.objects.create(name='Grower Piece', place='Thottiyam', phone='9876543210')
        
        # Save invoice with billing by piece (weight = 0.0)
        invoice_payload = {
            'customer': customer.id,
            'total_pieces': 100,
            'gross_weight': '0.00',
            'removable_weight_per_piece': '0.000',
            'total_removable_weight': '0.00',
            'net_weight': '0.00',
            'rate': None,
            'final_amount': '400.00',
            'payment_status': 'not_settled',
            'weight_entries': [
                {
                    'serial_no': 1,
                    'banana_type': 'Elakki (Piece)',
                    'rate': '4.00',
                    'piece_count': 100,
                    'weight': '0.00'
                }
            ],
            'payments': []
        }
        
        response = self.client.post('/api/invoices/', invoice_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['final_amount'], '400.00')
        self.assertEqual(response.data['weight_entries'][0]['banana_type'], 'Elakki (Piece)')
        self.assertEqual(response.data['weight_entries'][0]['weight'], '0.00')

    def test_delete_owner_cascade(self):
        # Create Trichy owner
        trichy_owner = User.objects.create_user(
            username='trichy_owner_del',
            email='trichy_owner_del@banana.com',
            password='testpassword',
            role='owner',
            district='Trichy',
            is_approved=True
        )
        
        # Create customer, invoice, and vehicle log for this owner
        customer = Customer.objects.create(name='Grower Del', place='Thottiyam', phone='9876543210')
        invoice = Invoice.objects.create(
            invoice_no='INV-DEL-TEST',
            customer=customer,
            owner=trichy_owner,
            total_pieces=10,
            gross_weight=Decimal('20.0'),
            removable_weight_per_piece=Decimal('1.0'),
            total_removable_weight=Decimal('10.0'),
            net_weight=Decimal('10.0'),
            rate=Decimal('30.0'),
            final_amount=Decimal('300.0'),
            payment_status='settled'
        )
        vehicle = VehicleTransport.objects.create(
            owner=trichy_owner,
            vehicle_no='TN-45-A-0000',
            vehicle_type='Tata Ace',
            driver_name='Driver Raja',
            driver_phone='9876543210',
            total_gross_weight=Decimal('30.0'),
            total_pieces=15,
            total_net_weight=Decimal('15.0'),
            bananas='Poovan'
        )

        # Authenticate as Trichy Admin
        self.client.force_authenticate(user=self.trichy_admin)
        
        # Verify the user exists in database
        self.assertTrue(User.objects.filter(id=trichy_owner.id).exists())
        self.assertTrue(Invoice.objects.filter(id=invoice.id).exists())
        self.assertTrue(VehicleTransport.objects.filter(id=vehicle.id).exists())

        # Call delete endpoint
        response = self.client.delete(f'/api/admin/users/{trichy_owner.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Assert User is deleted
        self.assertFalse(User.objects.filter(id=trichy_owner.id).exists())
        # Assert Invoice and Vehicle are cascade deleted
        self.assertFalse(Invoice.objects.filter(id=invoice.id).exists())
        self.assertFalse(VehicleTransport.objects.filter(id=vehicle.id).exists())
