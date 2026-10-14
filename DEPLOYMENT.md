# WriteSpace Deployment and CI/CD Handoff

WriteSpace is a static single-page application built with Vite. It has no backend, database, API routes, serverless functions, runtime secrets, or runtime environment variables.

All accounts, sessions, and blog posts remain in the browser profile through `localStorage`. Deploying a new application build does not migrate, synchronize, back up, or remove that browser-local data.

## Requirements

- Node.js 18 or newer
- npm compatible with the installed Node.js release
- A static hosting platform with HTTPS
- SPA history fallback support
- A modern browser with:
  - `localStorage`
  - `crypto.randomUUID()`

## Install dependencies

For a local checkout:

```sh
npm install
```

When a committed npm lockfile is available in CI, use a clean deterministic install:

```sh
npm ci
```

Do not use `npm ci` when the handoff does not include a compatible lockfile.

## Production build

Run the test suite before producing a deployment artifact:

```sh
npm test
npm run build
```

The production build is written to:

```text
dist/
```

Only the generated `dist/` directory is required by a generic static host. Do not deploy `node_modules/`, local environment files, test output, or browser-local data.

A successful build must complete without adding server code or requesting runtime configuration.

## Local production preview

Build and preview the application locally:

```sh
npm run build
npm run preview
```

Vite prints the local preview URL, typically:

```text
http://localhost:4173
```

To expose the preview server on all network interfaces for container or handoff verification:

```sh
npm run start
```

The `start` script runs:

```text
vite preview --host 0.0.0.0
```

The Vite preview server is for verification, not a production hosting service.

## Runtime environment variables

WriteSpace requires no runtime environment variables.

The repository includes `.env.example` only to document this boundary:

```text
# WriteSpace is browser-local and requires no runtime environment variables.
# Do not add secrets, API credentials, or server configuration to this file.
```

Deployment configuration must not introduce:

- API credentials
- Database connection strings
- Authentication secrets
- Session signing keys
- Storage service credentials
- Analytics tokens
- Server URLs
- Private Vite variables
- Public `VITE_*` variables containing secrets

Vite variables are embedded into client assets during the build and are visible to users. They are not a safe place for secrets.

No `.env`, `.env.production`, or similar environment file should be included in a deployment artifact.

## Vercel static handoff

The repository contains the required `vercel.json`:

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

This rewrite sends application routes to `index.html`, allowing React Router to resolve the requested path in the browser.

The Vercel project should use the repository’s normal Vite static build behavior. The handoff must not add Vercel Functions, API routes, middleware, edge functions, cron jobs, databases, storage products, or server-rendering infrastructure.

The checked-in `vercel.json` must remain limited to the SPA rewrite. It must not add:

- `builds`
- `buildCommand`
- `outputDirectory`
- `installCommand`
- `framework`
- Function configuration
- Runtime declarations
- API rewrites
- Proxy destinations

After deployment, verify that the site loads over HTTPS and that direct navigation to application routes returns the SPA rather than a hosting-platform 404.

## Generic static-host deployment

For a non-Vercel static host:

1. Install dependencies.
2. Run `npm test`.
3. Run `npm run build`.
4. Publish the contents of `dist/`.
5. Configure all non-asset application paths to serve `index.html`.
6. Preserve normal 404 behavior for missing static assets where the platform supports separate asset and application fallback rules.
7. Verify direct links and browser refreshes.

Equivalent fallback behavior is conceptually:

```text
/*  ->  /index.html  200
```

The exact syntax depends on the hosting platform. A redirect to `/` is not equivalent because it can discard the requested route. The platform should serve `index.html` while retaining the original browser URL.

If the host cannot provide SPA history fallback, direct navigation to routes such as `/blogs` or `/admin` will fail even if navigation from `/` works.

## Direct-route verification

Verify the root route first:

```text
/
```

Then test direct navigation and browser refreshes for:

```text
/login
/register
/blogs
/blog/example-post-id
/write
/edit/example-post-id
/admin
/users
/unknown/path
```

Expected behavior depends on browser-local session state:

- `/login` and `/register` remain available to guests.
- Protected routes redirect guests to `/login`.
- Regular users attempting to open administrator routes are redirected to `/blogs`.
- Administrators can open `/admin` and `/users`.
- Missing post identifiers show the application’s post-not-found state after authentication.
- Unknown routes show the application’s role-aware 404 page.
- Refreshing any route loads the React application instead of a host-generated 404.

A route returning `index.html` is only the first check. Complete verification in a browser so React Router, session state, and `localStorage` behavior are exercised.

## Browser-local data and origin stability

WriteSpace owns these browser storage keys:

```text
writespace_posts
writespace_users
writespace_session
```

Browser-local data is scoped to the deployment origin. Changing any part of the origin can make existing data appear unavailable, including:

- Scheme changes, such as HTTP to HTTPS
- Hostname changes
- Subdomain changes
- Port changes
- Preview URL changes

For example, data stored on a temporary preview domain is not automatically available on the production domain.

Deployment operators must not claim that application deployment provides:

- Account migration
- Data synchronization
- Backups
- Disaster recovery for local content
- Cross-device access
- Account recovery
- Password security

Clearing site data or changing browser profiles can permanently remove or isolate saved accounts and posts.

## CI/CD quality gates

A deployment pipeline should stop immediately when any required gate fails.

### Required gates

1. Use Node.js 18 or newer.
2. Install dependencies from the repository manifest and lockfile when present.
3. Run the complete test suite:

   ```sh
   npm test
   ```

4. Create a production build:

   ```sh
   npm run build
   ```

5. Confirm that `dist/index.html` exists.
6. Confirm that `vercel.json` contains the SPA rewrite and no prohibited server configuration.
7. Scan the source and deployment configuration for prohibited backend or cloud features.
8. Deploy the immutable static artifact.
9. Run post-deployment smoke tests over HTTPS.
10. Verify direct-route loading and refresh behavior.

### Recommended test coverage in CI

The existing test suite covers core behavior including:

- Storage reads and writes
- Malformed and schema-invalid local data
- Storage quota and availability failures
- Authentication and registration
- Session persistence and logout
- Cross-tab session removal
- Route guards and role redirects
- Post creation, reading, editing, and deletion
- Ownership and administrator permissions
- Account management and capacity limits
- Failed-write form preservation
- Accessible labels, alerts, controls, and navigation
- Runtime network isolation

CI must not replace the complete suite with only a build check.

### Recommended artifact checks

Verify that the deployment artifact:

- Contains `index.html` and generated static assets
- Does not contain `.env` files
- Does not contain source credentials or API keys
- Does not contain serverless function directories
- Does not contain backend packages or server entry points
- Does not contain test coverage output
- Does not contain `node_modules`
- Does not depend on runtime configuration injection

### Post-deployment smoke tests

At minimum, verify:

- `/` renders the public landing page.
- `/login` renders the login form.
- `/register` renders the registration form.
- A direct request to `/blogs` loads the SPA and presents the appropriate guest or authenticated behavior.
- A direct request to `/admin` loads the SPA and applies the appropriate role guard.
- An unknown route renders the application’s 404 experience.
- Refreshing a nested route does not produce a platform 404.
- The site is served over HTTPS.
- Static assets load without mixed-content errors.
- No functional API, fetch, or XHR request is required after application assets load.
- Browser storage failures are displayed visibly rather than causing a blank page.

Use only fake demonstration credentials and content during smoke testing.

## Security and privacy boundary

WriteSpace is not a secure authentication or publishing system.

The deployment must preserve clear user messaging that:

- Authentication and authorization are simulated in the browser.
- Passwords are stored as plaintext in `localStorage`.
- Client-side route guards are not a security boundary.
- Browser-local content is not encrypted.
- Browser developer tools can inspect or modify application data.
- Users must not enter real passwords, personal information, confidential writing, or sensitive content.

HTTPS protects static asset delivery in transit. It does not make the browser-local authentication model secure.

## Prohibited deployment features

Do not add or enable the following for this application:

- Backend application servers
- API routes
- Vercel Functions
- Edge Functions
- Serverless Functions
- Middleware requiring a server runtime
- Server-side rendering
- Databases
- Managed authentication providers
- Remote session stores
- Object storage or upload services
- Background workers
- Message queues
- Scheduled jobs or cron jobs
- Webhooks
- Analytics or tracking services
- Runtime secret injection
- Runtime environment configuration
- Proxying to external APIs
- Automatic upload or synchronization of browser-local data

The application’s functional runtime must remain browser-local after the static assets load.

## Rollback

Rollback is artifact-based:

1. Identify the last successfully tested static build.
2. Redeploy that immutable `dist/` artifact.
3. Verify the root and direct routes.
4. Confirm that static assets are served from the rolled-back release.
5. Repeat authentication and browser-storage smoke tests with fake data.

A rollback changes application assets only. It does not:

- Restore deleted posts or users
- Recover cleared browser storage
- Revert `localStorage` values
- Move data between origins
- Repair malformed browser-local collections
- End sessions stored in a browser

The current storage schema has no automated migration process. Any future schema change must include explicit compatibility and rollback planning before release.

## Release handoff checklist

A production handoff should include:

- Source revision or release identifier
- Node.js version used by CI
- Successful `npm test` result
- Successful `npm run build` result
- Immutable `dist/` artifact or reproducible source checkout
- Verified SPA fallback configuration
- Verified HTTPS deployment URL
- Direct-route and refresh test results
- Confirmation that no runtime environment variables are configured
- Confirmation that no prohibited cloud or server features are enabled
- Confirmation that only fake demonstration data was used
- Rollback artifact identifier
- Known limitations and browser-local data warning

## Operational troubleshooting

### Direct routes return a platform 404

Confirm that every application route is rewritten to `/index.html` without changing the requested browser URL. On Vercel, verify the checked-in `vercel.json` is deployed unchanged.

### Static assets return `index.html`

The host may be applying an overly broad fallback before checking for files. Configure the host to serve existing files normally and use `index.html` only as the fallback for application paths.

### Data appears missing after deployment

Confirm that the browser is using the same scheme, hostname, port, and browser profile as before. Browser-local data is not shared between preview and production origins.

### Storage warnings appear

Check browser privacy settings, private-browsing restrictions, storage permissions, and available quota. Do not add a backend as an automatic workaround and do not overwrite malformed collections without deliberate confirmation.

### Login state differs across tabs

Session removal is synchronized through browser storage events, but collection updates are not transactional across tabs. Reload the affected view and avoid simultaneous edits in multiple tabs.

### A rollback does not restore content

This is expected. Deployment artifacts do not contain user accounts, sessions, or posts. Those values exist only in each browser profile’s `localStorage`.