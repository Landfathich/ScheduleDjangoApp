from django.urls import path

from . import views

app_name = 'tasks'

urlpatterns = [
    path('', views.kanban_board, name='kanban_board'),

    path('projects/', views.project_list, name='project_list'),
    path('projects/create/', views.create_project, name='create_project'),
    path('projects/edit/<int:project_id>/', views.edit_project, name='edit_project'),
    path('projects/delete/<int:project_id>/', views.delete_project, name='delete_project'),

    path('create/', views.create_task, name='create_task'),
    path('edit/<int:task_id>/', views.edit_task, name='edit_task'),
    path('delete/<int:task_id>/', views.delete_task, name='delete_task'),
    path('update-status/', views.update_task_status, name='update_status'),
    path('get-task-data/<int:task_id>/', views.get_task_data, name='get_task_data'),

    path('update-column/', views.update_column, name='update_column'),
    path('move-column/', views.move_column, name='move_column'),
]
