from django.urls import path

from . import views

app_name = 'tasks'

urlpatterns = [
    path('', views.kanban_board, name='kanban_board'),
    path('create/', views.task_form, name='create_task'),
    path('edit/<int:task_id>/', views.task_form, name='edit_task'),
    path('delete/<int:task_id>/', views.delete_task, name='delete_task'),
    path('update-status/', views.update_task_status, name='update_task_status'),
]
