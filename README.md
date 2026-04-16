# Coding Workshop

The goal of this coding workshop is to enable and assess the hands-on skills
of participants through development of a practical technical solution that
solves a theoretical business problem.

## Getting Started

Navigate to [Coding Workshop - Main Guide](./docs/README.md) to get started.

## Implementation

This repository contains a full-stack employee performance and development
management platform built for ACME Inc.

### Running Locally

```sh
# Clone and set up credentials
echo "export AWS_REGION='ap-south-1'" >> ~/.bashrc
echo "export EVENT_ID='4f74fc2f'" >> ~/.bashrc
echo "export PARTICIPANT_ID='b924649a'" >> ~/.bashrc
echo "export PARTICIPANT_CODE='Excited-Baw\$Bjle-Piglet'" >> ~/.bashrc
source ~/.bashrc

./bin/setup-participant.sh
./bin/setup-environment.sh
./bin/start-dev.sh
```

Frontend runs at http://localhost:3000, backend API at http://localhost:3001/api.

### First Time Setup

Register an admin account after starting the dev environment:

```sh
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"Admin1234!","full_name":"Admin User","role":"admin"}'
```

Then open http://localhost:3000 and sign in.

### Deploy to AWS

```sh
./bin/deploy-backend.sh
./bin/deploy-frontend.sh
```

### Running Tests

```sh
pip install pytest pytest-cov psycopg[binary]
pytest backend/tests/ -v
```

### What Was Built

**Backend** — 6 Python Lambda services:
- `auth` — JWT login, registration, token refresh
- `employees` — employee profiles and directory
- `performance-reviews` — review cycles, ratings, feedback
- `development-plans` — career goals and progress tracking
- `competencies` — skill levels and gap analysis
- `training-records` — courses, certifications, completions

**Frontend** — React + Material UI:
- Login and registration pages
- Dashboard with live stats and skill gap summary
- Full CRUD pages for all 5 domains
- Role-based navigation and action visibility
- Search and filter on all list views
- Responsive layout for mobile and desktop

**Roles:**
- Admin — full access including user management
- Manager — manage all records and employees
- Contributor — create and update, no delete
- Viewer — read-only access to own records

### Known Limitations

- Employee ID is typed manually in forms rather than selected from a dropdown
- No email notifications when reviews are submitted or approved

## Contributing

See the [CONTRIBUTING](./CONTRIBUTING.md) resource for more details.

## License

This library is licensed under the MIT-0 License.
See the [LICENSE](./LICENSE) resource for more details.

## Roadmap

See the
[open issues](https://github.com/eistrati/coding-workshop-participant/issues)
for a list of proposed roadmap features (and known issues).

## Security

See the
[Security Issue Notifications](./CONTRIBUTING.md#security-issue-notifications)
resource for more details.

## Authors

The following people have contributed to this workshop:

* Colin Heilman - [@heilmancs](https://github.com/heilmancs)
* Eugene Istrati - [@eistrati](https://github.com/eistrati)
* Isaiah Cornelius Smith - [@corneliusmith](https://github.com/corneliusmith)
* Juan Arevalo - [@jparevalo27](https://github.com/jparevalo27)
* Michael Annucci - [@michael-annucci](https://github.com/michael-annucci)

## Feedback

We'd love to hear your feedback! Please:

* ⭐ Star the repository if you find it helpful
* 🐛 Report issues on GitHub
* 💡 Suggest improvements
* 📝 Share your experience
