# What We Built — Plain English Guide

This document explains everything you need to know to present this project
confidently to evaluators. Read it fully before your presentation.

---

## The Problem We Solved

ACME Inc. had no central system to track:
- How employees are performing
- What skills they are missing
- What training they have completed
- What their career goals are

Everything was in spreadsheets and emails. Managers had no visibility.

**We built a web application that solves all of this.**

---

## What the Application Does

When you open the app, you see a login page. After logging in, you get a
dashboard showing a summary of all activity. From the sidebar you can navigate to:

- **Employees** — view and manage employee profiles
- **Performance Reviews** — track review history and ratings for each employee
- **Development Plans** — set career goals and track progress
- **Competencies** — record skill levels and identify gaps
- **Training Records** — log courses, certifications, and workshops

Every page lets you create, view, edit, and delete records. You can also
search and filter to find specific data quickly.

---

## Who Can Do What (Roles)

The app has four types of users:

| Role | What they can do |
|------|-----------------|
| **Admin** | Everything — manage users, delete records, full access |
| **Manager** | Create and manage all records, manage employees |
| **Contributor** | Create and update records, but cannot delete |
| **Viewer** | Read-only — can only see their own records |

This is called **Role-Based Access Control (RBAC)**. The system automatically
shows or hides buttons based on who is logged in. A viewer will never see a
Delete button. A contributor will not see the Employees menu.

---

## The Tech Stack — What Each Technology Does

### React.js (Frontend)
React is a JavaScript library for building user interfaces. Think of it as
the "face" of the application — everything the user sees and clicks on.

We used **Material UI** for the design components (buttons, tables, forms,
cards) so the app looks professional without writing CSS from scratch.

We used **React Responsive** to make the layout work on both mobile phones
and desktop screens.

### Python (Backend)
Python handles all the business logic — validating data, checking permissions,
reading and writing to the database. Each feature (auth, employees, reviews,
etc.) is a separate Python file called a **Lambda function**.

### PostgreSQL (Database)
PostgreSQL is where all the data is stored permanently. Employee records,
reviews, plans, competencies, training — all stored in tables in PostgreSQL.

### AWS Lambda
Instead of running a traditional server 24/7, we use Lambda. Lambda runs
our Python code only when someone makes a request, then shuts down. This
is called **serverless** — you don't manage servers, AWS does it for you.

### AWS Aurora
Aurora is Amazon's managed PostgreSQL database. It scales automatically
and we don't need to manage the database server ourselves.

### AWS S3 + CloudFront
S3 stores the built React application files. CloudFront is a CDN (Content
Delivery Network) that serves those files to users quickly from locations
around the world. The live URL `https://d2uu9oauk54q2c.cloudfront.net`
is the CloudFront address.

### Terraform
Terraform is a tool that creates all the AWS infrastructure automatically
by reading configuration files. Instead of clicking through the AWS console
to create Lambda functions, databases, and CloudFront distributions, we
describe what we want in `.tf` files and Terraform creates it.

### Git and GitHub
Git tracks all code changes. GitHub stores the code online. Every change
we made was committed and pushed to GitHub so there is a full history.

---

## How the Application Works — Step by Step

1. User opens `https://d2uu9oauk54q2c.cloudfront.net` in their browser
2. CloudFront serves the React app from S3
3. User enters email and password and clicks Sign In
4. React sends the credentials to the auth Lambda function
5. Lambda checks the password against the database
6. If correct, Lambda returns a **JWT token** (a secure string that proves identity)
7. React stores the token and uses it for all future requests
8. When the user navigates to Performance Reviews, React calls the reviews Lambda
9. The Lambda checks the token, verifies the user's role, queries PostgreSQL, and returns data
10. React displays the data in a table

---

## What is a JWT Token?

JWT stands for JSON Web Token. It is a secure string that contains:
- Who you are (user ID and email)
- What role you have (admin, manager, etc.)
- When it expires (after 1 hour)

It is signed with a secret key so it cannot be faked. Every API request
includes this token in the header so the server knows who is making the request.

---

## The Live Application

**URL:** https://d2uu9oauk54q2c.cloudfront.net

To demonstrate to evaluators:
1. Open the URL in a browser
2. Click "Don't have an account? Create one"
3. Register with role `admin`
4. Log in and show the dashboard
5. Create an employee record
6. Create a performance review for that employee
7. Add a competency with a skill gap
8. Log out and register a new account with role `viewer`
9. Log in as viewer — show that they can only read, no create/edit/delete buttons

---

## Key Points to Mention in Presentation

- **Serverless architecture** — no servers to manage, scales automatically
- **Role-based access control** — different users see different things
- **JWT authentication** — secure, stateless, industry standard
- **PostgreSQL** — relational database, data persists reliably
- **Infrastructure as Code** — Terraform creates all AWS resources from config files
- **Responsive design** — works on mobile and desktop
- **Automated tests** — 30 unit tests covering auth, employees, competencies

---

## If Evaluators Ask Questions

**"Why did you choose Lambda over a traditional server?"**
Lambda is serverless — it scales automatically, costs nothing when idle,
and AWS manages all the infrastructure. It is the modern standard for
building APIs on AWS.

**"How does authentication work?"**
Users log in with email and password. The password is hashed using argon2
before storage so it is never stored in plain text. On login, we verify
the hash and return a JWT token. Every subsequent request includes that
token so the server knows who is calling.

**"How do you prevent unauthorized access?"**
Every Lambda function checks the JWT token and the user's role before
doing anything. If the role is insufficient, it returns 403 Forbidden.
The frontend also hides buttons the user cannot use, but the real
enforcement is always on the backend.

**"What database did you use and why?"**
PostgreSQL via AWS Aurora Serverless. PostgreSQL is a reliable, widely-used
relational database. Aurora Serverless means it scales to zero when not in
use and scales up automatically under load — no manual capacity planning.

**"How is the frontend deployed?"**
The React app is built into static files and uploaded to S3. CloudFront
serves those files globally with HTTPS. This is the standard AWS pattern
for hosting single-page applications.
