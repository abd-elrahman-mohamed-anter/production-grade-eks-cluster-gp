# Approach 1 — EC2-Based Containerized Architecture

### AWS · EC2 · Docker Compose · Nginx · PostgreSQL · OWASP ZAP · OWASP Dependency Check · Nikto · CloudWatch

---

## Architecture

![EC2 Architecture](screen/ec2-gp.png)
---

## Overview

Before moving to Kubernetes, I first built and deployed the platform on AWS using EC2 and Docker Compose.

The goal was to create a complete environment for automated web vulnerability assessment while keeping the architecture secure, scalable, and easy to manage.

The platform combines multiple security tools and services into a single deployment:

- Backend Application
- PostgreSQL Database
- OWASP ZAP
- OWASP Dependency Check
- Nikto
- Nginx Reverse Proxy

Everything runs as Docker containers on EC2 instances inside private subnets, while an AWS Application Load Balancer handles incoming traffic.

---

## Infrastructure

The infrastructure is deployed inside a dedicated AWS VPC using public and private subnets.

Only the Application Load Balancer is publicly accessible. Application workloads remain isolated inside private subnets and use a NAT Gateway whenever outbound internet access is required.

### Components

| Component | Purpose |
|------------|------------|
| VPC | Network isolation |
| Public Subnets | ALB and NAT Gateway |
| Private Subnets | Application workloads |
| Internet Gateway | Public internet connectivity |
| NAT Gateway | Outbound internet access |
| Application Load Balancer | Public entry point |
| Security Groups | Traffic filtering and access control |

---

## Application Stack

The application is deployed as a multi-container environment using Docker Compose.

### Services

| Service | Purpose |
|----------|----------|
| Nginx | Reverse proxy |
| Application | Main vulnerability scanning platform |
| PostgreSQL | Persistent database |
| OWASP ZAP | Dynamic application security testing |
| OWASP Dependency Check | Dependency vulnerability analysis |
| Nikto | Web server vulnerability scanning |

### Docker Compose Features

What I implemented using Docker Compose:

- Multi-container deployment
- Health checks for critical services
- Service dependency management
- Persistent volumes
- Dedicated internal network
- Automatic restart policies
- Environment-based configuration using `.env`
- Centralized logs and reports

---

## Networking

All containers communicate through a dedicated Docker bridge network.

```yaml
networks:
  zap_network:
    driver: bridge
```

This allowed services to communicate internally using container names instead of IP addresses.

### Internal Communication

```text
Nginx
  ↓
Application
  ├── PostgreSQL
  ├── OWASP ZAP
  ├── Dependency Check
  └── Nikto
```

External users never communicate directly with the database or security scanners.

---

## Reverse Proxy

Nginx acts as the main entry point for application traffic.

Requests follow the path:

```text
User
  ↓
Application Load Balancer
  ↓
Nginx
  ↓
Backend Application
```

Using Nginx made it easier to:

- Route traffic
- Hide backend implementation details
- Centralize incoming requests
- Prepare for future HTTPS integration

---

## Database

PostgreSQL 15 was used to store:

- Scan results
- Application data
- User-generated reports

Database persistence was handled through Docker volumes backed by EBS storage.

### Persistent Volume

```yaml
zap_db_data:
```

This ensures data remains available even if containers are recreated.

---

## Security Testing

Instead of relying on a single tool, I integrated multiple security testing solutions.

### OWASP ZAP

Used for Dynamic Application Security Testing (DAST).

Capabilities:

- Passive scanning
- Active scanning
- Spider crawling
- Security header analysis
- SQL Injection detection
- Cross-Site Scripting (XSS) detection

The backend communicates directly with ZAP through Docker networking.

```text
Application → ZAP Container
```

---

### OWASP Dependency Check

Used to identify vulnerable third-party libraries and dependencies.

Capabilities:

- CVE detection
- Dependency risk assessment
- Software Composition Analysis (SCA)
- Vulnerability reporting

Reports are generated and stored inside the reports directory.

---

### Nikto

Used for web server security assessments.

Capabilities:

- Dangerous file detection
- Server misconfiguration checks
- Outdated software detection
- Common web vulnerability identification

---

## Storage

Several Docker volumes were configured to preserve important data.

### Volumes

| Volume | Purpose |
|----------|----------|
| zap_db_data | PostgreSQL data |
| zap_data | OWASP ZAP workspace |
| depcheck_data | Dependency Check database |

### Mounted Directories

Additional directories were used for:

- Application logs
- Scan reports
- Uploaded files
- Nginx logs

---

## Monitoring

Amazon CloudWatch was used to monitor infrastructure and application health.

Metrics included:

- EC2 CPU utilization
- Memory utilization
- Network traffic
- System health
- Application logs

CloudWatch provided visibility into both infrastructure performance and application behavior.

---

## Traffic Flow

```text
User
  ↓
Internet Gateway
  ↓
Application Load Balancer
  ↓
Nginx Reverse Proxy
  ↓
Backend Application
  ├── PostgreSQL
  ├── OWASP ZAP
  ├── Dependency Check
  └── Nikto
```

The Application Load Balancer acts as the only public-facing component.

All backend services remain isolated inside private subnets.

---

## What I Focused On

While building this deployment, I focused on:

- Keeping application workloads inside private subnets
- Using Nginx as a reverse proxy behind the ALB
- Containerizing all services with Docker
- Managing the entire stack through Docker Compose
- Adding health checks for critical services
- Persisting database and scan data
- Integrating multiple security testing tools
- Monitoring infrastructure using CloudWatch
- Restricting public exposure to only the load balancer

---

## Challenges

### Service Startup Dependencies

Several services depended on PostgreSQL and OWASP ZAP being available before startup.

I solved this using Docker Compose health checks and conditional dependencies.

Example:

```yaml
depends_on:
  db:
    condition: service_healthy
```

This ensured services started in the correct order.

---

### OWASP ZAP Resource Consumption

During active scans, OWASP ZAP consumed a significant amount of memory.

I had to optimize scan settings and resource allocation to keep the platform stable while maintaining scanning capabilities.

---

### Managing Multiple Security Tools

Running ZAP, Dependency Check, and Nikto together required careful planning for networking, storage, and report management.

Docker Compose helped simplify service orchestration and maintenance.

---

## Deployment

### Start Services

```bash
docker compose up -d
```

### Check Running Containers

```bash
docker compose ps
```

### View Logs

```bash
docker compose logs -f
```

### Stop Services

```bash
docker compose down
```

---

## Why I Moved to Kubernetes

After successfully running the platform on EC2, I started noticing some limitations.

Managing containers manually became harder as the project grew, scaling required additional infrastructure work, and service management wasn't as flexible as I wanted.

To address these challenges, I rebuilt the platform using:

- Terraform
- Amazon EKS
- Kubernetes
- EBS CSI Driver
- CloudWatch Container Insights

The Kubernetes implementation became the second version of the project and significantly improved automation, scalability, observability, and infrastructure management.

➡️ **Next Step:** [View Kubernetes Architecture](../tf/README.md)

---

*Abdelrahman Mohamed — Graduation Project 2026*
