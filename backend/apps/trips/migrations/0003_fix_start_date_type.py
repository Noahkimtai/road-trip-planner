"""
Migration 0003: fix start_date column type

0001_initial was originally applied with start_date as BooleanField(default=False).
The model was corrected to DateField(null=True, blank=True) but the database
column was never updated. This migration performs the type conversion in-place.
Existing boolean values (all False / null) are converted to NULL.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("trips", "0002_trip_end_date_alter_trip_estimated_fuel_cost_and_more"),
    ]

    operations = [
        # Step 1: raw SQL — drop the boolean default and NOT NULL, then retype
        migrations.RunSQL(
            sql="""
                ALTER TABLE trips_trip
                    ALTER COLUMN start_date DROP DEFAULT,
                    ALTER COLUMN start_date DROP NOT NULL;

                ALTER TABLE trips_trip
                    ALTER COLUMN start_date TYPE date USING NULL;
            """,
            reverse_sql="""
                ALTER TABLE trips_trip
                    ALTER COLUMN start_date TYPE boolean USING false,
                    ALTER COLUMN start_date SET NOT NULL,
                    ALTER COLUMN start_date SET DEFAULT false;
            """,
        ),
        # Step 2: record the field change in Django's migration state
        migrations.AlterField(
            model_name="trip",
            name="start_date",
            field=models.DateField(blank=True, null=True),
        ),
    ]
