# LANDLOGY — Backend

> **Shared backend and single source of truth for the LANDLOGY platform.**

---

## 1. Overview

The `backend` is the central server-side application of LANDLOGY.

It provides the APIs, business logic, authentication, authorization, validation, database access, security controls, and shared services required by all LANDLOGY clients.

The backend is designed to serve:

```text id="k3m7qp"
Seller Website
      │
      ├──────────────┐
      │              │
Buyer Website     Mobile App
      │              │
      └──────┬───────┘
             ▼
       LANDLOGY Backend
             │
             ▼
         PostgreSQL
```

The backend is the **only application layer authorized to communicate with PostgreSQL**.

---

# 2. Core Principle

> **Clients request. Backend decides. Database persists.**

The frontend applications must never become authoritative for business rules.

The backend is responsible for deciding:

* whether a request is valid
* whether a user is authorized
* whether a resource can be created
* whether a resource can be modified
* who owns a resource
* what status transitions are allowed
* what data is stored
* what data is returned
* how sensitive operations are protected

---

# 3. Responsibilities

The backend is responsible for:

* REST APIs
* authentication
* authorization
* role-based access control
* property management
* customer/property-owner submissions
* enquiry management
* broker management
* admin operations
* database access
* validation
* business logic
* file/media handling
* email/notification integrations
* security
* rate limiting
* audit logging
* error handling
* API versioning
* data integrity

Future platform capabilities may include:

* transactions
* commissions
* notifications
* analytics
* automation
* buyer workflows
* mobile application APIs

These should be introduced according to the approved project phase.

---

# 4. Technology Stack

The backend uses:

* **Node.js**
* **Express**
* **JavaScript**
* **REST API**
* **PostgreSQL**
* **JWT**
* **bcrypt/bcryptjs**
* **dotenv**
* **CORS**
* **Helmet**
* **npm**

The current project intentionally uses JavaScript rather than TypeScript.

---

# 5. Backend Architecture

The basic architecture is:

```text id="d4x8rv"
Client
  │
  │ HTTP / REST
  ▼
Express Routes
  │
  ▼
Controllers
  │
  ▼
Services / Business Logic
  │
  ▼
Database / Data Access
  │
  ▼
PostgreSQL
```

Cross-cutting concerns such as:

```text id="1d8f0u"
Authentication
Authorization
Validation
Rate Limiting
Security
Error Handling
Logging
```

are handled through appropriate middleware/services.

---

# 6. Repository Relationship

LANDLOGY is a multi-client platform:

```text id="w2k5cd"
LANDLOGY/
│
├── seller-website/
├── buyer-website/
├── app/
└── backend/
```

The backend is shared.

There must not be:

```text id="h2x9p0"
Seller Website → PostgreSQL
Buyer Website  → PostgreSQL
Mobile App     → PostgreSQL
```

Correct architecture:

```text id="e1t5ma"
Seller Website ─┐
Buyer Website  ─┼──→ Backend ──→ PostgreSQL
Mobile App     ─┘
```

---

# 7. Installation

From the repository root:

```bash id="7m2v5x"
cd backend
```

Install dependencies:

```bash id="4zj6sv"
npm install
```

The backend dependencies are defined in:

```text id="m8v7cd"
package.json
```

Do not install additional packages without an actual requirement.

---

# 8. Environment Variables

Backend environment configuration must be stored in:

```text id="wq3j4r"
.env
```

A safe template should be maintained separately as:

```text id="y7k4qz"
.env.example
```

Example structure:

```env id="s7x1ab"
NODE_ENV=development
PORT=5000

DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

JWT_ACCESS_SECRET=replace-with-secure-secret
JWT_REFRESH_SECRET=replace-with-secure-secret

CORS_ORIGIN=http://localhost:3000
```

Additional variables may be required for:

* email
* file storage
* OTP
* external APIs
* maps
* notifications
* monitoring

Only variables actually used by the backend should be added.

---

# 9. Secrets

Never commit real secrets to Git.

Never place secrets inside:

* source code
* route files
* controllers
* frontend code
* README files
* logs
* API responses

Examples of sensitive values:

```text
DATABASE_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
EMAIL_PASSWORD
SMTP_SECRET
STORAGE_SECRET
API_SECRET
```

Use environment variables or the approved production secret-management system.

---

# 10. Local Development

Start the backend using:

```bash id="2q6t8h"
npm run dev
```

The backend will normally run on:

```text id="q2v9w4"
http://localhost:5000
```

The actual port is controlled by the backend configuration.

Do not hard-code assumptions about the port in client applications.

---

# 11. Running LANDLOGY Locally

Typical local setup:

### Terminal 1 — Backend

```bash id="e6r5q2"
cd backend
npm run dev
```

### Terminal 2 — Seller Website

```bash id="p3k8yw"
cd seller-website
npm run dev
```

Typical architecture:

```text id="m1c4zy"
Seller Website
localhost:3000
      │
      ▼
Backend
localhost:5000
      │
      ▼
PostgreSQL
```

Buyer Website and Mobile App will follow the same principle.

---

# 12. npm Scripts

The primary commands should include:

### Development

```bash id="6x4q2m"
npm run dev
```

### Production

```bash id="z9p3rw"
npm start
```

### Testing

```bash id="r4k8yn"
npm test
```

### Linting

```bash id="v5n2kc"
npm run lint
```

Only commands actually defined in `package.json` should be treated as available.

---

# 13. API Versioning

LANDLOGY APIs should use explicit versioning.

Preferred base structure:

```text id="u8q2dm"
/api/v1
```

Examples:

```text id="j4r7ws"
/api/v1/auth/login
/api/v1/enquiries
/api/v1/properties
/api/v1/users
```

Breaking API changes should normally require a new API version rather than silently breaking existing clients.

---

# 14. REST API Principles

APIs should:

* use appropriate HTTP methods
* return predictable response structures
* validate incoming data
* authenticate protected requests
* authorize resource access
* return meaningful status codes
* avoid leaking internal implementation details
* remain stable once consumed by clients

Typical methods:

```text id="q1n8kv"
GET
POST
PATCH
PUT
DELETE
```

Use the least destructive operation appropriate for the requirement.

---

# 15. Authentication

Authentication is handled by the backend.

The backend may provide endpoints such as:

```text id="v6r2xz"
/api/v1/auth/login
/api/v1/auth/logout
/api/v1/auth/refresh
/api/v1/auth/forgot-password
/api/v1/auth/verify-otp
/api/v1/auth/reset-password
/api/v1/auth/change-password
```

The exact endpoint contract must remain centralized and documented.

---

# 16. Password Security

Passwords must never be stored as plaintext.

Use a secure password hashing mechanism such as:

```text id="e9w4pq"
bcrypt / bcryptjs
```

Never:

```text id="k7m2qa"
password = "..."
```

in the database.

Never return passwords in API responses.

Never log passwords.

---

# 17. JWT

Protected APIs may use JWT-based authentication.

Conceptually:

```text id="r3k9hf"
Login
  ↓
Credentials validated
  ↓
Access Token
  +
Refresh Token
  ↓
Client
```

The backend must validate:

* token authenticity
* token expiry
* token claims
* user status
* authorization requirements

Do not trust client-provided identity fields when the identity can be derived from the authenticated token.

---

# 18. Authorization

Authentication answers:

> Who are you?

Authorization answers:

> Are you allowed to perform this operation?

Both are required.

Examples of roles may include:

```text id="a6v3jd"
admin
broker
customer
```

Additional roles may be introduced later.

Role definitions must remain centralized.

---

# 19. Ownership Security

Resource ownership must be determined server-side.

For example, when creating a property:

```text id="k3f8sw"
Authenticated User
       ↓
JWT
       ↓
Backend determines owner
       ↓
Property created
```

Do not blindly trust:

```json
{
  "ownerId": "..."
}
```

from an untrusted client.

If ownership is derived from authentication, the backend should derive it from the authenticated identity.

---

# 20. Database

LANDLOGY uses:

> **PostgreSQL**

The database is private backend infrastructure.

Clients never connect directly to PostgreSQL.

```text id="x5m7qz"
Frontend
   X
   │
   │ No direct database access
   X
PostgreSQL

Frontend
   ↓
Backend
   ↓
PostgreSQL
```

---

# 21. Database Access

Database access should be centralized through backend code.

Do not place database queries directly inside frontend applications.

Avoid scattering unrelated raw SQL throughout controllers.

As the system grows, use a deliberate data-access structure.

Do not add Prisma, Drizzle, or another ORM solely because it is popular.

Choose a database layer based on actual project requirements.

---

# 22. IDs

Database resources should preferably use stable unique identifiers.

UUIDs are recommended for platform entities where appropriate.

Examples:

```text id="h2c8pz"
user_id
property_id
enquiry_id
broker_id
commission_id
```

The exact schema is defined by database migrations.

---

# 23. Database Migrations

Database schema changes must be reproducible.

Use migration files for:

* tables
* columns
* indexes
* constraints
* foreign keys
* enum/status changes

Never depend on manually modifying production databases without a reproducible migration.

---

# 24. Data Integrity

Use database constraints where appropriate.

Examples:

* primary keys
* foreign keys
* unique constraints
* not-null constraints
* indexes
* check constraints

Application validation and database constraints should complement each other.

---

# 25. Property Lifecycle

Property records may use lifecycle states such as:

```text id="y5x8m3"
draft
under_review
active
inactive
sold
rejected
archived
```

The backend must control valid status transitions.

The frontend must not be allowed to arbitrarily change property state.

---

# 26. Customer Property Submission

The Seller Website submits property information through the backend.

Conceptually:

```text id="v8p3nz"
Customer
   ↓
Seller Website
   ↓
POST /api/v1/...
   ↓
Backend Validation
   ↓
Database
   ↓
Submission Created
```

The exact endpoint and payload must be defined by the backend API contract.

---

# 27. Enquiries

The platform may maintain an enquiry lifecycle such as:

```text id="n4k7cx"
pending
under_review
contacted
approved
rejected
closed
```

The backend is responsible for:

* creating enquiries
* validating them
* preventing invalid transitions
* linking related records
* maintaining appropriate history/audit information

---

# 28. Broker Management

Broker functionality belongs to backend platform logic rather than the Seller Website.

Potential responsibilities include:

* broker creation
* broker verification
* approval
* account status
* role assignment
* property access
* lead assignment

Broker-specific rules must be enforced server-side.

---

# 29. Admin Operations

Admin functionality may include:

* reviewing enquiries
* approving/rejecting submissions
* managing properties
* managing brokers
* managing users
* monitoring platform activity

Admin authorization must be enforced by backend middleware/services.

Never rely on frontend route hiding as admin security.

---

# 30. Property Ownership

Properties must have a clear ownership relationship.

The backend should ensure:

```text id="c7z2mx"
Authenticated User
       │
       ▼
Owned Property
       │
       ├── Images
       ├── Details
       └── Lifecycle
```

A user must not be able to access or modify another user's private resources simply by changing an ID in the request.

---

# 31. File and Image Handling

Property media should not be permanently stored inside the backend source repository.

Use approved external/object storage when required.

The backend should enforce:

* allowed file types
* size limits
* authorization
* upload ownership
* safe filenames/identifiers
* upload validation
* deletion/retention rules

Never trust the frontend's file validation as the only security layer.

---

# 32. API Validation

Every external request should be validated according to its endpoint contract.

Validate:

* required fields
* data types
* lengths
* formats
* ranges
* allowed values
* relationships
* authorization context

Invalid requests should return controlled errors.

---

# 33. Error Handling

The backend should use centralized error handling.

Responses should be predictable.

Do not expose:

```text id="q7w3mz"
stack traces
database passwords
SQL internals
filesystem paths
private credentials
```

to clients.

Development logs may contain additional debugging information, but sensitive information must still never be logged.

---

# 34. HTTP Status Codes

Use appropriate status codes.

Examples:

```text id="z2m6rx"
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
```

Do not return `200 OK` for every failure.

---

# 35. Rate Limiting

Public and sensitive endpoints should have appropriate rate limits.

Particularly important:

* login
* OTP
* password reset
* file upload
* enquiry submission
* expensive operations
* authentication endpoints

Rate limiting should be implemented server-side.

---

# 36. Security Middleware

The backend should use appropriate security middleware such as:

```text id="p5x8cw"
Helmet
CORS
Rate Limiting
Authentication Middleware
Authorization Middleware
Input Validation
```

Security configuration must be appropriate for the environment.

---

# 37. CORS

CORS should be explicitly configured.

Development may allow:

```text id="q4x8mn"
http://localhost:3000
```

Production should allow only approved LANDLOGY origins.

Avoid unrestricted production configuration such as:

```text id="x8q3lz"
Access-Control-Allow-Origin: *
```

when authenticated/private APIs require restricted origins.

---

# 38. Logging

Logs should help diagnose production problems without exposing sensitive data.

Never log:

* passwords
* JWT secrets
* refresh tokens
* OTP values
* database passwords
* private credentials
* unnecessary personal information

Use structured logging as the platform grows.

---

# 39. Audit Logging

Important business operations should be auditable.

Potential events:

```text id="g7m2qa"
Login
Password change
Property creation
Property approval
Property rejection
Property status change
Broker approval
Enquiry status change
Administrative action
```

Audit requirements should be defined per phase.

---

# 40. Soft Delete

Important business records should generally not be hard-deleted without a deliberate reason.

Where appropriate, use lifecycle fields such as:

```text id="r8k4zc"
deleted_at
archived_at
status
```

This preserves historical integrity.

Exceptions must be explicitly justified.

---

# 41. Business Logic

Business logic belongs in backend services.

Preferred:

```text id="w3p7ka"
Route
  ↓
Controller
  ↓
Service
  ↓
Data Access
```

Avoid putting large business workflows directly inside route definitions.

---

# 42. API Contract Stability

Once an API is consumed by:

* Seller Website
* Buyer Website
* Mobile App

its contract becomes important platform infrastructure.

Avoid silently changing:

* request fields
* response fields
* status codes
* authentication requirements
* endpoint meaning

Breaking changes require deliberate versioning or migration.

---

# 43. Mobile App Compatibility

The backend must be designed so the future React Native/Expo app can consume the same APIs.

Target architecture:

```text id="b8q2wx"
Seller Website ─┐
                │
Buyer Website ──┼──→ Shared Backend
                │
Mobile App ─────┘
```

The mobile application must not require a separate database.

---

# 44. API Documentation

Important APIs should be documented.

Documentation should include:

* endpoint
* HTTP method
* authentication requirement
* request body
* query parameters
* response
* status codes
* validation rules
* authorization rules

When API contracts become substantial, a formal OpenAPI/Swagger specification may be introduced.

---

# 45. Testing

Backend testing should cover at least:

### Authentication

* login
* invalid credentials
* token validation
* refresh
* logout
* password reset

### Authorization

* role restrictions
* ownership checks
* admin access
* broker access
* unauthorized access

### Properties

* create
* read
* update
* lifecycle changes
* ownership protection

### Enquiries

* creation
* validation
* status transitions

### Uploads

* file validation
* size limits
* authorization
* failure handling

### Security

* rate limiting
* invalid input
* unauthorized requests
* malicious payloads
* secret exposure

---

# 46. Testing Principle

A backend feature is not complete merely because its endpoint returns a successful response.

Test:

```text id="f4n7yx"
Valid request
Invalid request
Unauthorized request
Forbidden request
Missing data
Duplicate data
Unexpected input
Database failure
External-service failure
```

---

# 47. Production Configuration

Production should use:

```text id="m5q8za"
NODE_ENV=production
```

Production secrets must come from secure environment/secret management.

Do not copy development secrets into production.

---

# 48. Deployment Architecture

A typical production architecture:

```text id="v7c3mx"
                    Internet
                       │
                       ▼
                Seller Website
                       │
                Buyer Website
                       │
                  Mobile App
                       │
                       ▼
                 API / Backend
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     PostgreSQL     Storage       Email
```

The actual infrastructure provider may change.

The architecture should remain platform-oriented.

---

# 49. Environment Separation

Maintain separate environments where appropriate:

```text id="q9k4sw"
Development
     ↓
Staging
     ↓
Production
```

Do not use the production database for ordinary local development.

---

# 50. Development Rules

Before changing backend code:

```text id="m2z7qc"
1. Inspect existing implementation
2. Confirm whether the feature already exists
3. Identify the exact affected files
4. Understand the API/database contract
5. Make the smallest safe change
6. Test the affected behavior
7. Check for regressions
```

Avoid unrelated refactoring.

---

# 51. Change Discipline

Do not turn a focused task into a broad rewrite.

For example:

> Add enquiry validation.

Should not automatically trigger:

* database redesign
* authentication rewrite
* folder restructuring
* dependency migration
* unrelated API changes

Principle:

> **Focused requirement → focused implementation.**

---

# 52. Database Change Discipline

A database change can affect:

```text id="c5n8vy"
Seller Website
Buyer Website
Mobile App
Admin Operations
Reports
Future Integrations
```

Therefore:

> **Database schema changes must be deliberate and backward-compatible whenever possible.**

Before modifying a shared table, identify affected APIs and clients.

---

# 53. API Change Discipline

Before changing an existing endpoint:

```text id="r6x2km"
Identify consumers
      ↓
Check current contract
      ↓
Determine compatibility
      ↓
Implement change
      ↓
Test existing consumers
```

Never assume that only the current frontend uses an API.

---

# 54. Project Structure

The backend should evolve toward a modular structure such as:

```text id="k8w3mz"
backend/
│
├── src/
│   ├── config/
│   │
│   ├── middleware/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── enquiries/
│   │   ├── properties/
│   │   ├── brokers/
│   │   └── ...
│   │
│   ├── services/
│   │
│   ├── utils/
│   │
│   ├── db/
│   │   └── migrations/
│   │
│   └── app.js
│
├── .env
├── .env.example
├── package.json
├── package-lock.json
└── README.md
```

The exact structure can evolve as the backend grows.

---

# 55. Module Principle

Each major business domain should have a clear boundary.

Examples:

```text id="y3p8qk"
auth
properties
enquiries
users
brokers
transactions
commissions
notifications
```

Avoid creating one giant controller/service containing unrelated platform logic.

---

# 56. Shared Services

Reusable infrastructure should be centralized.

Examples:

```text id="n7c4vx"
email service
storage service
authentication service
token service
validation utilities
logging
notification service
```

Do not duplicate the same infrastructure logic across modules.

---

# 57. Current Phase Priority

For the initial LANDLOGY development:

### Phase 1

Primary backend capabilities should support:

```text id="b4k8zn"
Seller Website
      ↓
Customer / Property Owner
      ↓
Property Submission
      ↓
Enquiry / Lead
      ↓
LANDLOGY Internal Operations
```

The backend should establish a stable foundation for future clients.

---

# 58. Future Platform Expansion

The backend should eventually support:

### Phase 2

```text id="h3m7qz"
Broker Mobile App
```

### Phase 3

```text id="x5r8kc"
Buyer Platform
Property Discovery
Sales Workflows
```

### Phase 4

```text id="p7n2wy"
Transactions
Commissions
Financial Workflows
```

### Phase 5

```text id="c9v4mx"
Analytics
Notifications
Automation
Business Intelligence
```

Do not implement future-phase complexity prematurely unless required by the current phase.

---

# 59. Definition of Done

A backend feature is complete when:

* API behavior matches its contract
* input validation works
* authentication is correct where required
* authorization is correct where required
* ownership checks are enforced
* database changes are safe
* errors are handled
* sensitive data is protected
* rate limits are appropriate
* affected tests pass
* existing consumers remain compatible
* documentation is updated where necessary
* no unrelated functionality was changed

---

# 60. Backend Golden Rules

The following rules are mandatory:

1. **Clients never connect directly to PostgreSQL.**
2. **Backend is the single source of truth for business logic.**
3. **Never trust client-provided ownership or authorization data.**
4. **Never store plaintext passwords.**
5. **Never expose secrets.**
6. **Validate every external request.**
7. **Authenticate and authorize protected operations.**
8. **Protect sensitive endpoints with appropriate rate limits.**
9. **Do not silently break existing API contracts.**
10. **Use migrations for database schema changes.**
11. **Preserve important business history.**
12. **Do not duplicate backend business logic in clients.**
13. **Do not build future-phase complexity without a requirement.**
14. **Make focused changes for focused requirements.**
15. **Test security and authorization, not only happy paths.**

---

# 61. Final Backend Vision

LANDLOGY should operate as:

```text id="j7q3mw"
                 LANDLOGY PLATFORM
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
     Seller Web     Buyer Web      Mobile App
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                 SHARED BACKEND
                        │
        ┌───────────────┼────────────────┐
        │               │                │
        ▼               ▼                ▼
   Business Logic   Security         Integrations
        │
        ▼
    PostgreSQL
```

The backend is not simply an API server.

It is the **central business and data authority of the LANDLOGY platform**.

Its long-term responsibility is to provide a stable, secure, reusable foundation that allows every LANDLOGY client to operate on the same business rules and the same source of truth.
