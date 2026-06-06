from django.utils import timezone
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
import requests as http_requests

from .models import Exam, Question, Choice, Submission, Answer
from .serializers import (
    ExamListSerializer, ExamDetailSerializer, ExamWriteSerializer,
    ExamStudentSerializer, QuestionSerializer, SubmitExamSerializer,
    SubmissionSerializer,
)
from .permissions import IsTeacherOrAdmin, IsAdmin


# ── Exam views ────────────────────────────────────────────────────────────────

class ExamListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/exams/          — all roles (students see active only)
    POST /api/exams/          — teacher / admin
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ExamWriteSerializer
        return ExamListSerializer

    def get_queryset(self):
        qs = Exam.objects.all()
        if self.request.user.role == 'student':
            qs = qs.filter(is_active=True)
        if self.request.user.role == 'teacher':
            qs = qs.filter(created_by_id=self.request.user.id)
        return qs

    def perform_create(self, serializer):
        if self.request.user.role not in ('teacher', 'admin'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only teachers or admins can create exams.')
        serializer.save(
            created_by_id=self.request.user.id,
            created_by_name=self.request.user.username,
        )


class ExamDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/exams/<id>/   — all roles
    PATCH  /api/exams/<id>/   — teacher (own) / admin
    DELETE /api/exams/<id>/   — teacher (own) / admin
    """
    queryset           = Exam.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return ExamWriteSerializer
        return ExamDetailSerializer

    def _check_ownership(self, exam):
        user = self.request.user
        if user.role == 'teacher' and exam.created_by_id != user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only modify your own exams.')
        if user.role == 'student':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Students cannot modify exams.')

    def update(self, request, *args, **kwargs):
        self._check_ownership(self.get_object())
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._check_ownership(self.get_object())
        return super().destroy(request, *args, **kwargs)


# ── Question views ────────────────────────────────────────────────────────────

class QuestionListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/exams/<exam_id>/questions/   — teacher/admin (full) or student (no answers)
    POST /api/exams/<exam_id>/questions/   — teacher/admin only
    """
    serializer_class   = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_exam(self):
        return Exam.objects.get(pk=self.kwargs['exam_id'])

    def get_queryset(self):
        return Question.objects.filter(exam_id=self.kwargs['exam_id']).prefetch_related('choices')

    def perform_create(self, serializer):
        exam = self.get_exam()
        user = self.request.user
        if user.role not in ('teacher', 'admin'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only teachers or admins can add questions.')
        if user.role == 'teacher' and exam.created_by_id != user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only add questions to your own exams.')
        serializer.save(exam=exam)


class QuestionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/exams/<exam_id>/questions/<id>/
    """
    serializer_class   = QuestionSerializer
    permission_classes = [IsTeacherOrAdmin]
    queryset           = Question.objects.prefetch_related('choices')


# ── Student exam-taking views ─────────────────────────────────────────────────

class StartExamView(APIView):
    """
    POST /api/exams/<exam_id>/start/
    Creates a Submission and returns the exam with masked choices.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, exam_id):
        if request.user.role != 'student':
            return Response({'detail': 'Only students can start exams.'}, status=403)

        try:
            exam = Exam.objects.get(pk=exam_id, is_active=True)
        except Exam.DoesNotExist:
            return Response({'detail': 'Exam not found.'}, status=404)

        if exam.questions.count() == 0:
            return Response({'detail': 'This exam has no questions yet.'}, status=400)

        sub, created = Submission.objects.get_or_create(
            exam=exam,
            student_id=request.user.id,
            defaults={'student_name': request.user.username},
        )
        if not created and sub.status == Submission.STATUS_SUBMITTED:
            return Response({'detail': 'You have already submitted this exam.'}, status=400)

        return Response({
            'submission_id': sub.id,
            'exam': ExamStudentSerializer(exam).data,
        })


class SubmitExamView(APIView):
    """
    POST /api/exams/<exam_id>/submit/
    Body: { "answers": [{"question_id": 1, "choice_id": 3}, ...] }
    Saves answers, marks submission complete, then calls result-service.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, exam_id):
        if request.user.role != 'student':
            return Response({'detail': 'Only students can submit exams.'}, status=403)

        try:
            exam = Exam.objects.get(pk=exam_id)
            sub  = Submission.objects.get(exam=exam, student_id=request.user.id)
        except (Exam.DoesNotExist, Submission.DoesNotExist):
            return Response({'detail': 'Active submission not found.'}, status=404)

        if sub.status == Submission.STATUS_SUBMITTED:
            return Response({'detail': 'Already submitted.'}, status=400)

        serializer = SubmitExamSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Persist answers
        for ans in serializer.validated_data['answers']:
            try:
                question = Question.objects.get(pk=ans['question_id'], exam=exam)
                choice   = Choice.objects.get(pk=ans['choice_id'], question=question) if ans.get('choice_id') else None
            except (Question.DoesNotExist, Choice.DoesNotExist):
                continue

            Answer.objects.update_or_create(
                submission=sub,
                question=question,
                defaults={'selected_choice': choice},
            )

        # Mark submitted
        sub.status       = Submission.STATUS_SUBMITTED
        sub.submitted_at = timezone.now()
        sub.save()

        # Calculate score locally
        score_data = self._calculate_score(sub, exam)

        # Notify result-service (fire-and-forget; don't fail if it's down)
        self._notify_result_service(sub, exam, score_data, request.META.get('HTTP_AUTHORIZATION', ''))

        return Response({
            'detail':         'Exam submitted successfully.',
            'submission_id':  sub.id,
            'obtained_marks': score_data['obtained_marks'],
            'total_marks':    score_data['total_marks'],
            'percentage':     score_data['percentage'],
            'passed':         score_data['passed'],
        })

    def _calculate_score(self, submission, exam):
        answers      = submission.answers.select_related('selected_choice', 'question').all()
        total_marks  = exam.total_marks
        obtained     = 0
        for ans in answers:
            if ans.selected_choice and ans.selected_choice.is_correct:
                obtained += ans.question.marks
        pct    = round((obtained / total_marks * 100), 2) if total_marks else 0
        passed = pct >= exam.pass_percentage
        return {'obtained_marks': obtained, 'total_marks': total_marks,
                'percentage': pct, 'passed': passed}

    def _notify_result_service(self, submission, exam, score_data, auth_header):
        url     = f"{settings.RESULT_SERVICE_URL}/api/results/"
        payload = {
            'submission_id': submission.id,
            'exam_id':       exam.id,
            'exam_title':    exam.title,
            'student_id':    submission.student_id,
            'student_name':  submission.student_name,
            **score_data,
        }
        try:
            http_requests.post(
                url,
                json=payload,
                headers={'Authorization': auth_header, 'Content-Type': 'application/json'},
                timeout=5,
            )
        except Exception:
            pass   # result-service being unavailable shouldn't fail the submission


class MySubmissionsView(generics.ListAPIView):
    """GET /api/exams/my-submissions/ — student sees their own attempts"""
    serializer_class   = SubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Submission.objects.filter(
            student_id=self.request.user.id
        ).select_related('exam').order_by('-started_at')


class AllSubmissionsView(generics.ListAPIView):
    """GET /api/exams/submissions/ — teacher/admin sees all (or filter by exam)"""
    serializer_class   = SubmissionSerializer
    permission_classes = [IsTeacherOrAdmin]

    def get_queryset(self):
        qs      = Submission.objects.select_related('exam').order_by('-started_at')
        exam_id = self.request.query_params.get('exam_id')
        if exam_id:
            qs = qs.filter(exam_id=exam_id)
        if self.request.user.role == 'teacher':
            qs = qs.filter(exam__created_by_id=self.request.user.id)
        return qs

