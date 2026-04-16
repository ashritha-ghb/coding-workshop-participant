# AWS — What It Is and What We Used

## What is AWS?

AWS (Amazon Web Services) is Amazon's cloud computing platform.
Instead of buying and managing your own servers, you rent computing
power, storage, and services from Amazon and pay only for what you use.

**Simple analogy:** Instead of buying a generator for your house,
you connect to the electricity grid and pay for what you use.
AWS is the electricity grid for computing.

---

## AWS Services We Used

### 1. AWS Lambda — Running Our Python Code

**What it is:** Lambda lets you run code without managing servers.
You upload your Python code, and AWS runs it whenever someone makes a request.

**How it works in our project:**
- We have 6 Lambda functions: auth, employees, performance-reviews,
  development-plans, competencies, training-records
- Each function has its own URL (called a Lambda Function URL)
- When the frontend calls `/api/auth/login`, it hits the auth Lambda
- Lambda runs the Python code, queries the database, and returns the result
- Lambda then shuts down until the next request

**Why Lambda instead of a normal server:**
- No server to manage or maintain
- Scales automatically — if 1000 people use the app at once, AWS creates
  1000 instances automatically
- Cost-efficient — you pay only when code is running, not 24/7

**Lambda URLs in production:**
```
auth:               https://yezdmposxcjpp4floi7lwapon40idvkj.lambda-url.ap-south-1.on.aws/
employees:          https://fkdhq7u6l4vmiitp7ciliotvg40prljo.lambda-url.ap-south-1.on.aws/
performance-reviews: https://6tso5mavlavqhdcs2smdhxmsku0nidwd.lambda-url.ap-south-1.on.aws/
development-plans:  https://n47f7tps57g6kql4qi4oxo4fxq0uxtvt.lambda-url.ap-south-1.on.aws/
competencies:       https://nrvpbkdp3pbqf7q32vnpfhui640osngv.lambda-url.ap-south-1.on.aws/
training-records:   https://ojwqaysz2cmxpthd36b6ivqxwi0qhdcr.lambda-url.ap-south-1.on.aws/
```

---

### 2. AWS Aurora PostgreSQL — The Database

**What it is:** Aurora is Amazon's managed database service.
It runs PostgreSQL (a popular database system) in the cloud.
Amazon handles backups, security patches, and scaling automatically.

**How it works in our project:**
- All data is stored here — users, employees, reviews, plans, competencies, training
- The Lambda functions connect to Aurora to read and write data
- Aurora Serverless means it scales to zero when not in use (saves cost)
  and scales up automatically when traffic increases

**Connection details are injected automatically:**
The Terraform configuration passes database credentials to Lambda as
environment variables (`POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASS`, etc.)
so the Python code never has hardcoded passwords.

---

### 3. AWS S3 — Storing the Frontend

**What it is:** S3 (Simple Storage Service) is Amazon's file storage.
You can store any file and access it from anywhere via a URL.

**How it works in our project:**
- After `npm run build`, React creates a `dist/` folder with HTML, CSS, and JS files
- `deploy-frontend.sh` uploads these files to an S3 bucket called `coding-workshop-website-b924649a`
- S3 serves these files as a static website

---

### 4. AWS CloudFront — Delivering the Website

**What it is:** CloudFront is Amazon's CDN (Content Delivery Network).
It caches your website files in servers around the world so users
get fast load times regardless of where they are.

**How it works in our project:**
- CloudFront sits in front of both S3 (frontend) and Lambda (API)
- When you open https://d2uu9oauk54q2c.cloudfront.net, CloudFront serves the React app from S3
- When React calls `/api/auth/login`, CloudFront routes it to the auth Lambda
- CloudFront also provides HTTPS (the padlock in the browser)

**This is why there is one URL for everything:**
`https://d2uu9oauk54q2c.cloudfront.net` — frontend
`https://d2uu9oauk54q2c.cloudfront.net/api/auth` — auth API
`https://d2uu9oauk54q2c.cloudfront.net/api/employees` — employees API

---

### 5. AWS SQS — Dead Letter Queue

**What it is:** SQS (Simple Queue Service) is a message queue.
We use it as a "dead letter queue" — if a Lambda function fails,
the failed request is stored here for debugging.

**How it works in our project:**
Each Lambda has an associated SQS queue. If a Lambda crashes,
the request goes to the queue so we can investigate later.
This is standard AWS best practice for Lambda functions.

---

## How to Test the Live AWS Deployment

### Test the auth Lambda directly:
```sh
curl -X POST "https://yezdmposxcjpp4floi7lwapon40idvkj.lambda-url.ap-south-1.on.aws/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"Admin1234!","full_name":"Admin","role":"admin"}'
```

### Test via CloudFront:
```sh
curl -X POST "https://d2uu9oauk54q2c.cloudfront.net/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"Admin1234!"}'
```

### Check Lambda logs:
```sh
aws logs tail /aws/lambda/coding-workshop-auth-b924649a --follow --format short
```

### Check database status:
```sh
aws rds describe-db-clusters \
  --db-cluster-identifier coding-workshop-rds-b924649a \
  --query 'DBClusters[0].Status' \
  --output text
```
Should return `available`.

---

## Local vs Production

| | Local (development) | Production (AWS) |
|--|---------------------|-----------------|
| Frontend | http://localhost:3000 | https://d2uu9oauk54q2c.cloudfront.net |
| API | http://localhost:3001/api | https://d2uu9oauk54q2c.cloudfront.net/api |
| Lambda | LocalStack (fake AWS) | Real AWS Lambda |
| Database | Local PostgreSQL | AWS Aurora |
| Start command | `./bin/start-dev.sh` | `./bin/deploy-backend.sh` + `./bin/deploy-frontend.sh` |
