from rest_framework import serializers
from .models import Result


class ResultSerializer(serializers.ModelSerializer):
    grade = serializers.ReadOnlyField()

    class Meta:
        model  = Result
        fields = ('id', 'submission_id', 'exam_id', 'exam_title',
                  'student_id', 'student_name', 'total_marks',
                  'obtained_marks', 'percentage', 'passed',
                  'grade', 'calculated_at')
        read_only_fields = ('id', 'calculated_at')

