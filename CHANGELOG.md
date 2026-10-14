# Changelog

All notable changes to WriteSpace are documented in this file.

## [1.0.0] - 2026-10-14

Initial release of the browser-local WriteSpace blogging workspace.

### Added

#### Public experience

- Responsive landing page with product overview, feature highlights, and previews of the three newest locally saved posts.
- Guest navigation to registration and login.
- Role-aware dashboard actions for signed-in accounts.
- Accessible, role-aware not-found experience for unknown routes.

#### Authentication and roles

- Browser-local registration and login with controlled, validated forms.
- Built-in virtual administrator account for demonstration:
  - Username: `admin`
  - Password: `admin`
- Regular-user and administrator roles with role-aware navigation and redirects.
- Case-insensitive username matching while preserving trimmed display casing.
- Reserved `admin` username and duplicate-username protection.
- Session persistence under `writespace_session` without storing passwords in the session object.
- Cross-tab session synchronization through browser storage events.
- Logout that removes only the saved session while retaining users and posts.
- Administrator-only account creation and deletion.
- Protection against deleting the built-in Admin account or the currently signed-in account.

#### Blogging

- Newest-first authenticated post listing.
- Full plain-text post reader with preserved line breaks.
- Post creation and editing with validation and live character counters.
- Owner-only post management for regular users.
- Full post management for administrators.
- Confirmation before deleting posts.
- Post-not-found states for missing reader and editor routes.
- Safe React text rendering so stored markup is not interpreted as HTML.
- Limits of 100 posts, 150 title characters, and 10,000 content characters.

#### Administration

- Administrator dashboard with totals for posts, all accounts, administrators, and regular users.
- Management controls for the five newest posts.
- Responsive local-account management using a desktop table and mobile cards.
- Creation of regular-user and administrator accounts.
- Maximum of 10 total demo accounts, including the virtual built-in Admin.
- Account deletion without cascading deletion of authored posts.

#### Browser-local storage

- Browser ownership of the following `localStorage` keys:
  - `writespace_posts`
  - `writespace_users`
  - `writespace_session`
- Exact runtime validation for post, user, and session schemas.
- Missing collection keys treated as valid empty collections.
- Structured storage results for unavailable storage, malformed JSON, invalid schemas, serialization failures, and quota exhaustion.
- Mutation blocking for malformed or schema-invalid collections to prevent silent data replacement.
- Explicitly confirmed collection repair utility.
- Immutable full-collection writes using one `localStorage.setItem` operation per mutation.
- UUID generation through `crypto.randomUUID()`.

#### Reliability and accessibility

- Failed writes preserve controlled form values and existing stored collections.
- Visible recovery guidance for restricted storage, damaged local data, quota failures, and logout persistence failures.
- Accessible labels, required-field indicators, associated help text, validation messages, alerts, and status regions.
- Keyboard-operable responsive navigation and account menus.
- Escape, outside-click, route-change, and focus-loss handling for open menus.
- Visible focus states and descriptive accessible names for management controls.
- Responsive layouts for mobile, tablet, and desktop viewports.
- Plain-text privacy warnings explaining the demonstration-only authentication and storage model.

#### Testing and build setup

- Vitest and React Testing Library coverage for storage, validation, authentication, sessions, routing, authorization, post workflows, administrator workflows, and accessibility behavior.
- Tests for malformed data, unavailable storage, quota failures, failed-write preservation, capacity limits, and cross-tab logout.
- Runtime network-isolation checks confirming that application workflows do not require `fetch`.
- Vite 5 production build configuration with React 18 and Tailwind CSS 3.4.
- Static production output generated in `dist/`.
- Development, test, build, preview, and hosted-preview npm scripts.
- Example environment file documenting that no runtime environment variables or secrets are required.

#### Deployment handoff

- Static Vercel handoff artifact with a single SPA history rewrite to `/index.html`.
- Deployment and CI/CD guidance covering tests, production builds, artifact checks, direct-route verification, HTTPS, rollback, and browser-origin stability.
- No backend, API routes, serverless functions, databases, managed authentication, analytics, or runtime secret injection.

### Security and privacy

- Authentication and authorization are simulated entirely in the browser.
- Passwords are intentionally stored as plaintext in `localStorage`.
- Client-side route and permission checks are not a security boundary.
- Accounts, sessions, and posts are not encrypted, synchronized, backed up, or recoverable by WriteSpace.
- Users are warned not to enter real passwords, personal information, confidential writing, or other sensitive content.

### Known limitations

- Data is limited to the current browser profile and deployment origin.
- Clearing site data, using another profile, or changing scheme, hostname, subdomain, or port can make saved data unavailable.
- There is no backend, secure identity system, password reset, account recovery, synchronization, backup, or disaster recovery.
- Collection updates are not transactional across tabs, so simultaneous edits can overwrite one another.
- Deleting an account leaves its existing posts and denormalized author name in place.
- There are no drafts, revisions, autosave, search, import, export, uploads, or rich-text rendering.
- Private-browsing behavior, storage availability, and quota limits depend on the browser.
- Static deployment and artifact rollback do not migrate, restore, remove, or otherwise modify browser-local data.

### Traceability

- `SCRUM-2015`
- `SCRUM-2014`
- `SCRUM-2016`

The supplied story bodies were unavailable. Release traceability remains provisional until reconciled with the approved Jira stories and architecture documentation.