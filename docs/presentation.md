# What We Built — Presentation Guide

This document explains everything you need to know to present this project
confidently to evaluators. Read it fully before your presentation.

---

## What is this project?

We built a **web application** for a company called ACME Inc. to manage
employee performance. Think of it like an internal HR tool where:

- Managers can write performance reviews for their team
- Employees can see their own feedback and career goals
- HR can track who has skill gaps and who needs training
- Admins can manage everything

The app runs on the internet (deployed to AWS) and anyone with a login can
access it from a browser.

---

## The Tech Stack — explained simply

### Frontend (what users see in the browser)

**React.js** — a JavaScript library for building web pages. Instead of writing
plain HTML, React lets you build reusable components like buttons, forms, and
tables. Think of it like LEGO blocks for web pages.

**Material UI (MUI)** — a ready-made set of styled components (buttons, cards,
tables, dialogs) that follow Google's design guidelines. This is why the app
looks clean and professional without writing custom CSS from scratch.

**React Responsive** — makes the app work on both mobile phones and desktop
screens. The sidebar collapses into a hamburger menu on small screens.

**Vite** — the build tool that compiles our React code into files the browser
can understand. Like a compiler for frontend code.

---

### Backend (the server logic)

**Python** — the programming language used for all server-side code. Each
feature (auth, employees, reviews, etc.) is a separate Python file.

**AWS Lambda** — instead of running a traditional server 24/7, Lambda runs
our Python code only when someone makes a request. It scales automatically
and we only pay for what we use. This is called "serverless".

**PostgreSQL** — the database where all data is stored. Tables for users,
employees, reviews, plans, competencies, and training records.

**AWS Aurora** — Amazon's managed PostgreSQL service. It handles backups,
scaling, and availability automatically.

---

### Infrastructure (how it's deployed)

**Terraform** — a tool that describes AWS resources (Lambda, S3, CloudFront,
Aurora) as code. Instead of clicking through the AWS console, we write
configuration files and Terraform creates everything automatically.

**AWS S3** — stores the built React app files (HTML, CSS, JavaScript).

**AWS CloudFront** — a CDN (Content Delivery Network) that serves the frontend
files fast from locations close to the user. It also handles HTTPS.

**Shell Scripts** — the `bin/` folder has scripts like `deploy-backend.sh`
and `deploy-frontend.sh` that automate the deployment process.

**LocalStack** — a tool that runs fake AWS services on your laptop for
development. So you can test Lambda, S3, etc. without spending money on real AWS.

---

## How the app works — the flow

```
User opens browser
    → CloudFront serves the React app from S3
    → User logs in → React sends request to CloudFront
    → CloudFront routes /api/auth to the auth Lambda
    → Lambda checks credentials against Aurora PostgreSQL
    → Lambda returns a JWT token
    → React stores the token and shows the dashboard
```

Every subsequent action (create review, add employee, etc.) follows the same
pattern — React sends a request with the token, Lambda verifies it, does the
database operation, returns the result.

---

## Authentication and Roles — explained

**JWT (JSON Web Token)** — when you log in, the server gives you a "ticket"
(the token). This ticket is signed so it can't be faked. You include this
ticket in every request to prove who you are. The ticket expires after 1 hour.

**RBAC (Role-Based Access Control)** — different users have different
permissions based on their role:

| Role | What they can do |
|------|-----------------|
| Admin | Everything — create, read, update, delete, manage users |
| Manager | Manage all records and employees, but can't delete employees |
| Contributor | Create and update records, but can't delete |
| Viewer | Read-only — can only see their own records |

This is enforced in two places:
1. **Backend** — the Lambda checks the role before doing anything
2. **Frontend** — buttons and menu items are hidden if you don't have permission

---

## The 6 Backend Services

Each service is a Python file that handles one area of the app:

**auth** — handles login, registration, and token management. Passwords are
hashed using argon2 (a secure algorithm) before storing in the database.

**employees** — stores employee profiles: name, email, department, job title,
hire date, manager, employment status.

**performance-reviews** — stores review cycles with ratings like
"exceeds expectations", scores, strengths, areas to improve, and goals.

**development-plans** — tracks career goals with target roles, milestones,
progress percentage, and status (not started, in progress, completed).

**competencies** — tracks skill levels (1=beginner to 5=expert) per employee
per skill. Automatically calculates the gap between current and target level.

**training-records** — logs training activities: courses, certifications,
workshops, with completion dates and scores.

---

## What the evaluators will check

1. **Open the live URL** — https://d2uu9oauk54q2c.cloudfront.net
2. **Register an account** and log in
3. **Create an employee** — go to Employees → Add Employee
4. **Create a performance review** — go to Performance Reviews → New Review
5. **Check role-based access** — log in as different roles and verify
   that buttons appear/disappear correctly
6. **Test search and filter** — type in the search box on any list page
7. **Check responsive design** — resize the browser window to mobile size

---

## Questions evaluators might ask — and how to answer

**Q: Why did you use Lambda instead of a traditional server?**
A: Lambda is serverless — it scales automatically, costs nothing when idle,
and fits the AWS Serverless requirement in the assignment. Each service is
independent so they can scale separately.

**Q: Why PostgreSQL and not MongoDB?**
A: The assignment specified PostgreSQL. It's a relational database which suits
structured data like employee records and reviews where relationships between
tables matter.

**Q: How does authentication work?**
A: Users log in with email and password. The password is hashed with argon2
before storage. On login, we verify the hash and return a JWT token. The token
is signed with a secret key and contains the user's ID, email, and role. Every
API request includes this token in the Authorization header.

**Q: How is role-based access implemented?**
A: Each Lambda function calls `require_role(event, "minimum_role")` at the
start. This extracts the JWT from the request, verifies it, and checks if the
caller's role rank is sufficient. If not, it returns 403. The frontend also
hides UI elements based on role, but the backend is the authoritative check.

**Q: What happens if the database is down?**
A: The Lambda catches the connection error and returns a 500 response with
a clear error message. The connection is reset so the next request tries again.

**Q: How did you handle CORS?**
A: In production, CloudFront handles routing so there are no CORS issues.
Locally, a Node.js proxy server forwards requests from the React dev server
to the Lambda URLs, stripping browser headers that cause CORS problems.

---

## Key numbers to remember

- **6 backend services** — auth, employees, performance-reviews,
  development-plans, competencies, training-records
- **4 user roles** — admin, manager, contributor, viewer
- **8 frontend pages** — login, register, dashboard, employees, employee
  detail, performance reviews, development plans, competencies, training records
- **30 unit tests** — covering auth, employees, competencies, performance
  reviews, and development plans
- **Live URL** — https://d2uu9oauk54q2c.cloudfront.net

---

## How to demo the app

1. Open https://d2uu9oauk54q2c.cloudfront.net
2. Click "Don't have an account? Create one"
3. Register as admin: email `admin@acme.com`, password `Admin1234!`, role `admin`
4. Log in — you'll see the dashboard
5. Go to Employees → Add Employee → fill in the form → Save
6. Go to Performance Reviews → New Review → use the employee ID you just created
7. Go to Competencies → Add Competency → set current level 2, target level 5
   → notice the gap shows as 3
8. Log out → register a new account with role `viewer`
9. Log in as viewer → notice Employees menu is gone, no create buttons visible
10. This demonstrates RBAC working correctly
