# Generated by Django 5.1.7 on 2025-03-12 04:36

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='user_id',
            field=models.CharField(default='qwe', max_length=6, unique=True),
        ),
    ]
