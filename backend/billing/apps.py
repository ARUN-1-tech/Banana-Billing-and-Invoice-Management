from django.apps import AppConfig

class BillingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'billing'

    def ready(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()

        if not User.objects.filter(username="Arun").exists():

            user = User.objects.create_user(
                username="Arun",
                email="arundevil2007@gmail.com",
                password="Admin@123"
            )

            user.role = "admin"
            user.district = "Erode"
            user.is_approved = True

            user.save()

            print("District admin created")