"""Tests for authentication app: serializers and views."""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.serializers import (
    UserLoginSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
)

User = get_user_model()


# ─── Serializers ──────────────────────────────────────────────────────────────


class TestUserRegistrationSerializer:
    def test_valid_data_is_accepted(self, db):
        data = {
            "email": "new@example.com",
            "username": "newuser",
            "first_name": "New",
            "last_name": "User",
            "password": "Str0ng!Pass",
            "password_confirm": "Str0ng!Pass",
        }
        s = UserRegistrationSerializer(data=data)
        assert s.is_valid(), s.errors

    def test_password_mismatch_is_rejected(self, db):
        data = {
            "email": "new@example.com",
            "username": "newuser",
            "first_name": "New",
            "last_name": "User",
            "password": "Str0ng!Pass",
            "password_confirm": "DifferentPass!1",
        }
        s = UserRegistrationSerializer(data=data)
        assert not s.is_valid()
        # DRF surfaces this under non_field_errors
        assert "non_field_errors" in s.errors

    def test_duplicate_email_is_rejected(self, user):
        data = {
            "email": user.email,
            "username": "anotheruser",
            "first_name": "Another",
            "last_name": "User",
            "password": "Str0ng!Pass",
            "password_confirm": "Str0ng!Pass",
        }
        s = UserRegistrationSerializer(data=data)
        assert not s.is_valid()
        assert "email" in s.errors

    def test_create_hashes_password(self, db):
        data = {
            "email": "hash@example.com",
            "username": "hashuser",
            "first_name": "Hash",
            "last_name": "User",
            "password": "Str0ng!Pass",
            "password_confirm": "Str0ng!Pass",
        }
        s = UserRegistrationSerializer(data=data)
        assert s.is_valid(), s.errors
        new_user = s.save()
        assert new_user.check_password("Str0ng!Pass")
        assert new_user.password != "Str0ng!Pass"

    def test_password_confirm_not_stored_on_user(self, db):
        data = {
            "email": "noconfirm@example.com",
            "username": "noconfirm",
            "first_name": "No",
            "last_name": "Confirm",
            "password": "Str0ng!Pass",
            "password_confirm": "Str0ng!Pass",
        }
        s = UserRegistrationSerializer(data=data)
        assert s.is_valid()
        new_user = s.save()
        assert not hasattr(new_user, "password_confirm")


class TestUserLoginSerializer:
    def test_valid_credentials_return_user(self, user):
        s = UserLoginSerializer(data={"email": user.email, "password": "Passw0rd!99"})
        assert s.is_valid(), s.errors
        assert s.validated_data["user"] == user

    def test_wrong_password_is_rejected(self, user):
        s = UserLoginSerializer(data={"email": user.email, "password": "wrong"})
        assert not s.is_valid()

    def test_nonexistent_email_is_rejected(self, db):
        s = UserLoginSerializer(data={"email": "nobody@example.com", "password": "any"})
        assert not s.is_valid()

    def test_missing_email_field_is_rejected(self, db):
        s = UserLoginSerializer(data={"password": "Passw0rd!99"})
        assert not s.is_valid()
        assert "email" in s.errors

    def test_missing_password_field_is_rejected(self, db):
        s = UserLoginSerializer(data={"email": "test@example.com"})
        assert not s.is_valid()
        assert "password" in s.errors

    def test_inactive_user_is_rejected(self, user):
        user.is_active = False
        user.save()
        s = UserLoginSerializer(data={"email": user.email, "password": "Passw0rd!99"})
        assert not s.is_valid()


class TestUserProfileSerializer:
    def test_full_name_derived_from_first_and_last(self, user):
        data = UserProfileSerializer(user).data
        assert data["full_name"] == f"{user.first_name} {user.last_name}"

    def test_email_is_in_read_only_fields(self):
        read_only = UserProfileSerializer.Meta.read_only_fields
        assert "email" in read_only

    def test_id_is_in_read_only_fields(self):
        read_only = UserProfileSerializer.Meta.read_only_fields
        assert "id" in read_only

    def test_email_not_updated_via_partial(self, user):
        original_email = user.email
        s = UserProfileSerializer(user, data={"email": "hacker@evil.com"}, partial=True)
        s.is_valid()
        # read_only_fields are silently ignored on update
        assert "email" not in (s.validated_data or {})
        user.refresh_from_db()
        assert user.email == original_email


# ─── Views ────────────────────────────────────────────────────────────────────


class TestUserRegistrationView:
    url = "/api/auth/register/"

    def test_successful_registration_returns_201(self, api_client, db):
        payload = {
            "email": "fresh@example.com",
            "username": "freshuser",
            "first_name": "Fresh",
            "last_name": "User",
            "password": "Str0ng!Pass",
            "password_confirm": "Str0ng!Pass",
        }
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_response_includes_jwt_tokens(self, api_client, db):
        payload = {
            "email": "tokentest@example.com",
            "username": "tokentest",
            "first_name": "Token",
            "last_name": "Test",
            "password": "Str0ng!Pass",
            "password_confirm": "Str0ng!Pass",
        }
        response = api_client.post(self.url, payload, format="json")
        assert "tokens" in response.data
        assert "access" in response.data["tokens"]
        assert "refresh" in response.data["tokens"]

    def test_response_includes_user_profile(self, api_client, db):
        payload = {
            "email": "profiletest@example.com",
            "username": "profiletest",
            "first_name": "Profile",
            "last_name": "Test",
            "password": "Str0ng!Pass",
            "password_confirm": "Str0ng!Pass",
        }
        response = api_client.post(self.url, payload, format="json")
        assert response.data["user"]["email"] == "profiletest@example.com"

    def test_duplicate_email_returns_400(self, api_client, user):
        payload = {
            "email": user.email,
            "username": "dup",
            "first_name": "Dup",
            "last_name": "User",
            "password": "Str0ng!Pass",
            "password_confirm": "Str0ng!Pass",
        }
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_mismatch_returns_400(self, api_client, db):
        payload = {
            "email": "mismatch@example.com",
            "username": "mismatch",
            "first_name": "Mis",
            "last_name": "Match",
            "password": "Str0ng!Pass",
            "password_confirm": "Different!1",
        }
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestUserLoginView:
    url = "/api/auth/login/"

    def test_valid_credentials_return_200_with_tokens(self, api_client, user):
        response = api_client.post(
            self.url,
            {"email": user.email, "password": "Passw0rd!99"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert "tokens" in response.data
        assert "access" in response.data["tokens"]
        assert "refresh" in response.data["tokens"]

    def test_wrong_password_returns_400(self, api_client, user):
        response = api_client.post(
            self.url,
            {"email": user.email, "password": "wrong_password"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unknown_email_returns_400(self, api_client, db):
        response = api_client.post(
            self.url,
            {"email": "nobody@example.com", "password": "anything"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_response_includes_user_data(self, api_client, user):
        response = api_client.post(
            self.url,
            {"email": user.email, "password": "Passw0rd!99"},
            format="json",
        )
        assert response.data["user"]["email"] == user.email


class TestUserLogoutView:
    url = "/api/auth/logout/"

    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.post(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_logout_returns_200(self, auth_client):
        response = auth_client.post(self.url, {}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["message"] == "Successfully logged out."

    def test_logout_blacklists_provided_refresh_token(self, auth_client, user, api_client):
        refresh = RefreshToken.for_user(user)
        # Blacklist the token via logout
        response = auth_client.post(
            self.url,
            {"refresh_token": str(refresh)},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        # The blacklisted token should be rejected by the refresh endpoint
        refresh_response = api_client.post(
            "/api/auth/token/refresh/",
            {"refresh": str(refresh)},
            format="json",
        )
        assert refresh_response.status_code == status.HTTP_401_UNAUTHORIZED


class TestUserProfileView:
    url = "/api/auth/me/"

    def test_unauthenticated_returns_401(self, api_client):
        assert api_client.get(self.url).status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_returns_authenticated_users_profile(self, auth_client, user):
        response = auth_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == user.email
        assert response.data["full_name"] == user.full_name

    def test_patch_updates_allowed_fields(self, auth_client, user):
        response = auth_client.patch(
            self.url,
            {"first_name": "Updated", "last_name": "Name"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.first_name == "Updated"
        assert user.last_name == "Name"

    def test_patch_cannot_change_email(self, auth_client, user):
        original_email = user.email
        auth_client.patch(self.url, {"email": "hacker@evil.com"}, format="json")
        user.refresh_from_db()
        assert user.email == original_email

    def test_full_name_updates_when_name_changes(self, auth_client, user):
        auth_client.patch(
            self.url,
            {"first_name": "Jane", "last_name": "Doe"},
            format="json",
        )
        user.refresh_from_db()
        assert user.full_name == "Jane Doe"
