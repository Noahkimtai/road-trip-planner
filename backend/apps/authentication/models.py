from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Custom User model with additional fields for road trip planning"""

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)

    # User Preferences stored as JSON
    preferences = models.JSONField(
        default=dict, blank=True, help_text="User trip preferences"
    )

    # profile information
    phone_number = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)

    # Account settings
    is_email_verified = models.BooleanField(default=False)
    email_notifications = models.BooleanField(default=False)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Use email as the username field
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    class Meta:
        """Meta class defines the behavior of the table not the fields"""

        db_table = "auth_user"  # explicitly store table with the name
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_preference(self, key, default=None):
        "Get a specific preference value"
        return self.preferences.get(key, default)

    def set_preference(self, key, value):
        """Set a specif user preference"""
        self.preferences[key] = value
        self.save(update_fields=["preferences"])
