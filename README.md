# WriteSpace

WriteSpace is a browser-local blogging workspace built with React, Vite, React Router, and Tailwind CSS. It provides a complete demonstration workflow for creating local accounts, writing and managing posts, and administering users without a backend, database, or runtime API.

All application data remains in the current browser profile through `localStorage`. Data is not synchronized between browsers or devices.

## Demo-only security and privacy boundary

> **WriteSpace is a browser-local demonstration application. It is not a secure authentication or publishing system.**

- Authentication and authorization are simulated entirely in the browser.
- Passwords are stored as plaintext in `localStorage`.
- Client-side route and permission checks are not a security boundary.
- Posts, accounts, and sessions are not encrypted.
- Data can be viewed or changed through browser developer tools.
- Clearing site data, using private browsing, or changing browser profiles can remove or isolate saved content.
- There is no account recovery, backup, synchronization, or server-side validation.
- Do not enter real passwords, personal information, confidential writing, or other sensitive content.
- No functional runtime network requests are required after the static application assets load.

The built-in demonstration administrator credentials are:

- Username: `admin`
- Password: `admin`

Use these credentials only for local evaluation.

## Features

### Public experience

- Responsive product landing page
- Product feature overview
- Preview of the three newest browser-local posts
- Registration and login actions
- Role-aware dashboard link for signed-in accounts
- Accessible not-found page

### Authentication

- Built-in virtual Admin account
- Browser-local user registration
- Case-insensitive username matching
- Reserved `admin` username
- Role-aware post-login redirects
- Cross-tab session synchronization through browser storage events
- Visible storage and malformed-session recovery messages

### Blogging

- Newest-first post listing
- Full plain-text post reader
- Post creation with live character counters
- Owner-only editing and deletion for regular users
- Full post management for administrators
- Confirmation before destructive actions
- Plain-text rendering with preserved line breaks
- Post and storage capacity protection

### Administration

- Dashboard statistics for posts, users, administrators, and regular users
- Management controls for the five newest posts
- Local account creation with selectable user or admin roles
- Responsive desktop table and mobile account cards
- Protected built-in Admin account
- Self-deletion prevention
- User deletion without cascading post deletion

### Reliability and accessibility

- Structured storage, validation, and domain errors
- Safe handling of malformed or schema-invalid local data
- Failed writes preserve controlled form values
- Keyboard-operable navigation and account menus
- Persistent form labels and associated validation messages
- Accessible alerts, status messages, controls, and focus rings
- Responsive layouts for mobile, tablet, and desktop widths

## Technology stack

- JavaScript and JSX
- React 18
- React DOM 18
- React Router DOM 6
- Vite 5
- Tailwind CSS 3.4
- PostCSS
- Autoprefixer
- PropTypes
- Vitest
- React Testing Library
- `@testing-library/user-event`
- `@testing-library/jest-dom`
- jsdom
- axe-core

No backend, serverless function, database, API client, analytics service, or runtime environment variable is required.

## Requirements

- Node.js 18 or newer
- npm compatible with the installed Node.js release
- A modern browser with:
  - `localStorage`
  - `crypto.randomUUID()`
  - React-supported JavaScript features

Restricted browser storage or unavailable UUID generation is reported visibly and prevents unsafe mutations.

## Setup

Clone or extract the repository, then install dependencies:

```sh
npm install
```

Start the Vite development server:

```sh
npm run dev
```

Open the local URL shown by Vite, typically:

```text
http://localhost:5173
```

No `.env` file is required. The included `.env.example` documents that WriteSpace has no runtime environment variables.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Create the production static bundle in `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run start` | Serve the production preview on `0.0.0.0`. |
| `npm test` | Run the complete Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |

A typical production verification flow is:

```sh
npm test
npm run build
npm run preview
```

## Usage

### Guest workflow

1. Open `/`.
2. Review the product overview and any locally saved post previews.
3. Select **Create a demo account** or **Register**.
4. Enter a display name, username, and fake demonstration password.
5. After successful registration, WriteSpace starts a local session and opens `/blogs`.

Guests can view post previews on the landing page, but full post routes require a local session.

### Regular user workflow

A regular user can:

- Browse all locally saved posts.
- Read complete posts.
- Create posts.
- Edit or delete posts they authored.
- View posts written by other local accounts.
- Log out without deleting users or posts.

A regular user cannot:

- Open administrator routes.
- Edit or delete another account’s posts.
- Create or remove local accounts.

### Administrator workflow

Log in with the built-in demo credentials:

```text
Username: admin
Password: admin
```

An administrator can:

- Open the administrator dashboard.
- Review workspace statistics.
- Create posts.
- Edit or delete any post.
- Create regular-user or administrator accounts.
- Delete persisted local accounts other than the current account.
- View all regular authenticated routes.

The built-in Admin account is virtual and cannot be deleted.

### Logout

Use the account menu in the authenticated navigation and select **Log out**.

Logout removes only the `writespace_session` key. Saved users and posts remain in the browser. If session removal fails, WriteSpace clears its in-memory session, returns to the landing page, and warns that the persisted browser session may still exist.

## Routes

| Route | Guest | Regular user | Administrator | Purpose |
| --- | --- | --- | --- | --- |
| `/` | Allowed | Allowed | Allowed | Public landing page |
| `/login` | Allowed | Redirects to `/blogs` | Redirects to `/admin` | Local login |
| `/register` | Allowed | Redirects to `/blogs` | Redirects to `/admin` | Local registration |
| `/blogs` | Redirects to `/login` | Allowed | Allowed | Post listing |
| `/blog/:id` | Redirects to `/login` | Allowed | Allowed | Full post reader |
| `/write` | Redirects to `/login` | Allowed | Allowed | Post creation |
| `/edit/:id` | Redirects to `/login` | Owner only | Allowed | Post editing |
| `/admin` | Redirects to `/login` | Redirects to `/blogs` | Allowed | Administrator dashboard |
| `/users` | Redirects to `/login` | Redirects to `/blogs` | Allowed | Local account management |
| Any unknown route | Public 404 | Role-aware 404 | Role-aware 404 | Not-found experience |

An authenticated edit request for a missing post displays a post-not-found state. A regular user attempting to edit another account’s post is redirected to `/blogs`.

## Browser-local storage

WriteSpace owns three `localStorage` keys:

| Key | Contents |
| --- | --- |
| `writespace_posts` | JSON array of browser-local posts |
| `writespace_users` | JSON array of persisted local accounts |
| `writespace_session` | Current session projection without a password |

### Storage limits

| Resource | Limit |
| --- | --- |
| Total demo accounts | 10 |
| Persisted local accounts | 9 |
| Virtual built-in Admin accounts | 1 |
| Posts | 100 |
| Display name | 1–80 trimmed characters |
| Username | 3–30 letters, numbers, or underscores |
| Demo password | 1–128 characters |
| Post title | 1–150 trimmed characters |
| Post content | 1–10,000 characters with non-whitespace content |

The built-in Admin account is not stored in `writespace_users`, but it counts toward the ten-account total.

### Stored post shape

Each post contains:

- `id`
- `title`
- `content`
- `createdAt`
- `authorId`
- `authorName`

### Stored user shape

Each persisted account contains:

- `id`
- `displayName`
- `username`
- `password`
- `role`
- `createdAt`

Passwords are intentionally plaintext for this local demonstration.

### Stored session shape

The session contains only:

- `userId`
- `username`
- `displayName`
- `role`

### Damaged storage behavior

WriteSpace does not silently overwrite malformed or unsupported collections.

If stored post or user data cannot be parsed or validated:

- The damaged records are not exposed to the UI.
- The affected collection is presented as unavailable rather than empty.
- Ordinary mutation controls are disabled.
- The original stored value remains untouched.
- A deliberate repair must use the storage repair utility with explicit confirmation.

Missing collection keys are treated as valid empty collections.

## Validation and authorization behavior

Usernames are compared using trimmed, case-insensitive normalization. Entered username casing is otherwise preserved after trimming.

Post management follows these rules:

- Administrators may manage every valid post.
- Regular users may manage only posts whose `authorId` matches their session `userId`.
- Permission checks are applied in the UI and repeated in domain operations.
- Deletion requires explicit confirmation.
- Editing changes only a post’s title and content; identity and author metadata remain unchanged.

Account management follows these rules:

- Only administrators may create or delete managed accounts.
- The built-in Admin account cannot be deleted.
- The currently signed-in account cannot delete itself.
- Deleting an account does not delete its posts.
- Existing posts retain the deleted account’s denormalized author name.

These controls support the demonstration workflow but do not provide real security.

## Testing

Run all tests once:

```sh
npm test
```

Run tests while developing:

```sh
npm run test:watch
```

The test suite covers:

- Storage reads, writes, corruption, quota errors, and repair confirmation
- Authentication, registration, session persistence, and logout
- Username normalization and account capacity
- Post creation, editing, deletion, ownership, and capacity
- Administrator account management and statistics
- Route guards and role-aware redirects
- Landing, authentication, blog, and admin user flows
- Failed-write form preservation
- Cross-tab session removal
- Runtime network isolation
- Accessible labels, controls, alerts, headings, and navigation behavior

Tests use jsdom and browser API stubs. They do not make real network requests.

## Production build

Create the optimized static output:

```sh
npm run build
```

The generated files are written to:

```text
dist/
```

Preview the generated build:

```sh
npm run preview
```

For access from another machine or container:

```sh
npm run start
```

## Static deployment handoff

WriteSpace is a static single-page application. Deploy the generated `dist/` directory using a host that supports SPA history fallback.

The included `vercel.json` rewrites every route to `index.html`:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This rewrite is required so direct navigation to routes such as `/blogs`, `/blog/:id`, `/admin`, or `/users` loads the React application instead of returning a hosting-platform 404.

There are no Vercel functions, API routes, secrets, server credentials, or runtime environment variables.

A static handoff should include:

1. A successful `npm test`.
2. A successful `npm run build`.
3. The generated `dist/` artifact or source repository.
4. SPA fallback configuration equivalent to `vercel.json`.
5. HTTPS supplied by the hosting platform.
6. Verification of direct deep links and browser refreshes.

Application rollback is artifact-based: redeploy a previously successful static build. Existing browser-local data is not changed by a static artifact rollback.

## Folder structure

```text
.
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── AlertMessage.jsx
│   │   ├── Avatar.jsx
│   │   ├── BlogCard.jsx
│   │   ├── FormField.jsx
│   │   ├── Navbar.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── PublicNavbar.jsx
│   │   ├── StatCard.jsx
│   │   └── UserRow.jsx
│   ├── pages/
│   │   ├── AdminDashboard.jsx
│   │   ├── Home.jsx
│   │   ├── LandingPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── NotFoundPage.jsx
│   │   ├── ReadBlog.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── UserManagement.jsx
│   │   └── WriteBlog.jsx
│   ├── test/
│   │   └── setupTests.js
│   ├── utils/
│   │   ├── auth.js
│   │   ├── constants.js
│   │   ├── domain.js
│   │   ├── storage.js
│   │   └── validation.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env.example
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vercel.json
├── vite.config.js
└── vitest.config.js
```

Tests are colocated with the application modules and use `.test.js` or `.test.jsx` filenames.

## Architectural boundaries

- `App.jsx` owns the browser router and current session state.
- `main.jsx` only mounts the React application.
- Pages coordinate route behavior and user interactions.
- Shared components are presentational and do not persist data.
- `auth.js` owns authentication and session operations.
- `domain.js` owns post, account, and statistics operations.
- `storage.js` owns validated collection persistence.
- `validation.js` owns runtime schemas and form validation.
- Browser APIs are the only runtime platform dependencies.
- No React Context or external state-management library is used.

## Known limitations

- Authentication is simulated and can be bypassed by changing browser data.
- Passwords are plaintext.
- There is no backend or server-side authorization.
- Data is limited to one browser profile and origin.
- Data does not synchronize across tabs beyond session storage events.
- Concurrent collection changes in multiple tabs can overwrite one another.
- There is no transactional local storage primitive.
- There is no password reset or account recovery.
- There is no post draft, revision history, autosave, search, import, or export.
- There are no uploads or rich-text rendering.
- There is no automatic backup or migration system.
- Clearing site data permanently removes local accounts, posts, and sessions.
- Private browsing behavior depends on the browser.
- Browser storage quotas and privacy restrictions vary by platform.
- Deleting an account leaves its existing posts in place.
- The application must not be used for real credentials or sensitive content.

## User story traceability

This implementation cluster supports the supplied story references:

- `SCRUM-2015`
- `SCRUM-2014`
- `SCRUM-2016`

The supplied story bodies were not available in the repository documentation. Final release traceability should be reconciled against the approved Jira stories and architecture documentation.

## License and private project status

This package is marked `"private": true` and is not intended for publication to the npm registry. It is maintained as a private demonstration and evaluation project.

The current package metadata declares the MIT license. Any redistribution must follow the repository owner’s approved licensing and distribution policy.