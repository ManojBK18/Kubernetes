from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Result
from .serializers import ResultSerializer


class ResultCreateView(APIView):
    """
    POST /api/results/
    Called internally by exam-service after a student submits.
    Creates or updates the result record.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        data = request.data
        result, created = Result.objects.update_or_create(
            submission_id=data['submission_id'],
            defaults={
                'exam_id':        data['exam_id'],
                'exam_title':     data['exam_title'],
                'student_id':     data['student_id'],
                'student_name':   data['student_name'],
                'total_marks':    data['total_marks'],
                'obtained_marks': data['obtained_marks'],
                'percentage':     data['percentage'],
                'passed':         data['passed'],
            },
        )
        return Response(
            ResultSerializer(result).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ResultListView(generics.ListAPIView):
    """
    GET /api/results/
    - Students   → their own results only
    - Teacher    → all results (can filter by exam_id)
    - Admin      → all results
    """
    serializer_class   = ResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user    = self.request.user
        qs      = Result.objects.all()
        exam_id = self.request.query_params.get('exam_id')
        if user.role == 'student':
            qs = qs.filter(student_id=user.id)
        if exam_id:
            qs = qs.filter(exam_id=exam_id)
        return qs


class ResultDetailView(generics.RetrieveAPIView):
    """GET /api/results/<id>/"""
    serializer_class   = ResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset           = Result.objects.all()

    def get_object(self):
        obj  = super().get_object()
        user = self.request.user
        if user.role == 'student' and obj.student_id != user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only view your own results.')
        return obj


class ResultBySubmissionView(generics.RetrieveAPIView):
    """GET /api/results/submission/<submission_id>/"""
    serializer_class   = ResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        try:
            result = Result.objects.get(submission_id=self.kwargs['submission_id'])
        except Result.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Result not found.')
        user = self.request.user
        if user.role == 'student' and result.student_id != user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied()
        return result


class ExamLeaderboardView(generics.ListAPIView):
    """GET /api/results/leaderboard/?exam_id=<id> — top scores for an exam"""
    serializer_class   = ResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        exam_id = self.request.query_params.get('exam_id')
        if not exam_id:
            return Result.objects.none()
        return Result.objects.filter(exam_id=exam_id).order_by('-percentage', '-obtained_marks')[:20]

