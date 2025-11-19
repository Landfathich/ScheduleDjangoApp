from django import forms

from .models import Task


class TaskForm(forms.ModelForm):
    delete_image = forms.BooleanField(required=False, label="Удалить изображение")

    class Meta:
        model = Task
        fields = ['title', 'description', 'assignee', 'image']
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
            })
        }

    def save(self, commit=True):
        task = super().save(commit=False)

        # Если отмечен чекбокс удаления
        if self.cleaned_data.get('delete_image'):
            if task.image:
                task.image.delete()  # удаляем файл
                task.image = None  # очищаем поле

        if commit:
            task.save()

        return task

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Делаем поле assignee необязательным
        self.fields['assignee'].required = False
        self.fields['assignee'].empty_label = "Не назначен"
