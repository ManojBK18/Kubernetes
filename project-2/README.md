# ExamPortal — Multi-Service Kubernetes Application

A fully functional online assessment platform built as microservices, designed for deploying on Kubernetes.

## Architecture

```
                        ┌─────────────────────────────────────────┐
                        │           Ingress (nginx)                │
                        │  /api/auth   /api/exams   /api/results   │
                        └──────┬──────────┬──────────┬────────────┘
                               │          │          │
              ┌────────────────▼─┐  ┌─────▼──────┐  ┌▼──────────────┐
              │   auth-service   │  │exam-service│  │result-service │
              │   (Django/DRF)   │  │(Django/DRF)│  │ (Django/DRF)  │
              │   Port: 8000     │  │ Port: 8000 │  │  Port: 8000   │
              └────────┬─────────┘  └─────┬──────┘  └──────┬────────┘
                       │                  │                 │
                       └──────────────────┼─────────────────┘
                                          │
                              ┌───────────▼────────────┐
                              │  PostgreSQL StatefulSet │
                              │  auth_db / exam_db /   │
                              │  result_db             │
                              └────────────────────────┘

       ┌──────────────┐
       │   Frontend   │  React + Vite → nginx (Port 80)
       │  (NodePort)  │  Served at http://localhost:30090
       └──────────────┘
```

## Services

| Service        | Role                                     | Port | Replicas |
|----------------|------------------------------------------|------|----------|
| auth-service   | Users, login, JWT issuance               | 8000 | 2–6      |
| exam-service   | Exams, questions, submissions            | 8000 | 2–8      |
| result-service | Scoring, results, leaderboard            | 8000 | 2–6      |
| frontend       | React SPA served by nginx                | 80   | 2        |
| postgres       | Shared DB with 3 schemas                 | 5432 | 1        |

## User Roles

| Role    | Can do                                                         |
|---------|----------------------------------------------------------------|
| Admin   | All of the below + manage users                                |
| Teacher | Create exams, add MCQ questions, view results for their exams  |
| Student | Take active exams, view own results                            |

## Quick Start

### 1. Build all images

```bash
# If using kind
docker build -t exam-app/auth-service:latest   ./auth-service
docker build -t exam-app/exam-service:latest   ./exam-service
docker build -t exam-app/result-service:latest ./result-service
docker build -t exam-app/frontend:latest        ./frontend

kind load docker-image exam-app/auth-service:latest
kind load docker-image exam-app/exam-service:latest
kind load docker-image exam-app/result-service:latest
kind load docker-image exam-app/frontend:latest

# If using minikube
eval $(minikube docker-env)
# then run the docker build commands above
```

### 2. Deploy to Kubernetes

```bash
# Namespace first
kubectl apply -f k8s/namespace.yaml

# Secrets and config
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml

# Database
kubectl apply -f k8s/postgres/init-configmap.yaml
kubectl apply -f k8s/postgres/statefulset.yaml
kubectl apply -f k8s/postgres/service.yaml

# Wait for postgres to be ready
kubectl wait --for=condition=ready pod/postgres-0 -n exam-app --timeout=120s

# Backend services
kubectl apply -f k8s/auth-service/
kubectl apply -f k8s/exam-service/
kubectl apply -f k8s/result-service/

# Frontend
kubectl apply -f k8s/frontend/

# Ingress (requires nginx ingress controller)
kubectl apply -f k8s/ingress.yaml

# HPA (requires metrics-server)
kubectl apply -f k8s/hpa.yaml
```

### 3. Access the app

```bash
# Via NodePort (always works)
http://localhost:30090

# Via Ingress (after ingress controller is set up)
# kind: forward the ingress controller port
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8080:80
# then visit http://localhost:8080

# minikube
minikube service frontend-svc -n exam-app
```

### 4. Default credentials

```
Admin:  admin / admin123   (auto-created on first auth-service start)
```

---

## Useful kubectl commands

```bash
# Watch all pods
kubectl get pods -n exam-app -w

# Check logs for a service
kubectl logs -n exam-app -l app=exam-service -f

# Scale a service manually
kubectl scale deployment exam-service --replicas=4 -n exam-app

# Exec into a pod
kubectl exec -it -n exam-app deploy/auth-service -- /bin/sh

# Rolling restart (e.g. after config change)
kubectl rollout restart deployment/auth-service -n exam-app

# Watch HPA
kubectl get hpa -n exam-app -w

# See resource usage
kubectl top pods -n exam-app

# Check ingress
kubectl describe ingress exam-app-ingress -n exam-app
```

## API Reference

### Auth Service  `/api/auth/`
| Method | Endpoint         | Access  | Description          |
|--------|-----------------|---------|----------------------|
| POST   | /register/       | Public  | Create account        |
| POST   | /login/          | Public  | Get JWT tokens        |
| GET    | /me/             | Any     | Current user profile  |
| GET    | /users/          | Admin   | List all users        |
| DELETE | /users/<id>/     | Admin   | Delete user           |

### Exam Service  `/api/exams/`
| Method | Endpoint                        | Access          |
|--------|---------------------------------|-----------------|
| GET    | /                               | Any             |
| POST   | /                               | Teacher / Admin |
| GET    | /<id>/                          | Any             |
| PATCH  | /<id>/                          | Teacher / Admin |
| DELETE | /<id>/                          | Teacher / Admin |
| GET    | /<id>/questions/                | Any             |
| POST   | /<id>/questions/                | Teacher / Admin |
| POST   | /<id>/start/                    | Student         |
| POST   | /<id>/submit/                   | Student         |
| GET    | /my-submissions/                | Student         |
| GET    | /submissions/                   | Teacher / Admin |

### Result Service  `/api/results/`
| Method | Endpoint                      | Access          |
|--------|-------------------------------|-----------------|
| GET    | /list/                        | Any (filtered)  |
| GET    | /<id>/                        | Any (own only for student) |
| GET    | /submission/<id>/             | Any             |
| GET    | /leaderboard/?exam_id=<id>    | Any             |

## File Structure

```
exam-app/
├── auth-service/          Django — users, JWT
├── exam-service/          Django — exams, questions, submissions
├── result-service/        Django — scoring, results
├── frontend/              React + Vite — SPA served by nginx
└── k8s/
    ├── namespace.yaml
    ├── secrets.yaml
    ├── configmap.yaml
    ├── hpa.yaml
    ├── ingress.yaml
    ├── postgres/          StatefulSet + headless service
    ├── auth-service/      Deployment + Service
    ├── exam-service/      Deployment + Service
    ├── result-service/    Deployment + Service
    └── frontend/          Deployment + NodePort Service
```
