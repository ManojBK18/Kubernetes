from django.db import models


class Exam(models.Model):
    title            = models.CharField(max_length=200)
    description      = models.TextField(blank=True)
    duration_minutes = models.PositiveIntegerField(default=60)
    pass_percentage  = models.PositiveIntegerField(default=60)
    is_active        = models.BooleanField(default=True)
    created_by_id    = models.IntegerField()          # user_id from auth-service
    created_by_name  = models.CharField(max_length=150)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table  = 'exams'
        ordering  = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def total_marks(self):
        return sum(q.marks for q in self.questions.all())

    @property
    def question_count(self):
        return self.questions.count()


class Question(models.Model):
    exam  = models.ForeignKey(Exam, related_name='questions', on_delete=models.CASCADE)
    text  = models.TextField()
    marks = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'questions'
        ordering = ['order', 'id']

    def __str__(self):
        return self.text[:80]


class Choice(models.Model):
    question   = models.ForeignKey(Question, related_name='choices', on_delete=models.CASCADE)
    text       = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)

    class Meta:
        db_table = 'choices'

    def __str__(self):
        return f"{'✓' if self.is_correct else '✗'} {self.text[:60]}"


class Submission(models.Model):
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_SUBMITTED   = 'submitted'
    STATUS_CHOICES     = [
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_SUBMITTED,   'Submitted'),
    ]

    exam         = models.ForeignKey(Exam, on_delete=models.CASCADE)
    student_id   = models.IntegerField()
    student_name = models.CharField(max_length=150)
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_IN_PROGRESS)
    started_at   = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table        = 'submissions'
        unique_together = [('exam', 'student_id')]   # one attempt per student per exam

    def __str__(self):
        return f"{self.student_name} — {self.exam.title}"


class Answer(models.Model):
    submission      = models.ForeignKey(Submission, related_name='answers', on_delete=models.CASCADE)
    question        = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_choice = models.ForeignKey(Choice, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        db_table        = 'answers'
        unique_together = [('submission', 'question')]

