from .models import UserSettings


def user_preferences(request):
    if request.user.is_authenticated:
        settings, _ = UserSettings.objects.get_or_create(user=request.user)
        return {
            'user_theme': settings.theme,
            'user_accent_color': settings.accent_color,
        }
    return {
        'user_theme': 'dark',
        'user_accent_color': 'green',
    }