import os
import django

# Set environment variable
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'banana_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from billing.models import SignupPasscode, BananaRate, BananaRateHistory

User = get_user_model()

def seed_db():
    print("Seeding database...")
    
    # 1. Create Admin User
    admin_user, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@banana.com',
            'name': 'District Banana Head',
            'role': 'admin',
            'district': 'Trichy',
            'business_name': 'District Banana Association',
            'native_place': 'Trichy',
            'is_approved': True,
            'is_staff': True,
            'is_superuser': True
        }
    )
    if created:
        admin_user.set_password('adminpassword')
        admin_user.save()
        print("Admin user 'admin' created with password 'adminpassword'")
    else:
        print("Admin user already exists")

    # 2. Create Passcodes
    passcode, created = SignupPasscode.objects.get_or_create(
        passcode='BANANA2026',
        defaults={
            'is_active': True,
            'created_by': admin_user
        }
    )
    if created:
        print("Default passcode 'BANANA2026' created")
    else:
        print("Default passcode already exists")

    # 3. Create default Banana Rates
    rates = [
        {'banana_type': 'Poovan', 'rate': 35.00},
        {'banana_type': 'Nendran', 'rate': 42.00},
        {'banana_type': 'Red Banana', 'rate': 55.00},
        {'banana_type': 'Rasthali', 'rate': 48.00},
    ]
    
    for r in rates:
        rate_obj, created = BananaRate.objects.get_or_create(
            banana_type=r['banana_type'],
            defaults={'rate': r['rate']}
        )
        if created:
            print(f"Banana rate for {r['banana_type']} set to Rs.{r['rate']}/kg")
            BananaRateHistory.objects.create(
                banana_type=r['banana_type'],
                rate=r['rate']
            )
        else:
            print(f"Banana rate for {r['banana_type']} already exists")

    print("Seeding completed successfully!")

if __name__ == '__main__':
    seed_db()
