from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from traces.models import Span, ConnectedApp

class Command(BaseCommand):
    help = 'Deletes old spans and stale disconnected apps, to keep the dashboard ready.'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=7, help='Delete spans older than this many days (default: 7)')
        parser.add_argument('--dry-run', action='store_true', help='Show what would be deleted without deleting')

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=options['days'])
        old_spans = Span.objects.filter(received_at__lt=cutoff)
        count = old_spans.count()

        if options['dry_run']:
            self.stdout.write(f'Would delete {count} spans older than {options['days']} days.')
        else:
            old_spans.delete()
            self.stdout.write(self.style.SUCCESS(f'Deleted {count} spans older than {options['days']} days.'))

        stale_apps = ConnectedApp.objects.filter(is_connected=False, last_seen__lt=cutoff)
        stale_count = stale_apps.count()

        if options['dry_run']:
            self.stdout.write(f'Would delete {stale_count} stale disconnected apps.')
        else:
            stale_apps.delete()
            self.stdout.write(self.style.SUCCESS(f'Deleted {stale_apps} stale disconnected apps.'))