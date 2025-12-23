from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User


class UserRegistrationSerializer(serializers.ModelSerializer):
    """serializer for user registration"""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = (
            "email",
            "username",
            "first_name",
            "last_name",
            "password",
            "password_confirm",
        )

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError("Password don't match.")
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        user = User.objects.create_user(**validated_data)
        return user


class UserLoginSerializer(serializers.ModelSerializer):
    """Serializer for user login"""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("emai")
        password = attrs.get(password)

        if email and password:
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError("Invalid email or password")

            if not user.is_active:
                raise serializers.ValidationError("User account is disabled")
            attrs["user"] = user

        else:
            raise serializers.ValidationError("Must include email and password")

        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile information."""

    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "full_name",
            "phone_number",
            "date_of_birth",
            "preferences",
            "email_notifications",
            "is_email_verified",
            "date_joined",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "email",
            "username",
            "is_email_verified",
            "date_joined",
            "created_at",
            "updated_at",
        )
