# Generated by Django 5.1.7 on 2025-03-23 08:56

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('voting', '0006_votingroom_final_results'),
    ]

    operations = [
        migrations.CreateModel(
            name='NickName',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('fingerprint', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
