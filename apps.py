from django.apps import AppConfig

class PartnersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'partners'

    def ready(self):
        # Import and register the signals
        import partners.signals