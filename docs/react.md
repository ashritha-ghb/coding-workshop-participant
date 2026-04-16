# React — What It Is and What We Did With It

## What is React?

React is a JavaScript library created by Facebook for building user interfaces.
A user interface is everything you see on a webpage — buttons, forms, menus, tables.

Before React, developers had to manually update the webpage every time data changed.
React introduced a smarter approach: you describe what the page should look like,
and React automatically updates only the parts that changed.

**Simple analogy:** Imagine a scoreboard at a cricket match. Every time a run is scored,
only the score number changes — not the entire board. React works the same way.
It updates only what needs to change, making the app fast and smooth.

---

## How React Works — The Basics

### Components
React breaks the UI into small reusable pieces called **components**.
Each component is a JavaScript function that returns what should be displayed.

Example: Our `Login` component returns the login form.
Our `DataTable` component returns a table. We reuse `DataTable` on every page.

### State
State is data that can change. When state changes, React re-renders the component.

Example: When you type in the email field, the `form` state updates.
When the API returns an error, the `apiError` state updates and the red alert appears.

### Props
Props are values passed from a parent component to a child component.

Example: We pass `columns` and `rows` as props to `DataTable`.
The same `DataTable` component works for employees, reviews, plans — all pages.

---

## What We Built With React

### Pages (8 total)

| Page | File | What it does |
|------|------|-------------|
| Login | `frontend/src/pages/Login.jsx` | Email/password form, calls auth API |
| Register | `frontend/src/pages/Register.jsx` | Create new account with role selection |
| Dashboard | `frontend/src/pages/Dashboard.jsx` | Stats overview, recent reviews, skill gaps |
| Employees | `frontend/src/pages/Employees.jsx` | List, search, add, edit, delete employees |
| Employee Detail | `frontend/src/pages/EmployeeDetail.jsx` | One employee's profile + their reviews + plans |
| Performance Reviews | `frontend/src/pages/PerformanceReviews.jsx` | Full CRUD for reviews |
| Development Plans | `frontend/src/pages/DevelopmentPlans.jsx` | Full CRUD for career plans |
| Competencies | `frontend/src/pages/Competencies.jsx` | Skill levels, gap tracking |
| Training Records | `frontend/src/pages/TrainingRecords.jsx` | Courses, certifications |

### Components (reusable pieces)

| Component | File | What it does |
|-----------|------|-------------|
| Layout | `frontend/src/components/Layout.jsx` | Sidebar + AppBar that wraps all pages |
| DataTable | `frontend/src/components/DataTable.jsx` | Reusable table used on every list page |
| ConfirmDialog | `frontend/src/components/ConfirmDialog.jsx` | "Are you sure?" popup before deleting |

### Context (shared state)

`frontend/src/context/AuthContext.jsx` — stores the logged-in user and token.
Every component can access the current user and their role from here.

### Services (API calls)

`frontend/src/services/api.js` — a configured axios client that:
- Automatically adds the JWT token to every request
- Redirects to login if the server returns 401 (unauthorized)

---

## How React Connects to the Backend

When you click "Add Employee" and submit the form:

1. React collects the form data
2. React calls `api.post('/employees', formData)`
3. The axios client adds `Authorization: Bearer <token>` to the request header
4. The request goes to the proxy (local) or CloudFront (production)
5. The employees Lambda receives it, validates it, saves to database
6. Lambda returns the new employee record
7. React adds it to the list and closes the dialog

---

## How to Test React Locally

Make sure the dev environment is running first (`./bin/start-dev.sh`).

Then open the browser at http://localhost:3000

To see React errors, press **F12** in the browser → **Console** tab.

To see API calls, press **F12** → **Network** tab → filter by "Fetch/XHR".
Every API call shows the URL, request body, and response.

---

## Material UI — The Design Library

Material UI (MUI) is a library of pre-built React components that follow
Google's Material Design guidelines. We used it for:

- `Button`, `TextField`, `MenuItem` — form elements
- `Card`, `CardContent` — the white boxes on the dashboard
- `Table`, `TableRow`, `TableCell` — the data tables
- `Drawer`, `AppBar`, `Toolbar` — the sidebar and top bar
- `Chip` — the colored labels (role badges, status badges)
- `Dialog` — the popup forms for creating/editing records
- `CircularProgress` — the loading spinner

---

## React Responsive — Mobile Support

`react-responsive` lets us detect screen size and show different layouts.

On desktop: permanent sidebar always visible
On mobile: sidebar hidden, hamburger menu button appears in top bar

This is what makes the app "responsive" — it adapts to the screen size.
