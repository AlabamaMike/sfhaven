# SF Haven Deployment Guide

This guide covers deployment of SF Haven to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [AWS Deployment](#aws-deployment)
- [Database Setup](#database-setup)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Recovery](#backup--recovery)

## Prerequisites

### Required Tools

- Docker 20.10+
- Docker Compose 2.0+
- AWS CLI 2.0+
- Terraform 1.0+ (optional)
- Node.js 18+
- PostgreSQL 15+ with PostGIS

### AWS Account Setup

1. Create AWS account
2. Configure IAM user with appropriate permissions
3. Set up AWS CLI credentials:

```bash
aws configure
```

## Local Development

### Using Docker Compose

1. **Clone and configure:**

```bash
git clone https://github.com/yourusername/sfhaven.git
cd sfhaven
cp backend/.env.example backend/.env
```

2. **Edit environment variables:**

```bash
# backend/.env
NODE_ENV=development
PORT=3000
DB_HOST=postgres
DB_PASSWORD=secure_password
JWT_SECRET=your_secret_here
```

3. **Start services:**

```bash
docker-compose up -d
```

4. **Initialize database:**

```bash
# Run migrations
docker-compose exec backend npm run migrate

# Seed sample data
docker-compose exec backend npm run seed
```

5. **Verify deployment:**

```bash
curl http://localhost:3000/health
```

### Without Docker

See [README.md](../README.md) for local development setup.

## Docker Deployment

### Build Production Images

```bash
# Build backend image
docker build -t sfhaven-backend:latest ./backend

# Build with specific version
docker build -t sfhaven-backend:1.0.0 ./backend
```

### Run in Production Mode

```bash
# Create production docker-compose.override.yml
cat > docker-compose.override.yml <<EOF
version: '3.8'
services:
  backend:
    environment:
      NODE_ENV: production
    restart: always
  postgres:
    restart: always
  redis:
    restart: always
EOF

# Start services
docker-compose up -d
```

### Using Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml sfhaven

# Check services
docker service ls
```

## AWS Deployment

### Architecture

```
┌──────────────────────────────────────────────┐
│           CloudFront (CDN)                   │
└──────────────────────────────────────────────┘
                     │
┌──────────────────────────────────────────────┐
│       Application Load Balancer (ALB)        │
└──────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│  ECS Fargate  │         │  ECS Fargate  │
│   (API - AZ1) │         │   (API - AZ2) │
└───────────────┘         └───────────────┘
        │                         │
        └────────────┬────────────┘
                     ▼
        ┌────────────────────────┐
        │     RDS PostgreSQL     │
        │      (Multi-AZ)        │
        └────────────────────────┘
                     │
        ┌────────────────────────┐
        │   ElastiCache Redis    │
        └────────────────────────┘
```

### Step 1: Create ECR Repository

```bash
# Create repository
aws ecr create-repository --repository-name sfhaven-backend --region us-west-1

# Login to ECR
aws ecr get-login-password --region us-west-1 | \
  docker login --username AWS --password-stdin \
  YOUR_ACCOUNT_ID.dkr.ecr.us-west-1.amazonaws.com
```

### Step 2: Build and Push Image

```bash
# Build image
docker build -t sfhaven-backend:latest ./backend

# Tag image
docker tag sfhaven-backend:latest \
  YOUR_ACCOUNT_ID.dkr.ecr.us-west-1.amazonaws.com/sfhaven-backend:latest

# Push image
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-west-1.amazonaws.com/sfhaven-backend:latest
```

### Step 3: Create RDS Database

```bash
# Create subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name sfhaven-db-subnet \
  --db-subnet-group-description "SF Haven DB Subnet Group" \
  --subnet-ids subnet-xxxxx subnet-yyyyy

# Create database
aws rds create-db-instance \
  --db-instance-identifier sfhaven-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.3 \
  --master-username postgres \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --db-subnet-group-name sfhaven-db-subnet \
  --vpc-security-group-ids sg-xxxxx \
  --backup-retention-period 7 \
  --multi-az \
  --storage-encrypted

# Wait for database to be available
aws rds wait db-instance-available --db-instance-identifier sfhaven-db
```

### Step 4: Create ElastiCache Redis

```bash
# Create cache subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name sfhaven-redis-subnet \
  --cache-subnet-group-description "SF Haven Redis Subnet" \
  --subnet-ids subnet-xxxxx subnet-yyyyy

# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id sfhaven-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name sfhaven-redis-subnet \
  --security-group-ids sg-xxxxx
```

### Step 5: Create ECS Cluster

```bash
# Create cluster
aws ecs create-cluster --cluster-name sfhaven-cluster

# Register task definition
cat > task-definition.json <<EOF
{
  "family": "sfhaven-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-west-1.amazonaws.com/sfhaven-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "3000"}
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-west-1:ACCOUNT:secret:sfhaven/db-password"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-west-1:ACCOUNT:secret:sfhaven/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/sfhaven-backend",
          "awslogs-region": "us-west-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

aws ecs register-task-definition --cli-input-json file://task-definition.json
```

### Step 6: Create Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name sfhaven-alb \
  --subnets subnet-xxxxx subnet-yyyyy \
  --security-groups sg-xxxxx \
  --scheme internet-facing

# Create target group
aws elbv2 create-target-group \
  --name sfhaven-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxxxx \
  --target-type ip \
  --health-check-path /health

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:... \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

### Step 7: Create ECS Service

```bash
aws ecs create-service \
  --cluster sfhaven-cluster \
  --service-name sfhaven-api \
  --task-definition sfhaven-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx,subnet-yyyyy],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=backend,containerPort=3000"
```

### Step 8: Setup Auto Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/sfhaven-cluster/sfhaven-api \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/sfhaven-cluster/sfhaven-api \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

## Database Setup

### Initialize Production Database

```bash
# Connect to RDS instance
psql -h sfhaven-db.xxxxx.us-west-1.rds.amazonaws.com -U postgres -d sfhaven

# Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

# Run migrations (from local machine or EC2 instance)
NODE_ENV=production \
DB_HOST=sfhaven-db.xxxxx.us-west-1.rds.amazonaws.com \
DB_PASSWORD=your_password \
npm run migrate

# Seed initial data (optional)
npm run seed
```

### Database Backups

```bash
# Automated backups are configured during RDS creation
# Manual snapshot:
aws rds create-db-snapshot \
  --db-instance-identifier sfhaven-db \
  --db-snapshot-identifier sfhaven-db-snapshot-$(date +%Y%m%d)
```

## Monitoring & Logging

### CloudWatch Logs

Logs are automatically sent to CloudWatch Logs from ECS tasks.

```bash
# View logs
aws logs tail /ecs/sfhaven-backend --follow
```

### CloudWatch Alarms

```bash
# CPU utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name sfhaven-high-cpu \
  --alarm-description "Alert when CPU exceeds 70%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 70 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name sfhaven-high-error-rate \
  --alarm-description "Alert when error rate exceeds 5%" \
  --metric-name 5XXError \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

## Backup & Recovery

### Database Backup Strategy

1. **Automated Backups:** Daily snapshots retained for 7 days
2. **Manual Snapshots:** Weekly snapshots retained for 30 days
3. **Point-in-Time Recovery:** Available for last 7 days

### Recovery Procedure

```bash
# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier sfhaven-db-restored \
  --db-snapshot-identifier sfhaven-db-snapshot-20251111

# Point-in-time restore
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier sfhaven-db \
  --target-db-instance-identifier sfhaven-db-restored \
  --restore-time 2025-11-11T10:00:00Z
```

## CI/CD with GitHub Actions

Deployment is automated via GitHub Actions. See [.github/workflows/ci-cd.yml](../.github/workflows/ci-cd.yml)

### Required GitHub Secrets

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
DB_PASSWORD
JWT_SECRET
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
GOOGLE_MAPS_API_KEY
```

### Manual Deployment

```bash
# Trigger deployment
git push origin main

# Or manually trigger via GitHub UI
```

## SSL/TLS Configuration

Use AWS Certificate Manager (ACM) for SSL certificates:

```bash
# Request certificate
aws acm request-certificate \
  --domain-name api.sfhaven.org \
  --validation-method DNS \
  --subject-alternative-names *.sfhaven.org
```

## Cost Optimization

### Estimated Monthly Costs

- **ECS Fargate (2 tasks):** ~$30
- **RDS db.t3.medium:** ~$60
- **ElastiCache t3.micro:** ~$15
- **ALB:** ~$20
- **Data Transfer:** ~$10
- **CloudWatch/Logs:** ~$5

**Total:** ~$140/month

### Cost Reduction Tips

1. Use Reserved Instances for RDS
2. Enable auto-scaling to reduce idle capacity
3. Configure log retention periods
4. Use S3 lifecycle policies
5. Enable CloudWatch cost anomaly detection

## Security Checklist

- [ ] Enable AWS WAF on ALB
- [ ] Configure security groups with least privilege
- [ ] Enable VPC Flow Logs
- [ ] Use AWS Secrets Manager for credentials
- [ ] Enable RDS encryption at rest
- [ ] Configure SSL/TLS termination at ALB
- [ ] Enable CloudTrail logging
- [ ] Set up AWS GuardDuty
- [ ] Configure IAM roles with least privilege
- [ ] Enable MFA for root account

## Troubleshooting

### Service Not Starting

```bash
# Check ECS service events
aws ecs describe-services --cluster sfhaven-cluster --services sfhaven-api

# Check task logs
aws logs tail /ecs/sfhaven-backend --follow
```

### Database Connection Issues

```bash
# Test database connectivity
psql -h DB_ENDPOINT -U postgres -d sfhaven

# Check security group rules
aws ec2 describe-security-groups --group-ids sg-xxxxx
```

### High Memory Usage

```bash
# Check container metrics
aws ecs describe-tasks --cluster sfhaven-cluster --tasks TASK_ID

# Increase memory in task definition if needed
```

## Support

For deployment support:
- Email: devops@sfhaven.org
- Docs: https://docs.sfhaven.org/deployment
- GitHub Issues: https://github.com/yourusername/sfhaven/issues
