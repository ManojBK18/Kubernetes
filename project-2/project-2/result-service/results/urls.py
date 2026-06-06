from django.urls import path
from .views import (
    ResultCreateView, ResultListView, ResultDetailView,
    ResultBySubmissionView, ExamLeaderboardView,
)

urlpatterns = [
    path('',                                ResultCreateView.as_view(), name='result-list-create'),
    path('list/',                           ResultListView.as_view()),
    path('<int:pk>/',                       ResultDetailView.as_view()),
    path('submission/<int:submission_id>/', ResultBySubmissionView.as_view()),
    path('leaderboard/',                    ExamLeaderboardView.as_view()),
]

