# Presentation Guide — Read This Before You Present

This guide explains everything in simple language.
No prior knowledge needed. Read it fully and you will be able to answer any question.

---

## What Did We Build?

We built a **website** for a company called ACME Inc.

The website helps HR managers and employees track:
- How well each employee is performing at work
- What skills each employee has and what skills they are missing
- What training courses employees have completed
- What career goals employees are working towards

Before this website, all this information was scattered in emails and Excel sheets.
Now it is all in one place, organized, and easy to search.

**The live website is here:** https://d2uu9oauk54q2c.cloudfront.net

---

## How to Demo the App (Practice This)

1. Open https://d2uu9oauk54q2c.cloudfront.net in a browser
2. Click **"Don't have an account? Create one"**
3. Fill in your name, email, password, and choose role **admin**
4. Click Create Account — you will be taken to the login page
5. Log in with your email and password
6. You will see the **Dashboard** — a summary page with stats
7. Click **Employees** in the left menu — add a new employee
8. Click **Performance Reviews** — add a review for that employee
9. Click **Competencies** — add a skill with a target level higher than current level
10. Click your avatar (top right) → Sign out
11. Register a new account with role **viewer**
12. Log in as viewer — notice there are no Add/Edit/Delete buttons
    This proves the role-based access control is working

---

## The Technologies — What Each One Is

Think of building a house. You need different tools for different jobs.
Building a website is the same — different technologies handle different parts.

---

### React.js — The Face of the Website

**What it is:** React is a tool for building what users see on screen.
Every button, form, table, and page is built using React.

**Simple analogy:** React is like the interior design of a house —
the walls, furniture, and layout that people interact with.

**What we used it for:** All 8 pages of the website — login, dashboard,
employees, reviews, plans, competencies, training records, and registration.

---

### Material UI — The Design System

**What it is:** A collection of pre-built, good-looking components
(buttons, tables, cards, forms) that we used inside React.

**Simple analogy:** Instead of building furniture from scratch,
we bought ready-made furniture from IKEA and arranged it.

**What we used it for:** All the visual elements — the sidebar, the tables,
the forms, the color scheme, the cards on the dashboard.

---

### Python — The Brain of the Application

**What it is:** Python is a programming language. We used it to write
the logic that runs on the server — checking passwords, saving data,
enforcing who can do what.

**Simple analogy:** Python is like the staff working behind the counter
at a bank. You (the user) interact with the front desk (React),
but the actual work — checking your account, processing transactions —
is done by the staff behind the scenes (Python).

**What we used it for:** 6 separate Python programs, one for each feature:
auth, employees, reviews, plans, competencies, training.

---

### PostgreSQL — The Database

**What it is:** PostgreSQL is a database — a system for storing data
permanently in organized tables, like a very powerful spreadsheet.

**Simple analogy:** PostgreSQL is like a filing cabinet. Every employee
record, every review, every training record is stored in a drawer.
When you search for something, the database finds it instantly.

**What we used it for:** Storing all the application data — users,
employees, reviews, plans, competencies, training records.

---

### AWS Lambda — Where Python Runs

**What it is:** AWS Lambda is a service from Amazon that runs your code
in the cloud. You upload your Python code and Amazon runs it for you
whenever someone uses the app. You do not need to manage any server.

**Simple analogy:** Imagine a restaurant where instead of having a
full-time chef on salary, you call a chef only when a customer orders food.
The chef comes, cooks the meal, and leaves. You only pay for the time
they actually cooked. Lambda works the same way — it runs your code
only when needed and you pay only for that time.

**What we used it for:** Running our 6 Python programs in the cloud.
Each one is a separate Lambda function.

---

### AWS Aurora — The Cloud Database

**What it is:** Aurora is Amazon's managed database service.
It runs PostgreSQL in the cloud so we do not need to install or
maintain a database server ourselves. Amazon handles backups,
security, and scaling automatically.

**Simple analogy:** Instead of buying and maintaining your own filing
cabinet, you rent space in a professional archive company that manages
everything for you.

**What we used it for:** Storing all the application data in the cloud
so it persists even when the Lambda functions are not running.

---

### AWS S3 — File Storage

**What it is:** S3 is Amazon's file storage service. You can store
any file — images, documents, code — and access it from anywhere.

**Simple analogy:** S3 is like Google Drive or Dropbox, but for
developers to store application files.

**What we used it for:** Storing the built React website files
(HTML, CSS, JavaScript) so they can be served to users.

---

### AWS CloudFront — The Delivery Network

**What it is:** CloudFront is Amazon's CDN (Content Delivery Network).
It takes your website files from S3 and serves them to users from
servers located close to them around the world, making the website
load fast.

**Simple analogy:** Imagine a book publisher in New York. Instead of
shipping every book from New York to customers worldwide, they store
copies in warehouses in every city. When you order a book, it ships
from the nearest warehouse. CloudFront does the same for website files.

**What we used it for:** Serving the React website to users via HTTPS.
The URL https://d2uu9oauk54q2c.cloudfront.net is the CloudFront address.

---

### Terraform — Automatic Infrastructure Setup

**What it is:** Terraform is a tool that creates cloud infrastructure
automatically by reading configuration files. Instead of manually
clicking through the AWS website to create Lambda functions, databases,
and CloudFront distributions, we write what we want in a file and
Terraform creates everything.

**Simple analogy:** Imagine you want to build 10 identical houses.
Instead of building each one by hand, you write a blueprint and a
machine builds all 10 from that blueprint. Terraform is that machine
for cloud infrastructure.

**What we used it for:** Creating all the AWS resources — Lambda functions,
Aurora database, S3 bucket, CloudFront distribution — with a single command.

---

### Git and GitHub — Code History

**What it is:** Git tracks every change made to the code.
GitHub is a website that stores the code online so it can be shared.

**Simple analogy:** Git is like the "track changes" feature in Microsoft Word,
but for code. Every change is recorded with who made it and when.
GitHub is like Google Drive for that tracked code.

**What we used it for:** Storing all the code at
https://github.com/ashritha-ghb/coding-workshop-participant

---

## How Everything Connects

Here is the full picture in simple steps:

```
You open the website URL in your browser
        ↓
CloudFront delivers the React website to your browser
        ↓
You fill in the login form and click Sign In
        ↓
React sends your email and password to the Auth Lambda function
        ↓
Lambda checks your password against the Aurora database
        ↓
If correct, Lambda sends back a token (a secret key proving your identity)
        ↓
React stores that token and uses it for every future request
        ↓
You click "Performance Reviews" in the sidebar
        ↓
React asks the Reviews Lambda for data, sending your token
        ↓
Lambda checks your token, checks your role, gets data from Aurora
        ↓
Lambda sends the data back to React
        ↓
React displays it in a table on your screen
```

---

## What is a Token?

When you log in, the server gives you a **token** — a long string of
characters that proves who you are. It is like a wristband at an event.
You show it at every door (every API request) to prove you are allowed in.

The token contains your role (admin, manager, etc.) so the server knows
what you are allowed to do without checking the database every time.

Tokens expire after 1 hour for security. After that you need to log in again.

---

## Role-Based Access Control — Explained Simply

The app has 4 types of users:

**Admin** — like the owner of the company. Can do everything.

**Manager** — like a department head. Can manage employees and all records,
but cannot delete employees or manage other users.

**Contributor** — like a regular employee with edit access. Can create and
update records but cannot delete anything.

**Viewer** — like a read-only guest. Can only see records, cannot change anything.

When you log in, the app checks your role and shows or hides features accordingly.
A viewer will never see a Delete button. A contributor will not see the Employees menu.

---

## Questions Evaluators Might Ask

**"What does your application do?"**
It is a web application for ACME Inc. to manage employee performance,
development plans, skill gaps, and training records. Managers can track
and update everything. Employees can view their own records.

**"What technologies did you use?"**
React for the frontend, Python for the backend, PostgreSQL for the database.
Deployed on AWS using Lambda for the API, Aurora for the database,
S3 and CloudFront for the frontend. Infrastructure managed with Terraform.

**"What is serverless?"**
Serverless means we do not manage any servers. AWS Lambda runs our Python
code only when someone makes a request. We pay only for the time the code
actually runs. AWS handles everything else — scaling, security, maintenance.

**"How does login work?"**
The user enters email and password. The password is never stored in plain text —
it is hashed (scrambled in a one-way process) before saving. On login, we
verify the hash. If correct, we return a JWT token that the frontend uses
for all future requests.

**"How do you control who can do what?"**
Every API request includes the user's token. The backend checks the token,
reads the user's role, and decides whether to allow the action. If the role
is insufficient, it returns a 403 error. The frontend also hides buttons
the user cannot use, but the real security is always on the backend.

**"Where is the application deployed?"**
Frontend: https://d2uu9oauk54q2c.cloudfront.net (AWS CloudFront + S3)
Backend: AWS Lambda functions in ap-south-1 region
Database: AWS Aurora PostgreSQL in ap-south-1 region

---

## Summary — What to Say in 2 Minutes

*"We built a web application for ACME Inc. to centralize employee performance
management. The frontend is built with React and Material UI. The backend
is 6 Python Lambda functions running on AWS, one for each feature — auth,
employees, performance reviews, development plans, competencies, and training
records. Data is stored in PostgreSQL on AWS Aurora. The whole infrastructure
is managed with Terraform and deployed with shell scripts.*

*The app has role-based access control with four roles — admin, manager,
contributor, and viewer. Each role sees different features and has different
permissions. Authentication uses JWT tokens.*

*The live application is accessible at https://d2uu9oauk54q2c.cloudfront.net"*
