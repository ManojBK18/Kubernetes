from django.db import models


class Result(models.Model):
    submission_id = models.IntegerField(unique=True)
    exam_id       = models.IntegerField()
    exam_title    = models.CharField(max_length=200)
    student_id    = models.IntegerField()
    student_name  = models.CharField(max_length=150)
    total_marks   = models.IntegerField()
    obtained_marks = models.IntegerField()
    percentage    = models.FloatField()
    passed        = models.BooleanField()
    calculated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'results'
        ordering = ['-calculated_at']

    def __str__(self):
        return f"{self.student_name} — {self.exam_title} — {self.percentage:.1f}%"

    @property
    def grade(self):
        if self.percentage >= 90:  return 'A+'
        if self.percentage >= 80:  return 'A'
        if self.percentage >= 70:  return 'B'
        if self.percentage >= 60:  return 'C'
        if self.percentage >= 50:  return 'D'
        return 'F'
