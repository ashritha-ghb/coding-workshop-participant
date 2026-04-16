# Setup

## Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 16
- Docker Desktop
- LocalStack CLI — `pip install localstack`
- AWS CLI v2
- Terraform 1.5+

## Local Development

### 1. Clone and configure

```sh
git clone https://github.com/ashritha-ghb/coding-workshop-participant
cd coding-workshop-participant
```

Set your workshop credentials:
```sh
echo "export AWS_REGION='ap-south-1'" >> ~/.bashrc
echo "export EVENT_ID='4f74fc2f'" >> ~/.bashrc
echo "export PARTICIPANT_ID='b924649a'" >> ~/.bashrc
echo "export PARTICIPANT_CODE='Excited-Baw\$Bjle-Piglet'" >> ~/.bashrc
echo "export LOCALSTACK_AUTH_TOKEN='your-token'" >> ~/.bashrc
source ~/.bashrc
```

### 2. Run participant setup

```sh
./bin/setup-participant.sh
./bin/setup-environment.sh
```

### 3. Start the dev environment

```sh
./bin/start-dev.sh
```

This starts PostgreSQL, MongoDB, LocalStack, deploys all Lambda functions locally, and starts the React dev server.

- Frontend: http://localhost:3000
- API proxy: http://localhost:3001/api

### 4. Create your first account

```sh
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"Admin1234!","full_name":"Admin User","role":"admin"}'
```

Open http://localhost:3000 and sign in.

## Adding a New Backend Service

```sh
cp -R backend/_examples/python-service backend/my-service
```

Edit `backend/my-service/function.py`. Terraform auto-discovers it on next deploy.

Restart the dev environment to pick up the new service:
```sh
./bin/start-dev.sh
```

## Running Tests

```sh
pip install pytest pytest-cov psycopg[binary]
pytest backend/tests/ -v
```

## Deploy to AWS

```sh
./bin/deploy-backend.sh
./bin/deploy-frontend.sh
```

The CloudFront URL is printed at the end of `deploy-frontend.sh`.

## Tear Down

```sh
./bin/clean-up.sh
```

Removes all AWS resources. This cannot be undone.
