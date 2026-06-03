# Flask Application Deployment on Kubernetes using Docker and AWS ECR

## Project Overview

This project demonstrates the end-to-end deployment of a Python Flask application on a self-managed Kubernetes cluster created using kubeadm on AWS EC2 instances.

The application is containerized using Docker, stored in Amazon ECR, and deployed to Kubernetes using Deployments and Services.

This project was built as part of my DevOps learning journey to gain hands-on experience with:

- Docker
- AWS ECR
- Kubernetes
- Deployments
- Services
- Secrets
- Resource Management
- Health Checks
- Troubleshooting

---

## Architecture

```text
Developer
    │
    ▼
Docker Build
    │
    ▼
Docker Image
    │
    ▼
Amazon ECR
    │
    ▼
Kubernetes Deployment
    │
    ▼
Pods (5 Replicas)
    │
    ▼
NodePort Service
    │
    ▼
Browser
```

---

## Technologies Used

| Technology | Purpose |
|------------|----------|
| Python Flask | Web Application |
| Docker | Containerization |
| Amazon ECR | Container Registry |
| Kubernetes | Container Orchestration |
| kubeadm | Kubernetes Cluster Setup |
| containerd | Container Runtime |
| Calico | Kubernetes Networking |
| AWS EC2 | Infrastructure |

---

## Project Structure

```text
.
├── app.py
├── requirements.txt
├── Dockerfile
├── deployment.yaml
├── service.yaml
└── README.md
```

---

## Step 1: Build Docker Image

Build the Docker image locally:

```bash
docker build -t myapp:v1 .
```

Verify:

```bash
docker images
```

---

## Step 2: Push Image to Amazon ECR

### Login to ECR

```bash
aws ecr get-login-password \
--region ap-south-1 | \
docker login \
--username AWS \
--password-stdin \
<ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com
```

### Tag Image

```bash
docker tag myapp:v1 \
<ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/my-registry1:v1
```

### Push Image

```bash
docker push \
<ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/my-registry1:v1
```

---

## Step 3: Create Kubernetes Secret

Since Amazon ECR is a private registry, create an image pull secret:

```bash
kubectl create secret docker-registry ecr-secret \
--docker-server=<ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com \
--docker-username=AWS \
--docker-password=$(aws ecr get-login-password --region ap-south-1)
```

---

## Step 4: Deploy Application

Apply Deployment:

```bash
kubectl apply -f deployment.yaml
```

Verify:

```bash
kubectl get pods
```

---

## Step 5: Expose Application

Apply Service:

```bash
kubectl apply -f service.yaml
```

Verify:

```bash
kubectl get svc
```

Access:

```text
http://<Worker-Node-Public-IP>:30080
```

---

## Kubernetes Features Implemented

### Deployment

- Replica Management
- Self-Healing
- Rolling Updates

### Service

- NodePort Service
- Load Balancing Across Pods

### Resource Management

```yaml
resources:
  requests:
    cpu: "100m"
    memory: "64Mi"
  limits:
    cpu: "250m"
    memory: "128Mi"
```

### Health Checks

#### Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /readyz
    port: 8080
```

#### Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
```

---

## Kubernetes Commands Used

Check Pods:

```bash
kubectl get pods -o wide
```

Describe Pod:

```bash
kubectl describe pod <pod-name>
```

View Logs:

```bash
kubectl logs <pod-name>
```

Check Services:

```bash
kubectl get svc
```

Check Endpoints:

```bash
kubectl get endpoints
```

Scale Deployment:

```bash
kubectl scale deployment demo-app --replicas=5
```

---

## Challenges Faced and Troubleshooting

### ImagePullBackOff

Issue:

```text
pull access denied
no basic auth credentials
```

Resolution:

- Created imagePullSecret
- Updated Deployment to use imagePullSecrets

---

### Docker Push Authentication Issues

Issue:

```text
403 Forbidden
```

Root Cause:

- Docker login was performed using a non-root user.
- Docker push was executed using sudo.
- Docker credentials were stored in different user profiles.

Resolution:

- Logged into ECR using the same user context used for Docker push.

---

### Kubernetes Networking Investigation

Observed intermittent connectivity while accessing the application through NodePort.

Troubleshooting performed:

- Verified Service configuration
- Verified Endpoints
- Checked Readiness and Liveness probes
- Switched from Flask Development Server to Gunicorn
- Investigated Calico networking and BGP status

Further investigation planned in future projects. If you find solution for the issue please add the solution in this readme section and create a pull request.

---

## Learning Outcomes

Through this project I learned:

- Docker image creation
- Docker image tagging
- Amazon ECR repositories and image versions
- Kubernetes Deployments
- Kubernetes Services
- NodePort networking
- Readiness and Liveness probes
- Resource Requests and Limits
- ImagePullSecrets
- Kubernetes troubleshooting methodology
- Container runtime concepts (Docker vs containerd)

---

## Author

Manoj Kumar Bodula

DevOps Engineer | AWS | Docker | Kubernetes
