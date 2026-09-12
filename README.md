# LANDLOGY

> **A unified real-estate technology platform built around a shared backend, centralized data, secure workflows, and scalable product architecture.**

---

## 1. Project Overview

LANDLOGY is a multi-platform real-estate ecosystem designed to support property discovery, property management, broker operations, customer enquiries, transactions, commissions, notifications, analytics, and future business automation.

The platform is composed of multiple client applications and a shared backend infrastructure.

The system must be designed so that all products work as parts of **one unified platform**, rather than as independent applications.

### Core Principle

> **One platform. One source of truth. One backend. One database. Multiple clients.**

---

# 2. High-Level Architecture

```text
                    LANDLOGY PLATFORM
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
     Client Apps      Client Apps      Client Apps
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
                    Shared Backend API
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
        Business Logic   Security     Services
                           │
                           ▼
                      PostgreSQL
                           │
                           ▼
                    External Services
```

### Mandatory Architecture Rule

Client applications must **never connect directly to PostgreSQL**.

All database operations must go through the shared backend.

```text
Client
   ↓
Backend API
   ↓
Business Logic
   ↓
PostgreSQL
```

Never:

```text
Client
   ↓
PostgreSQL
```

---

# 3. Repository Structure

```text
LANDLOGY/
│
├── seller-website/
├── buyer-website/
├── app/
├── backend/
│
├── README.md
└── .gitignore
```

Each major product has its own development environment and responsibilities, while following the global rules defined in this README.

Product-specific rules belong inside the respective product's README.

---

# 4. Product Independence vs Platform Unity

Each application may have its own:

* UI
* navigation
* components
* screens
* frontend logic
* platform-specific implementation
* deployment process

However, all applications must follow the same:

* backend contracts
* authentication model
* authorization rules
* database model
* business rules
* security standards
* naming conventions
* API standards
* data ownership rules
* lifecycle definitions

### Important

Frontend independence does **not** mean business-logic independence.

Business-critical rules must remain centralized in the backend.

---

# 5. Single Source of Truth

The backend is the authoritative source for:

* users
* roles
* permissions
* authentication
* authorization
* properties
* property ownership
* enquiries
* brokers
* customers
* transactions
* commissions
* notifications
* business workflows
* system states

Clients must not independently maintain conflicting versions of these rules.

---

# 6. Database Principles

LANDLOGY uses a centralized PostgreSQL database.

### Rules

1. Only the backend may access PostgreSQL.
2. Client applications must never contain database credentials.
3. Database credentials must never be committed to Git.
4. Database schema changes must be deliberate and documented.
5. Production schema must be controlled through migrations.
6. Destructive schema changes require explicit review.
7. Foreign-key relationships must enforce data integrity.
8. Important business records should not be physically deleted without a defined reason.
9. UUIDs should be preferred for externally exposed entity identifiers.
10. Database structure must support future products without unnecessary redesign.

### Database Flow

```text
Clients
   ↓
REST API
   ↓
Backend
   ↓
Database Layer
   ↓
PostgreSQL
```

---

# 7. Backend as the Business Authority

The backend must contain the actual business rules of the platform.

Examples:

* Who can create a property
* Who owns a property
* Who can modify a property
* Who can approve an enquiry
* Who can approve a broker
* Who can access commission information
* Which property states are valid
* Which users can perform a specific action
* Which transitions are allowed

The frontend may improve user experience with validation and UI restrictions, but it must never be trusted as the final authority.

---

# 8. API Principles

All client-server communication must happen through documented APIs.

### API Requirements

APIs should:

* use predictable URLs
* use appropriate HTTP methods
* return consistent response structures
* validate incoming data
* enforce authentication where required
* enforce authorization where required
* return meaningful HTTP status codes
* avoid leaking sensitive information
* remain independent of individual UI screens

### API Versioning

Public/backend APIs should use versioning where appropriate.

Recommended structure:

```text
/api/v1/...
```

Future breaking changes should use a new API version instead of silently breaking existing clients.

---

# 9. Authentication

Authentication must be centralized.

The platform must have one consistent authentication strategy across all clients.

### General Rules

* Passwords must never be stored in plaintext.
* Passwords must always be securely hashed.
* Authentication tokens must be handled securely.
* Secrets must never be hardcoded.
* Authentication failures must not expose sensitive information.
* Session/token expiration must be handled properly.
* Logout and token invalidation/revocation strategy must be defined.
* Sensitive authentication operations must be rate-limited.

---

# 10. Authorization and RBAC

Authentication answers:

> "Who are you?"

Authorization answers:

> "What are you allowed to do?"

Both are mandatory.

The platform must use role-based and permission-based authorization where required.

Example roles may include:

```text
ADMIN
BROKER
CUSTOMER
```

Additional roles may be introduced later if the business requires them.

### Mandatory Rule

Never trust a role, user ID, owner ID, or permission supplied directly by the client.

The backend must determine authorization using authenticated server-side identity and database records.

---

# 11. Ownership and Access Control

Resources must have clear ownership rules.

For example:

```text
User
  ↓
owns
  ↓
Property
```

When a user requests access to a resource, the backend must verify:

1. Who the authenticated user is.
2. What role/permissions they have.
3. Whether they own or are authorized to access the resource.
4. Whether the requested operation is permitted.

Never rely only on frontend restrictions.

---

# 12. Validation

Validation must happen at multiple levels.

### Client-side validation

Used for:

* better UX
* immediate feedback
* reducing invalid requests

### Backend validation

Used for:

* security
* data integrity
* business rules
* API protection

### Database constraints

Used for:

* structural integrity
* unique values
* required values
* relationships

The backend remains the final validation authority.

---

# 13. Error Handling

All APIs should follow a consistent error-handling strategy.

Errors should:

* use appropriate HTTP status codes
* contain safe messages
* provide useful information to legitimate clients
* avoid exposing stack traces in production
* avoid exposing database internals
* avoid exposing secrets
* be logged appropriately on the server

Example conceptual response:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data"
  }
}
```

The exact response contract should be maintained consistently across the platform.

---

# 14. Security Principles

Security is a platform-wide requirement, not a final-stage feature.

### Mandatory Rules

Never:

* commit passwords
* commit API keys
* commit JWT secrets
* commit database credentials
* expose private configuration to clients
* trust client-provided ownership
* trust client-provided roles
* return sensitive credentials in API responses
* log passwords or authentication tokens
* expose production stack traces

### Security should cover

* authentication
* authorization
* input validation
* rate limiting
* CORS
* security headers
* file uploads
* API abuse
* credential protection
* session/token handling
* database access
* sensitive logging
* dependency vulnerabilities

---

# 15. Environment Variables and Secrets

Environment-specific configuration must never be hardcoded.

Examples:

```text
DATABASE_URL
JWT_SECRET
JWT_REFRESH_SECRET
EMAIL_API_KEY
STORAGE_SECRET
THIRD_PARTY_API_KEY
```

Use environment configuration such as:

```text
.env
.env.example
```

### Rules

`.env` files containing secrets must never be committed.

`.env.example` should contain variable names and safe placeholder values only.

Example:

```env
DATABASE_URL=
JWT_SECRET=
EMAIL_API_KEY=
```

---

# 16. File and Image Storage

Large files and images should not be stored directly inside the Git repository.

Use appropriate external/object storage when required.

The backend should control:

* upload validation
* file type validation
* file size limits
* authorization
* storage references
* deletion rules
* access permissions

Clients should never receive unrestricted access to protected storage operations.

---

# 17. Data Lifecycle

Every major business entity should have a clearly defined lifecycle.

Example:

```text
Created
   ↓
Draft
   ↓
Under Review
   ↓
Approved / Active
   ↓
Completed / Sold
   ↓
Archived
```

Exact states depend on the entity.

### Rule

State transitions must be controlled by the backend.

A client must not be able to arbitrarily change a business-critical status.

---

# 18. Soft Delete and Data Preservation

Important business records should generally not be permanently deleted without a defined business requirement.

Where appropriate, use states such as:

```text
active
inactive
archived
deleted
```

Historical information such as:

* transactions
* commissions
* approvals
* important status changes
* audit information

should be preserved where required for business and compliance purposes.

---

# 19. Auditability

Important business actions should be traceable.

Examples:

```text
Who created the property?
Who approved the broker?
Who changed the property status?
Who recorded the transaction?
Who changed commission information?
```

For sensitive operations, the platform should maintain appropriate audit information.

---

# 20. Logging

Logging should help developers diagnose problems without exposing sensitive information.

Logs may include:

* request identifiers
* operation names
* timestamps
* error information
* system events
* important state transitions

Never log:

* passwords
* OTP values
* access tokens
* refresh tokens
* secret keys
* unnecessary personal/sensitive information

Production logging must be controlled and structured where practical.

---

# 21. Rate Limiting and Abuse Protection

Public and sensitive APIs must be protected against abuse.

Rate limiting should be applied especially to:

* authentication
* OTP
* password reset
* file uploads
* expensive operations
* public enquiry endpoints
* other abuse-prone endpoints

Limits should be appropriate to the endpoint rather than blindly applying the same limit everywhere.

---

# 22. File Upload Security

Any file upload feature must validate:

* file size
* MIME type
* extension
* upload permissions
* storage destination

Do not trust only the file extension supplied by the client.

Uploads should be protected against:

* oversized files
* unsupported formats
* malicious files
* unauthorized uploads
* storage abuse

---

# 23. External Services

External services may be used for:

* email
* SMS
* OTP
* cloud storage
* notifications
* analytics
* payment processing
* maps
* other platform integrations

External integrations must:

* be isolated behind backend services where appropriate
* keep credentials server-side
* handle failures gracefully
* avoid exposing provider secrets
* have clear configuration through environment variables

---

# 24. Frontend Principles

All client applications should follow these general principles.

### Frontend should handle

* presentation
* navigation
* user interaction
* local UI state
* client-side validation
* API communication
* loading states
* error presentation

### Frontend should NOT own

* database access
* secret credentials
* authoritative permissions
* ownership rules
* financial calculations that require trust
* critical business-state transitions
* security-sensitive business logic

---

# 25. UI/UX Principles

All LANDLOGY products should aim for:

* clarity
* consistency
* responsiveness
* accessibility
* fast interaction
* meaningful loading states
* useful error messages
* predictable navigation
* mobile-friendly interaction where relevant

Visual design may differ between products, but core terminology and business concepts should remain consistent.

---

# 26. Naming Conventions

Use consistent naming across the platform.

### General

Use clear, descriptive names.

Avoid:

```text
data1
temp
test2
newFinal
abc
```

Prefer:

```text
property
enquiry
commission
transaction
broker
customer
```

### API

Use resource-oriented naming.

Example:

```text
/api/v1/properties
/api/v1/enquiries
/api/v1/users
```

Avoid screen-specific API names such as:

```text
/api/v1/homeScreenData
/api/v1/brokerPageSubmit
```

---

# 27. Branch Strategy

The repository uses product-oriented branches.

Primary stable branches:

```text
main
seller-website/main
buyer-website/main
app/main
backend/main
```

`main` represents the integrated LANDLOGY platform.

Product branches represent stable development lines for individual products.

### Feature Branches

Recommended:

```text
feature/<product>/<phase>-<feature>
```

Example:

```text
feature/backend/p1-auth
feature/app/p2-property-upload
```

### Fix Branches

```text
fix/<product>/<phase>-<issue>
```

### Security Branches

```text
security/<product>/<phase>-<issue>
```

### Hotfix Branches

```text
hotfix/<product>/<phase>-<issue>
```

### Refactor Branches

```text
refactor/<product>/<phase>-<area>
```

### Documentation Branches

```text
docs/<product>/<topic>
```

### Experimental Branches

```text
experiment/<product>/<name>
```

---

# 28. Protected Branches

The following branches should be treated as stable:

```text
main
seller-website/main
buyer-website/main
app/main
backend/main
```

Direct pushes to protected branches should be avoided when repository protection is available.

Recommended protection:

* Pull requests
* Required reviews
* CI checks
* Successful tests
* No force pushes
* No accidental deletion

---

# 29. Baselines and Backups

Important stable versions may be preserved using dedicated branches or tags.

Baseline branches should be treated as reference points.

They should not be casually modified.

Example:

```text
seller-website/baseline
```

Baselines are useful for:

* rollback
* comparison
* historical reference
* preserving known-good versions

---

# 30. Commit Convention

Commits should clearly describe the change.

Recommended format:

```text
<type>(<scope>): <description>
```

Examples:

```text
feat(backend): add property API
fix(app): resolve session expiry handling
security(backend): harden authentication flow
docs: update architecture documentation
refactor(backend): reorganize service layer
test(backend): add authorization tests
```

Common types:

```text
feat
fix
security
refactor
test
docs
chore
perf
```

Keep commits focused and understandable.

---

# 31. Versioning

Use semantic versioning where applicable:

```text
MAJOR.MINOR.PATCH
```

Example:

```text
1.0.0
1.1.0
1.1.1
```

Product-specific releases may use product-prefixed tags:

```text
seller-website-v1.0.0
buyer-website-v1.0.0
app-v1.0.0
backend-v1.0.0
```

---

# 32. Development Workflow

Development should follow a controlled process.

### Step 1 — Understand

Before changing code:

* identify the affected product
* identify the affected module
* understand the current implementation
* verify whether the feature already exists
* identify dependencies

### Step 2 — Plan

Define:

* expected behavior
* affected APIs
* affected database changes
* security implications
* frontend implications
* testing requirements

### Step 3 — Implement

Make the smallest safe change required.

Avoid unrelated refactoring.

### Step 4 — Verify

Run appropriate:

* unit tests
* integration tests
* API tests
* authorization tests
* frontend tests
* build checks
* lint checks

### Step 5 — Review

Confirm:

* no unrelated files changed
* no secrets introduced
* no business rules duplicated
* API contracts remain consistent
* existing functionality still works

---

# 33. Change Management Rule

Do not perform broad changes for a narrow requirement.

If a task requires changing one feature, avoid automatically:

* rewriting unrelated modules
* changing architecture
* renaming unrelated files
* upgrading unrelated dependencies
* changing database structure without need
* refactoring working code without reason

### Principle

> **Small task → small change → small risk.**

---

# 34. Architecture Change Rule

Major architecture changes require deliberate review.

Examples:

* changing database technology
* changing authentication strategy
* introducing another backend
* creating another database
* changing API versioning
* replacing the storage architecture
* introducing a new platform
* changing core business entities

Do not make such changes as side effects of normal feature development.

---

# 35. Testing Strategy

Testing must exist at multiple levels.

### Unit Testing

Test individual functions and business rules.

### Integration Testing

Test communication between:

```text
API
↓
Business Logic
↓
Database
```

### Authorization Testing

Explicitly test cases such as:

```text
Broker → own resource → allowed
Broker → another broker's resource → denied
Broker → admin-only resource → denied
Unauthorized user → protected resource → denied
```

### Regression Testing

Existing functionality must continue working after changes.

---

# 36. Security Testing

Security testing should include:

* authentication bypass attempts
* authorization bypass attempts
* IDOR/resource ownership testing
* invalid input
* malformed requests
* rate-limit testing
* file upload testing
* token/session testing
* sensitive-data exposure
* API abuse scenarios

Security issues must be treated as functional defects, not optional improvements.

---

# 37. Performance Principles

Performance should be considered from the beginning.

Avoid:

* unnecessary database queries
* unbounded API responses
* loading huge files unnecessarily
* repeated duplicate requests
* expensive operations without protection

Use where appropriate:

* pagination
* indexing
* caching
* optimized queries
* lazy loading
* image optimization
* efficient API payloads

Do not introduce optimization complexity without evidence that it is needed.

---

# 38. Scalability Principles

The system should be capable of growing without requiring a complete rewrite.

Design for:

```text
More users
More properties
More enquiries
More brokers
More transactions
More clients
More API traffic
```

However:

> **Do not over-engineer before the requirement exists.**

Prefer simple, maintainable architecture that can evolve.

---

# 39. API Contract Stability

Once an API is consumed by multiple clients, breaking changes become expensive.

Therefore:

* avoid unnecessary breaking changes
* document important contracts
* validate request/response changes
* consider backward compatibility
* introduce a new API version when necessary

A backend change must consider all existing consumers.

---

# 40. Shared Business Terminology

The same business concept should have the same meaning across the platform.

For example:

```text
Property
Broker
Customer
Enquiry
Transaction
Commission
Active
Sold
Archived
```

Do not allow different applications to assign conflicting meanings to the same entity.

---

# 41. Phase-Based Development

LANDLOGY development is divided into five major phases.

## Phase 1 — Lead & Property Management Platform

Foundation for:

* enquiries
* broker management
* property management
* administration
* authentication
* core backend
* initial commissions
* public-facing platform

## Phase 2 — Broker Mobile Application

Adds dedicated broker mobile capabilities.

## Phase 3 — Customer Property-Selling Platform

Adds customer-facing property discovery and sales workflows.

## Phase 4 — Sales, Commission & Transaction Management

Adds deeper transaction and financial workflows.

## Phase 5 — Analytics, Notifications & Business Automation

Adds:

* advanced analytics
* notifications
* automation
* business intelligence
* advanced operational workflows

---

# 42. Phase Dependency Rule

Later phases must build on earlier phases rather than duplicate them.

For example:

```text
Phase 1
   ↓
Shared backend foundation
   ↓
Phase 2
   ↓
Phase 3
   ↓
Phase 4
   ↓
Phase 5
```

A new phase should reuse existing:

* APIs
* authentication
* authorization
* database entities
* business rules
* services

whenever appropriate.

---

# 43. No Duplicate Systems

Do not create separate implementations of the same core system merely because another client needs it.

Avoid:

```text
App Auth
Website Auth
Another Auth
```

Prefer:

```text
                Shared Authentication
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
        Client       Client       Client
```

The same principle applies to:

* users
* properties
* enquiries
* commissions
* transactions
* permissions
* notifications

---

# 44. Deployment Principles

Development, staging, and production must be treated as separate environments.

```text
Development
     ↓
Staging
     ↓
Production
```

Production configuration must never depend on local development settings.

Secrets and environment-specific values must be configured separately for each environment.

---

# 45. Production Readiness

Before considering a major release production-ready, verify:

### Functionality

* required features work
* major workflows work end-to-end
* error states are handled

### Security

* authentication works correctly
* authorization is enforced
* secrets are protected
* rate limiting exists where required
* sensitive data is not exposed

### Database

* migrations are tested
* relationships are correct
* indexes are appropriate
* backups/recovery strategy exists

### API

* contracts are stable
* validation works
* errors are consistent
* unauthorized access is blocked

### Client Applications

* API integration works
* loading/error states work
* responsive behavior is acceptable
* production configuration is correct

---

# 46. Anti-Patterns

The following patterns should be avoided.

### Direct Database Access

```text
Frontend → PostgreSQL
```

### Client-Controlled Ownership

```text
Client sends ownerId
        ↓
Backend blindly trusts it
```

### Client-Controlled Role

```text
Client sends role=ADMIN
        ↓
Backend trusts it
```

### Plaintext Passwords

```text
password: "mypassword123"
```

### Hardcoded Secrets

```text
const JWT_SECRET = "secret123";
```

### Business Logic in UI

Critical business rules must not exist only inside frontend code.

### Duplicate Backends

Do not create separate backends for individual clients unless there is a deliberate architectural reason.

### Duplicate Databases

Do not create separate databases for individual clients without an explicit architectural decision.

### Uncontrolled Schema Changes

Do not modify production database structure manually without migration/control.

### Unnecessary Refactoring

Do not rewrite working systems without a clear reason.

---

# 47. Documentation Principles

Documentation should answer:

* What does the system do?
* Why is it designed this way?
* What are the important rules?
* How do components communicate?
* What assumptions exist?
* What must not be changed casually?

Documentation should be updated when architecture or important business rules change.

Product-specific documentation belongs inside the relevant product directory.

---

# 48. Definition of Done

A feature is not considered complete merely because the code works locally.

A feature should be considered done when:

* requirements are implemented
* correct architecture is followed
* backend validation exists where required
* authorization is verified
* security implications are handled
* database changes are controlled
* APIs are tested
* affected clients are tested
* regression checks pass
* no secrets are exposed
* documentation is updated where necessary
* no unrelated changes were introduced

---

# 49. Golden Platform Rules

These rules apply to the entire LANDLOGY ecosystem.

### Rule 1

**Backend is the authority.**

### Rule 2

**PostgreSQL is accessed only through the backend.**

### Rule 3

**Clients must never contain database credentials.**

### Rule 4

**Never trust client-controlled roles, ownership, or permissions.**

### Rule 5

**Authentication and authorization are different responsibilities.**

### Rule 6

**Security is part of development, not a final step.**

### Rule 7

**Business-critical rules belong in the backend.**

### Rule 8

**Use migrations for controlled database changes.**

### Rule 9

**Avoid unnecessary breaking API changes.**

### Rule 10

**Keep feature changes focused and avoid unrelated refactoring.**

### Rule 11

**Do not duplicate core platform systems without a deliberate reason.**

### Rule 12

**Protect secrets and sensitive information at every layer.**

### Rule 13

**Test authorization, not only functionality.**

### Rule 14

**Preserve important business history.**

### Rule 15

**Build each phase on the foundation of previous phases.**

---

# 50. Platform Vision

LANDLOGY should evolve as a single technology platform rather than a collection of disconnected applications.

The long-term architecture should allow:

```text
                    LANDLOGY
                       │
                 Shared Platform
                       │
        ┌──────────────┼──────────────┐
        │              │              │
     Clients        Backend        Services
        │              │              │
        └──────────────┼──────────────┘
                       │
                   PostgreSQL
```

Every new product, feature, or phase should strengthen this shared ecosystem instead of creating another isolated system.

---

## Final Principle

> **Build once at the platform level, reuse everywhere, keep authority centralized, and make every change deliberate.**

This README defines the **global rules of LANDLOGY**.

Product-specific implementation details belong in the README of the respective product.
