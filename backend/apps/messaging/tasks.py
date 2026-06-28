from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta


@shared_task
def send_trip_reminders():
    """Find trips starting in 7 days and send in-app + email notifications."""
    from apps.trips.models import Trip
    from .models import Notification

    target_date = (timezone.now() + timedelta(days=7)).date()
    trips = Trip.objects.filter(start_date=target_date).select_related("user")

    sent = 0
    for trip in trips:
        already_notified = Notification.objects.filter(
            user=trip.user,
            trip=trip,
            notification_type="trip_reminder",
        ).exists()
        if already_notified:
            continue

        title = f"Trip reminder: \"{trip.name}\" starts in 7 days"
        message = (
            f"Your trip \"{trip.name}\" is coming up! "
            f"It starts on {trip.start_date.strftime('%B %d, %Y')}. "
            "Have a great journey!"
        )

        Notification.objects.create(
            user=trip.user,
            trip=trip,
            notification_type="trip_reminder",
            title=title,
            message=message,
        )

        if trip.user.email:
            send_mail(
                subject=title,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[trip.user.email],
                fail_silently=True,
            )

        sent += 1

    return f"Sent {sent} trip reminder(s) for {target_date}"
