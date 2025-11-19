from django.urls import path

from . import views

app_name = 'tasks'

urlpatterns = [
    path('', views.kanban_board, name='kanban_board'),
    path('create/', views.create_task, name='create_task'),  # теперь AJAX
    path('edit/<int:task_id>/', views.edit_task, name='edit_task'),  # теперь AJAX
    path('delete/<int:task_id>/', views.delete_task, name='delete_task'),
    path('update-status/', views.update_task_status, name='update_status'),
    path('get-task-data/<int:task_id>/', views.get_task_data, name='get_task_data'),
]