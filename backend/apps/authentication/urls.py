from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = "authentication"


urlpatterns = [
    path("register/", views.UserRegistrationView.as_view(), name="register"),
    path("login/", views.UserLoginView.as_view(), name="login"),
    path("logout/", views.UserRegistrationView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
