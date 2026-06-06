from django.contrib import admin
from .models import Result

@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ('student_name', 'exam_title', 'obtained_marks', 'total_marks', 'percentage', 'passed', 'calculated_at')
    list_filter  = ('passed',)
    search_fields = ('student_name', 'exam_title')

