from django.contrib import admin
from .models import Exam, Question, Choice, Submission, Answer

class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 4

class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1

@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display  = ('title', 'created_by_name', 'is_active', 'question_count', 'created_at')
    list_filter   = ('is_active',)
    inlines       = [QuestionInline]

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('text', 'exam', 'marks', 'order')
    inlines      = [ChoiceInline]

@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ('student_name', 'exam', 'status', 'started_at', 'submitted_at')
    list_filter  = ('status',)

