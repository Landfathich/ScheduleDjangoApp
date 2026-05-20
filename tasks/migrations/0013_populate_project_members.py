from django.db import migrations


def add_creators_as_members(apps, schema_editor):
    Project = apps.get_model('tasks', 'Project')
    ProjectMember = apps.get_model('tasks', 'ProjectMember')

    for project in Project.objects.all():
        ProjectMember.objects.get_or_create(
            project=project,
            user=project.creator,
            defaults={
                'role': 'owner',
                'added_by': project.creator,
            }
        )


def remove_creators_from_members(apps, schema_editor):
    ProjectMember = apps.get_model('tasks', 'ProjectMember')
    ProjectMember.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ('tasks', '0012_alter_project_creator_projectmember_project_members'),
    ]

    operations = [
        migrations.RunPython(add_creators_as_members, remove_creators_from_members),
    ]