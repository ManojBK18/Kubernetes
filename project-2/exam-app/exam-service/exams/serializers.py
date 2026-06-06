from rest_framework import serializers
from .models import Exam, Question, Choice, Submission, Answer


class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Choice
        fields = ('id', 'text', 'is_correct')


class ChoicePublicSerializer(serializers.ModelSerializer):
    """For students — hides is_correct."""
    class Meta:
        model  = Choice
        fields = ('id', 'text')


class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True)

    class Meta:
        model  = Question
        fields = ('id', 'text', 'marks', 'order', 'choices')

    def create(self, validated_data):
        choices_data = validated_data.pop('choices', [])
        question = Question.objects.create(**validated_data)
        for c in choices_data:
            Choice.objects.create(question=question, **c)
        return question

    def update(self, instance, validated_data):
        choices_data = validated_data.pop('choices', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if choices_data is not None:
            instance.choices.all().delete()
            for c in choices_data:
                Choice.objects.create(question=instance, **c)
        return instance


class QuestionPublicSerializer(serializers.ModelSerializer):
    """For students taking an exam — no correct-answer flags."""
    choices = ChoicePublicSerializer(many=True)

    class Meta:
        model  = Question
        fields = ('id', 'text', 'marks', 'order', 'choices')


class ExamListSerializer(serializers.ModelSerializer):
    question_count = serializers.ReadOnlyField()
    total_marks    = serializers.ReadOnlyField()

    class Meta:
        model  = Exam
        fields = ('id', 'title', 'description', 'duration_minutes',
                  'pass_percentage', 'is_active', 'created_by_name',
                  'question_count', 'total_marks', 'created_at')


class ExamDetailSerializer(serializers.ModelSerializer):
    questions      = QuestionSerializer(many=True, read_only=True)
    question_count = serializers.ReadOnlyField()
    total_marks    = serializers.ReadOnlyField()

    class Meta:
        model  = Exam
        fields = ('id', 'title', 'description', 'duration_minutes',
                  'pass_percentage', 'is_active', 'created_by_name',
                  'question_count', 'total_marks', 'questions', 'created_at')


class ExamStudentSerializer(serializers.ModelSerializer):
    """Exam + questions for a student to take — no answers revealed."""
    questions      = QuestionPublicSerializer(many=True, read_only=True)
    question_count = serializers.ReadOnlyField()
    total_marks    = serializers.ReadOnlyField()

    class Meta:
        model  = Exam
        fields = ('id', 'title', 'description', 'duration_minutes',
                  'question_count', 'total_marks', 'questions')


class ExamWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Exam
        fields = ('id', 'title', 'description', 'duration_minutes',
                  'pass_percentage', 'is_active')


class AnswerInputSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    choice_id   = serializers.IntegerField(allow_null=True)


class SubmitExamSerializer(serializers.Serializer):
    answers = AnswerInputSerializer(many=True)


class SubmissionSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source='exam.title', read_only=True)

    class Meta:
        model  = Submission
        fields = ('id', 'exam', 'exam_title', 'student_id', 'student_name',
                  'status', 'started_at', 'submitted_at')

