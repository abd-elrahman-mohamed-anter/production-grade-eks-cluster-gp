# Cloud Infrastructure & Deployment
### AWS · Terraform · Kubernetes (EKS) · OWASP ZAP · CloudWatch

---

## Overview

Production-grade AWS infrastructure built with Terraform and Kubernetes (EKS). Everything is defined as code and provisioned with a single `terraform apply` — no clicking through consoles, fully reproducible.

The setup runs across two Availability Zones inside a private/public subnet split. Worker nodes are never exposed to the internet — only the ALB is. Three workloads run inside the cluster: the backend app, PostgreSQL on EBS persistent storage, and OWASP ZAP for dynamic security testing. All monitored via CloudWatch Container Insights.

---

## Architecture

> 📸 *Cloud Architecture Diagram*

> 📸 *Kubernetes Cluster Architecture*

VPC (10.0.0.0/16) across two AZs, each with a public and private subnet. ALB in public subnets forwards to worker nodes via NodePort. Pods communicate internally over ClusterIP — the database and ZAP are never reachable from outside the cluster.

---

## Infrastructure

### Networking

| Component | Value |
|---|---|
| VPC | `10.0.0.0/16` |
| Public Subnets | `10.0.1.0/24` (AZ-a) · `10.0.2.0/24` (AZ-b) |
| Private Subnets | `10.0.3.0/24` (AZ-a) · `10.0.4.0/24` (AZ-b) |
| Internet Gateway | Inbound internet access |
| NAT Gateway | One per AZ — outbound-only for private nodes |
| Load Balancer | ALB in public subnets — sole external entry point |
| Security Group | Ports 80, 443 inbound |

### EKS Cluster

| Setting | Value |
|---|---|
| Cluster Name | `zap-cluster` |
| Kubernetes Version | `1.29` |
| Node Instance Type | `t3.small` |
| Node Count | Min: 1 · Desired: 2 · Max: 3 |
| Node Subnets | Private (AZ-a, AZ-b) |
| Endpoint Access | Public (kubectl) + Private (internal) |

> 📸 *EKS Console — zap-cluster active*

### Storage & IAM

Stateful workloads use PVCs backed by EBS gp3 volumes, automatically provisioned by the EBS CSI Driver. Data persists across pod restarts and node failures.

| Workload | Size | Access Mode |
|---|---|---|
| PostgreSQL | 10Gi | ReadWriteOnce |
| ZAP Reports | 5Gi | ReadWriteOnce |

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

Three IAM roles: `eks-cluster-role` (control plane), `node-group-role` (worker nodes — ECR read + VPC CNI), `ebs-csi-role` (EBS provisioning).

---

## Kubernetes Workloads

All workloads run under the `zap-project` namespace.

| Workload | Image | Port | Controller |
|---|---|---|---|
| Backend App | `abdoomohamed/final-v1-app` | 5000 | Deployment |
| PostgreSQL | `postgres:15-alpine` | 5432 | StatefulSet |
| OWASP ZAP | `ghcr.io/zaproxy/zaproxy:latest` | 8080 | Deployment |

The app is exposed via NodePort through the ALB. PostgreSQL and ZAP are ClusterIP only — internal to the cluster.

| Service | Type | Port | NodePort |
|---|---|---|---|
| `zap-app-service` | NodePort | 5000 | 30080 |
| `postgres` | ClusterIP | 5432 | — |
| `zap` | ClusterIP | 8080 | — |

> 📸 *kubectl get all -n zap-project*

---

## Traffic Flow

```
User → IGW → ALB (port 80) → NodePort 30080 → App Pod (port 5000)
                                                     ├── PostgreSQL (port 5432)
                                                     └── OWASP ZAP (port 8080)
```

The ALB spans both AZs — if one goes down, traffic automatically shifts to the other with no intervention needed.

---

## Security Testing — OWASP ZAP

ZAP runs inside the cluster, called by the backend via internal DNS (`http://zap:8080`) — nothing exposed externally. Runs passive scans (missing headers, insecure cookies), active scans (SQLi, XSS, command injection), and a spider crawl to map all endpoints first.

**Findings from the current deployment:**

| Finding | Severity |
|---|---|
| No HTTPS/TLS | 🔴 High |
| Missing `X-Content-Type-Options` | 🟡 Medium |
| Missing `X-Frame-Options` | 🟡 Medium |
| No Content Security Policy | 🟡 Medium |
| Server version disclosure | 🟢 Low |

TLS is the top priority fix — in production it would be terminated at the ALB using AWS Certificate Manager (ACM).

---

## Monitoring — CloudWatch

CloudWatch Container Insights set up via Terraform — `amazon-cloudwatch-observability` addon on the cluster, collecting CPU/memory, pod restarts, network I/O, and container logs in real time.

> 📸 *CloudWatch Container Insights dashboard*

> 📸 *Namespace-level metrics — zap-cluster*

Current status: 15 pods running · CPU 39% · Memory 42% · No alarms.

---

## Terraform

```
terraform/
├── provider.tf    # AWS provider + version pin
├── variables.tf   # Cluster name, region, instance type, node count
├── network.tf     # VPC, subnets, IGW, NAT Gateways, route tables, ALB
├── eks.tf         # EKS cluster, node groups, IAM roles, EBS CSI addon
└── outputs.tf     # ALB DNS, cluster endpoint, kubectl command
```

Terraform handles the dependency ordering automatically — NAT Gateways before route tables, cluster before node groups, node groups before the EBS CSI addon.

```bash
terraform init
terraform plan
terraform apply
```

> 📸 *terraform apply output — 18 resources added*

---

## Deployment

```bash
# 1. Provision infrastructure
terraform init && terraform plan && terraform apply

# 2. Connect kubectl
aws eks update-kubeconfig --region us-east-1 --name zap-cluster

# 3. Install EBS CSI Driver
aws eks create-addon \
  --cluster-name zap-cluster \
  --addon-name aws-ebs-csi-driver \
  --region us-east-1

# 4. Deploy workloads
kubectl apply -f namespace.yaml
kubectl apply -f storagegb3.yaml
kubectl apply -f postgres.yaml
kubectl apply -f zap.yaml
kubectl apply -f app.yaml
kubectl apply -f app-service.yaml

# Verify
kubectl get all -n zap-project
terraform output alb_dns_name
```

*Abdelrahman Mohamed — Graduation Project 2026*
