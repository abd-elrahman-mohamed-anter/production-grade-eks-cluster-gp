# Web Application for Automated Vulnerability Scanning Based on Cloud Architecture

### AWS · Docker · Nginx · EC2 · Terraform · Kubernetes (EKS) · PostgreSQL · OWASP ZAP · CloudWatch

---

## Overview

This graduation project focuses on building a cloud-based platform for automated web vulnerability assessment using OWASP ZAP.

The project was implemented using **two deployment approaches**, allowing comparison between a traditional containerized deployment model and a modern cloud-native Kubernetes architecture.

### 🚀 Approach 1 — EC2-Based Containerized Architecture

A highly available AWS deployment built using:

- Amazon EC2
- Docker
- Nginx Reverse Proxy
- Application Load Balancer (ALB)
- PostgreSQL
- Amazon EBS
- Amazon CloudWatch
- OWASP ZAP

📖 **Documentation:** [View EC2 Architecture](docs/ec2-architecture.md)

---

### ☸️ Approach 2 — Cloud-Native Kubernetes Architecture

A fully automated Infrastructure-as-Code deployment built using:

- Terraform
- Amazon EKS
- Kubernetes
- Amazon EBS CSI Driver
- CloudWatch Container Insights
- OWASP ZAP

📖 **Documentation:** [View EKS Architecture](tf/README.md)

---

## Architecture Evolution

```text
Approach 1
EC2 + Docker + Nginx + ALB
            │
            ▼
  Lessons Learned
  • Manual container management
  • Higher operational overhead
  • Limited orchestration capabilities
            │
            ▼
Approach 2
Terraform + EKS + Kubernetes
```

---

## Why Two Approaches?

The goal of this project was not only to build a vulnerability scanning platform but also to evaluate different deployment models and cloud architectures.

The first implementation focused on traditional container hosting using EC2 and Docker.

After successfully deploying and operating the platform, the architecture was redesigned using Kubernetes and Infrastructure as Code to improve:

- Automation
- Scalability
- Maintainability
- Observability
- Infrastructure reproducibility

This allowed practical comparison between traditional AWS deployments and cloud-native Kubernetes environments.

---

## Architecture Comparison

| Category | Approach 1 (EC2) | Approach 2 (EKS) |
|-----------|-----------|-----------|
| Compute | EC2 Instances | Amazon EKS |
| Container Runtime | Docker | Kubernetes |
| Reverse Proxy | Nginx | Kubernetes Services |
| Provisioning | Manual / Partial Automation | Terraform |
| Service Discovery | Host-Based Routing | Kubernetes Native |
| Storage | Amazon EBS | EBS CSI Driver |
| Monitoring | CloudWatch | CloudWatch Container Insights |
| Security Scanning | OWASP ZAP | OWASP ZAP |
| Scaling | EC2-Based Scaling | Kubernetes Node Groups |
| Infrastructure as Code | Limited | Full Terraform |
| Operational Overhead | Higher | Lower |
| Cloud-Native Features | Limited | Extensive |

---

## Technologies Used

### Cloud

- AWS EC2
- AWS VPC
- AWS ALB
- AWS EKS
- AWS EBS
- AWS IAM
- AWS CloudWatch

### Infrastructure as Code

- Terraform

### Containers & Orchestration

- Docker
- Kubernetes

### Security

- OWASP ZAP

### Monitoring

- Amazon CloudWatch
- CloudWatch Container Insights

### Database

- PostgreSQL

### Networking

- VPC
- Public & Private Subnets
- Internet Gateway
- NAT Gateway
- Security Groups
- Load Balancers

---

## Key Learnings

- AWS Networking and Multi-AZ Design
- Docker Containerization
- Nginx Reverse Proxy Configuration
- Application Load Balancer Integration
- Kubernetes Workload Management
- Infrastructure as Code with Terraform
- Amazon EKS Administration
- Persistent Storage with EBS
- OWASP ZAP Automation
- Cloud Monitoring and Observability
- DevOps and DevSecOps Best Practices

---

## Project Structure

```text
.
├── README.md
├── docs/
│   └── ec2-architecture.md
├── tf/
│   ├── README.md
│   ├── network.tf
│   ├── eks.tf
│   ├── variables.tf
│   └── ...
├── Screens/
└── ...
```

---

## Documentation

### 🚀 EC2-Based Architecture

📖 [Open Documentation](docs/ec2-architecture.md)

### ☸️ Kubernetes-Based Architecture

📖 [Open Documentation](tf/README.md)

---

## Graduation Project

**Web Application for Automated Vulnerability Scanning Based on Cloud Architecture**

**Grade:** Excellent

**Department of Electronics and Communications Engineering**

**Tanta University — 2026**

---

*Abdelrahman Mohamed*
