# Terraform — What It Is and What We Used It For

## What is Terraform?

Terraform is a tool that creates cloud infrastructure automatically.
Instead of manually clicking through the AWS website to create servers,
databases, and other services, you write what you want in a configuration
file and Terraform creates everything for you.

**Simple analogy:** Imagine you want to set up 10 identical offices.
Instead of furnishing each one by hand, you write a blueprint:
"each office needs a desk, 2 chairs, a computer, and a phone."
A machine reads the blueprint and sets up all 10 offices identically.
Terraform is that machine for cloud infrastructure.

---

## Why Terraform?

Without Terraform, setting up this project on AWS would require:
1. Manually creating 6 Lambda functions in the AWS console
2. Manually creating an Aurora database cluster
3. Manually creating an S3 bucket
4. Manually creating a CloudFront distribution
5. Manually configuring all the permissions and connections between them

With Terraform, all of this happens automatically with one command:
```sh
./bin/deploy-backend.sh
```

---

## Terraform Files in This Project

All Terraform files are in the `infra/` folder. They have the `.tf` extension.

| File | What it creates |
|------|----------------|
| `infra/lambda.tf` | The 6 Lambda functions |
| `infra/rds.tf` | The Aurora PostgreSQL database |
| `infra/s3.tf` | The S3 bucket for the frontend |
| `infra/cloudfront.tf` | The CloudFront distribution |
| `infra/locals.tf` | Shared variables and logic |
| `infra/variable.tf` | Input variables (project name, participant ID, etc.) |
| `infra/provider.tf` | Tells Terraform to use AWS |
| `infra/output.tf` | Prints the URLs after deployment |

---

## How Terraform Discovers Our Lambda Functions

This is clever — Terraform automatically finds all our Python services
without us having to list them manually.

In `infra/locals.tf`:
```
python_dirs = [
  for file in fileset("../backend", "*/function.py") :
  dirname(file) if !startswith(dirname(file), "_")
]
```

This scans the `backend/` folder for any subfolder containing `function.py`.
It finds: `auth`, `employees`, `performance-reviews`, `development-plans`,
`competencies`, `training-records`.

It skips `_examples/` because it starts with `_`.

For each service found, Terraform automatically creates:
- A Lambda function
- An IAM role (permissions)
- A CloudWatch log group (for logs)
- An SQS dead letter queue
- A Lambda Function URL

---

## How Terraform Passes Config to Lambda

The database credentials and other settings are passed to Lambda as
environment variables. In `infra/locals.tf`:

```
environment_variables = {
  IS_LOCAL      = "false"
  POSTGRES_HOST = <aurora endpoint>
  POSTGRES_PORT = "5432"
  POSTGRES_NAME = <database name>
  POSTGRES_USER = <username>
  POSTGRES_PASS = <password>
}
```

Our Python code reads these with `os.environ.get("POSTGRES_HOST")`.
This means no passwords are hardcoded in the Python files.

---

## Terraform Commands (Used by the Shell Scripts)

You do not need to run these manually — the shell scripts do it for you.
But it is good to know what happens:

```sh
terraform init      # Download required plugins (AWS provider, etc.)
terraform plan      # Show what will be created/changed (preview)
terraform apply     # Actually create/update the infrastructure
terraform destroy   # Delete everything (used by clean-up.sh)
```

---

## LocalStack — Terraform for Local Development

When developing locally, we do not want to create real AWS resources
(that costs money and takes time). Instead we use **LocalStack**.

LocalStack is a tool that runs fake AWS services on your laptop.
It pretends to be AWS — Lambda, S3, SQS, CloudFront — all running locally.

When `start-dev.sh` runs, it:
1. Starts LocalStack in Docker
2. Runs Terraform against LocalStack (not real AWS)
3. Creates fake Lambda functions, fake S3, fake SQS locally
4. Starts the React dev server

This lets you develop and test everything without touching real AWS.

---

## How to Check What Terraform Created

After deployment, Terraform prints the outputs:

```
api_base_url = "https://d2uu9oauk54q2c.cloudfront.net"
lambda_urls = {
  "coding-workshop-auth-b924649a" = "https://yezdmposxcjpp4floi7lwapon40idvkj..."
  ...
}
website_url = "https://d2uu9oauk54q2c.cloudfront.net"
```

To see these again at any time:
```sh
cd infra
terraform output
```
