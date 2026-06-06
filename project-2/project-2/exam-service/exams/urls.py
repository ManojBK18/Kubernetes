from django.urls import path
from .views import (
    ExamListCreateView, ExamDetailView,
    QuestionListCreateView, QuestionDetailView,
    StartExamView, SubmitExamView,
    MySubmissionsView, AllSubmissionsView,
)

urlpatterns = [
    path('',                                      ExamListCreateView.as_view()),
    path('<int:pk>/',                             ExamDetailView.as_view()),
    path('<int:exam_id>/questions/',              QuestionListCreateView.as_view()),
    path('<int:exam_id>/questions/<int:pk>/',     QuestionDetailView.as_view()),
    path('<int:exam_id>/start/',                  StartExamView.as_view()),
    path('<int:exam_id>/submit/',                 SubmitExamView.as_view()),
    path('my-submissions/',                       MySubmissionsView.as_view()),
    path('submissions/',                          AllSubmissionsView.as_view()),
]

