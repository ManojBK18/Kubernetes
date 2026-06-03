FROM python:3.12-slim

WORKDIR /app

RUN pip install flask
RUN pip install gunicorn

COPY app.py .

EXPOSE 8080

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8080", "app:app"]






