# Kubernetes Cluster Setup Using kubeadm on AWS EC2

## Overview

This guide explains how to build a Kubernetes cluster manually using `kubeadm` on AWS EC2 instances.

The goal is not only to install Kubernetes but also to understand:

- Why each component is needed
- How Kubernetes internally works
- How nodes communicate
- What happens during cluster initialization
- How containers are actually started

---

# Architecture

We will create:

| Node Type | Purpose |
|---|---|
| Control Plane Node | Manages the Kubernetes cluster |
| Worker Nodes | Run application workloads |

Example setup:

```text
                    Internet
                        |
                 Security Group
                        |
        ---------------------------------
        |                               |
   Control Plane                 Worker Nodes
      EC2                            EC2
```

---

# What Kubernetes Actually Is

Kubernetes is a container orchestration platform.

Its main job is to:

- Deploy applications
- Scale applications
- Restart failed containers
- Manage networking
- Manage cluster state
- Distribute workloads across servers

Kubernetes itself does NOT run containers.

Instead:

```text
Kubernetes = Orchestrator
containerd = Container Runtime
```

Kubernetes decides WHAT should run.

containerd actually runs the containers.

---

# Prerequisites

## AWS Requirements

You need:

- AWS account
- EC2 access
- Key pair (.pem)
- Basic Linux knowledge

---

# EC2 Instance Requirements

Recommended:

| Node | Instance Type | Recommended |
|---|---|---|
| Control Plane | t3.medium | 2 vCPU, 4GB RAM |
| Worker Node | t3.medium | 2 vCPU, 4GB RAM |

Operating System:

- Ubuntu Server 22.04 LTS

---

# Step 1 — Create EC2 Instances

Create:

- 1 Master Node
- 2 Worker Nodes

Suggested names:

```text
k8s-master
k8s-worker1
k8s-worker2
```

---

# Why We Need Multiple Nodes

Kubernetes separates responsibilities.

## Control Plane

Acts as the brain of the cluster.

Responsibilities:

- Accept API requests
- Store cluster state
- Schedule pods
- Monitor cluster health

## Worker Nodes

Responsible for:

- Running application containers
- Hosting pods
- Executing workloads

---

# Step 2 — Configure Security Groups

Kubernetes nodes constantly communicate.

Required ports:

| Port | Purpose |
|---|---|
| 22 | SSH |
| 6443 | Kubernetes API Server |
| 2379-2380 | etcd database |
| 10250 | kubelet |
| 10257 | Controller Manager |
| 10259 | Scheduler |
| 30000-32767 | NodePort Services |

For learning environments:

Allow ALL traffic between cluster nodes.

---

# Why Security Groups Matter

Worker nodes must contact the control plane.

Example:

```text
Worker kubelet
      ↓
API Server:6443
```

If port 6443 is blocked:

- Nodes cannot join cluster
- kubeadm join fails
- kubectl cannot manage nodes

---

# Step 3 — Connect to EC2 Instances

SSH into each node:

```bash
ssh -i mykey.pem ubuntu@<public-ip>
```

---

# Step 4 — Update Linux Packages

```bash
sudo apt update && sudo apt upgrade -y
```

## Why?

This updates:

- Security patches
- Linux packages
- Dependencies

Ensures stable environment before installing Kubernetes.

---

# Step 5 — Disable Swap

```bash
sudo swapoff -a
```

Permanent disable:

```bash
sudo sed -i '/ swap / s/^/#/' /etc/fstab
```

---

# What Is Swap?

Linux uses swap when RAM becomes full.

Example:

```text
RAM Full
   ↓
Move memory pages to disk
```

Kubernetes requires accurate memory tracking.

If swap exists:

- Memory calculations become unreliable
- Pod scheduling issues occur
- kubelet may fail

Kubernetes requires:

```text
swap = OFF
```

---

# Step 6 — Enable Kernel Modules

Create module configuration:

```bash
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
```

Load modules:

```bash
sudo modprobe overlay
sudo modprobe br_netfilter
```

---

# Why These Modules Are Needed

## overlay

Containers use layered filesystems.

Example:

```text
Ubuntu Base Layer
    + Python Layer
    + Application Layer
```

overlay filesystem efficiently combines layers.

---

## br_netfilter

Allows Linux bridge traffic through iptables.

Kubernetes networking relies heavily on:

- virtual bridges
- packet forwarding
- firewall rules

Without this module:

```text
Pods may not communicate properly
```

---

# Step 7 — Configure Sysctl Parameters

```bash
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF
```

Apply settings:

```bash
sudo sysctl --system
```

---

# Why These Settings Matter

## IP Forwarding

Kubernetes networking works by routing packets between:

- pods
- nodes
- services

Linux must allow packet forwarding.

Without it:

```text
Pods on different nodes cannot communicate
```

---

# Step 8 — Install Container Runtime (containerd)

Install dependencies:

```bash
sudo apt install -y curl gnupg2 software-properties-common apt-transport-https ca-certificates
```

Add Docker repository:

```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
```

```bash
echo \
"deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
https://download.docker.com/linux/ubuntu \
$(lsb_release -cs) stable" | \
sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

Install containerd:

```bash
sudo apt update
sudo apt install -y containerd.io
```

---

# What Is containerd?

containerd is the actual software that runs containers.

Kubernetes does NOT directly start containers.

Flow:

```text
Kubernetes
    ↓
kubelet
    ↓
containerd
    ↓
Linux containers
```

containerd responsibilities:

- Pull container images
- Create namespaces
- Allocate cgroups
- Start containers
- Manage container lifecycle

---

# Why Not Docker?

Earlier Kubernetes used Docker.

Old architecture:

```text
Kubernetes → Docker
```

Modern architecture:

```text
Kubernetes → containerd
```

Reasons:

- Lightweight
- Faster
- Native Kubernetes integration
- Better performance

---

# Step 9 — Configure containerd

Create config directory:

```bash
sudo mkdir -p /etc/containerd
```

Generate config:

```bash
containerd config default | sudo tee /etc/containerd/config.toml
```

Enable systemd cgroup driver:

```bash
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
```

Restart service:

```bash
sudo systemctl restart containerd
sudo systemctl enable containerd
```

---

# Why SystemdCgroup Is Important

Linux manages resources using cgroups.

Kubernetes and containerd must use the SAME cgroup driver.

Modern Ubuntu uses:

```text
systemd
```

If drivers mismatch:

- kubelet errors occur
- node instability happens
- resource tracking fails

---

# Step 10 — Install Kubernetes Components

Add Kubernetes GPG key:

```bash
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key | \
sudo gpg --dearmor -o /usr/share/keyrings/kubernetes-apt-keyring.gpg
```

Add repository:

```bash
echo 'deb [signed-by=/usr/share/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.30/deb/ /' | \
sudo tee /etc/apt/sources.list.d/kubernetes.list
```

Update packages:

```bash
sudo apt update
```

Install Kubernetes tools:

```bash
sudo apt install -y kubelet kubeadm kubectl
```

Hold versions:

```bash
sudo apt-mark hold kubelet kubeadm kubectl
```

---

# Understanding Kubernetes Components

## kubeadm

Purpose:

```text
Cluster bootstrap tool
```

Responsibilities:

- Initializes cluster
- Generates certificates
- Configures control plane
- Creates Kubernetes manifests

Think of kubeadm as:

```text
Kubernetes installer
```

---

## kubelet

Runs on EVERY node.

Acts as node agent.

Responsibilities:

- Talks to API server
- Watches assigned pods
- Ensures containers run correctly

Flow:

```text
API Server
    ↓
kubelet
    ↓
containerd
```

---

## kubectl

CLI tool used by administrators.

Examples:

```bash
kubectl get nodes
kubectl get pods
kubectl describe pod nginx
```

kubectl communicates with API server.

---

# Step 11 — Initialize Control Plane

Run ONLY on master node:

```bash
sudo kubeadm init \
--apiserver-advertise-address=<MASTER_PRIVATE_IP> \
--pod-network-cidr=192.168.0.0/16
```

Example:

```bash
sudo kubeadm init \
--apiserver-advertise-address=172.31.5.150 \
--pod-network-cidr=192.168.0.0/16
```

---

# What Happens During kubeadm init?

kubeadm installs:

| Component | Purpose |
|---|---|
| API Server | Entry point of cluster |
| etcd | Cluster database |
| Scheduler | Chooses worker nodes |
| Controller Manager | Maintains desired state |

---

# Understanding Control Plane Components

## API Server

Heart of Kubernetes.

ALL communication goes through API server.

Example:

```text
kubectl → API Server
```

Even internal components communicate through it.

---

## etcd

Distributed key-value database.

Stores:

- Pods
- Deployments
- Services
- Secrets
- Nodes
- Cluster state

Think of etcd as:

```text
Kubernetes memory
```

---

## Scheduler

Chooses which worker node should run pods.

Checks:

- CPU availability
- Memory
- Node conditions
- Affinity rules
- Taints and tolerations

---

## Controller Manager

Maintains desired state.

Example:

You request:

```text
3 nginx pods
```

If one pod crashes:

```text
Controller creates new pod automatically
```

---

# Step 12 — Configure kubectl Access

After initialization:

```bash
mkdir -p $HOME/.kube
```

```bash
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
```

```bash
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

---

# Why This Is Needed

kubectl needs cluster credentials.

The file:

```text
/etc/kubernetes/admin.conf
```

contains:

- cluster endpoint
- certificates
- authentication info

Copying it allows kubectl to communicate securely with API server.

---

# Step 13 — Install Pod Network (Calico)

Install Calico:

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/calico.yaml
```

---

# Why Networking Plugin Is Required

By default:

```text
Pods on different nodes cannot communicate
```

Kubernetes requires a CNI plugin.

We use:

```text
Calico
```

---

# What Calico Does

Calico:

- Creates pod networking
- Assigns pod IP addresses
- Enables pod-to-pod communication
- Manages network policies

Example:

```text
Pod A (Worker1)
      ↔
Pod B (Worker2)
```

---

# Understanding Pod CIDR

We used:

```text
192.168.0.0/16
```

This becomes the pod IP range.

Example:

```text
Pod1 → 192.168.1.5
Pod2 → 192.168.2.8
```

Every pod gets its own IP address.

---

# Step 14 — Join Worker Nodes

After kubeadm init completes, it generates a join command:

```bash
kubeadm join 172.31.5.150:6443 \
--token abcdef.1234567890abcdef \
--discovery-token-ca-cert-hash sha256:xxxxxxxx
```

Run this command on worker nodes.

---

# What Happens During kubeadm join?

Worker node:

1. Contacts API server
2. Verifies cluster certificate
3. Registers itself
4. Starts kubelet
5. Becomes part of cluster

Flow:

```text
Worker kubelet
      ↓
API Server
      ↓
Cluster registration
```

---

# Step 15 — Verify Cluster

Run on master:

```bash
kubectl get nodes
```

Expected:

```text
NAME            STATUS   ROLES           AGE
k8s-master      Ready    control-plane
k8s-worker1     Ready    <none>
k8s-worker2     Ready    <none>
```

---

# Step 16 — Deploy Test Application

Create nginx deployment:

```bash
kubectl create deployment nginx --image=nginx
```

Expose deployment:

```bash
kubectl expose deployment nginx --port=80 --type=NodePort
```

Check service:

```bash
kubectl get svc
```

Example:

```text
80:31245/TCP
```

Access application:

```text
http://<worker-public-ip>:31245
```

---

# Understanding Kubernetes Objects

## Deployment

Defines:

- Desired number of replicas
- Container image
- Update strategy

Deployment manages ReplicaSets.

---

## ReplicaSet

Ensures required number of pods always exist.

Example:

```text
Desired: 3 pods
Current: 2 pods
```

ReplicaSet automatically creates another pod.

---

## Pod

Smallest deployable Kubernetes unit.

Contains:

- one or more containers
- shared network
- shared storage

---

## Service

Provides stable networking for pods.

Pods are temporary.

Their IPs change.

Service gives stable endpoint.

Flow:

```text
Client
   ↓
Service
   ↓
Pods
```

---

## NodePort

Exposes service externally.

Kubernetes opens a port between:

```text
30000-32767
```

Traffic flow:

```text
Browser
   ↓
WorkerNodeIP:NodePort
   ↓
Service
   ↓
Pod
```

---

# Overall Kubernetes Request Flow

```text
kubectl
   ↓
API Server
   ↓
etcd stores cluster state
   ↓
Scheduler chooses worker node
   ↓
kubelet receives instructions
   ↓
containerd starts containers
   ↓
Calico enables networking
```

---

# Common Troubleshooting

# Worker Node Stuck During Join

Check kubelet:

```bash
sudo systemctl status kubelet
```

View logs:

```bash
journalctl -u kubelet -f
```

---

# Verify containerd

```bash
sudo systemctl status containerd
```

Must show:

```text
active (running)
```

---

# Verify Swap

```bash
free -h
```

Swap must be:

```text
0B
```

---

# Reset Failed Node Join

```bash
sudo kubeadm reset -f
```

Restart services:

```bash
sudo systemctl restart containerd
sudo systemctl restart kubelet
```

Generate new join command on master:

```bash
kubeadm token create --print-join-command
```

---

# Useful Kubernetes Commands

Get nodes:

```bash
kubectl get nodes
```

Get pods:

```bash
kubectl get pods -A
```

Describe pod:

```bash
kubectl describe pod <pod-name>
```

View logs:

```bash
kubectl logs <pod-name>
```

Cluster information:

```bash
kubectl cluster-info
```

---

# Production Concepts To Learn Next

After kubeadm basics, learn:

1. Pods
2. Deployments
3. Services
4. Ingress
5. ConfigMaps
6. Secrets
7. Persistent Volumes
8. Helm
9. Autoscaling
10. Monitoring
11. Prometheus
12. Grafana
13. EKS
14. StatefulSets
15. DaemonSets

---

# Final Understanding

Kubernetes is essentially:

```text
A distributed system that manages containers across multiple servers.
```

Key flow:

```text
User Request
     ↓
kubectl
     ↓
API Server
     ↓
Scheduler
     ↓
kubelet
     ↓
containerd
     ↓
Running Containers
```

The cluster continuously ensures:

```text
Desired State = Actual State
```

That is the core philosophy of Kubernetes.

