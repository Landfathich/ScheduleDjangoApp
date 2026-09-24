from django import forms

from .models import Task, Project


class TaskForm(forms.ModelForm):
    delete_image = forms.BooleanField(
        required=False,
        label="Удалить изображение"
    )

    class Meta:
        model = Task
        fields = [
            'title',
            'description',
            'assignee',
            'project',
            'due_date',
            'priority',
            'image',
        ]
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Введите название задачи'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-textarea',
                'placeholder': 'Введите описание задачи',
                'rows': 4
            }),
            'assignee': forms.Select(attrs={
                'class': 'form-select'
            }),
            'project': forms.Select(attrs={
                'class': 'form-select'
            }),
            'due_date': forms.DateTimeInput(attrs={
                'class': 'form-input',
                'type': 'datetime-local'
            }),
            'priority': forms.Select(attrs={
                'class': 'form-select'
            }),
            'image': forms.ClearableFileInput(attrs={
                'class': 'form-input'
            }),
        }

    def save(self, commit=True):
        task = super().save(commit=False)

        if self.cleaned_data.get('delete_image'):
            if task.image:
                task.image.delete()
                task.image = None

        if commit:
            task.save()

        return task

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields['assignee'].required = False
        self.fields['assignee'].empty_label = "Не назначен"

        self.fields['project'].required = False
        self.fields['project'].empty_label = "Без проекта"

        self.fields['priority'].required = False


class ProjectForm(forms.ModelForm):
    class Meta:
        model = Project
        fields = ['name', 'description', 'color']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Введите название проекта'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-textarea',
                'placeholder': 'Описание проекта (необязательно)',
                'rows': 3
            }),
            'color': forms.TextInput(attrs={
                'type': 'color',
                'class': 'form-input'
            })
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Устанавливаем дефолтный цвет только для новых проектов
        if not self.instance.pk:
            self.fields['color'].initial = '#336699'
