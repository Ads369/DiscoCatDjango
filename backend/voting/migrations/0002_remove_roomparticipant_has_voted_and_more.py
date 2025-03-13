# Generated by Django 5.1.7 on 2025-03-12 05:57

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('voting', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='roomparticipant',
            name='has_voted',
        ),
        migrations.RemoveField(
            model_name='votingroom',
            name='participants',
        ),
        migrations.AddField(
            model_name='roomparticipant',
            name='comments',
            field=models.CharField(blank=True, default=None, max_length=512),
        ),
        migrations.AlterField(
            model_name='votingobject',
            name='id',
            field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
    ]
