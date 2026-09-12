# LANDLOGY — Seller Website

> **Phase 1 customer-facing website where property owners come to LANDLOGY to submit their property for sale.**

---

## 1. Overview

The `seller-website` is the **Phase 1 public-facing website of LANDLOGY**.

Its primary purpose is to allow property owners/customers to discover LANDLOGY, understand its services, and submit their property for sale.

The website is responsible for the **customer-facing property-selling and lead-capture experience**.

It communicates with the shared LANDLOGY backend through REST APIs.

```text
Customer / Property Owner
          │
          ▼
   Seller Website
          │
          ▼
    Backend API
          │
          ▼
      PostgreSQL
          │
          ▼
LANDLOGY Internal Operations
```

The Seller Website does **not** connect directly to PostgreSQL.

---

# 2. Phase 1 Objective

The primary objective is:

> **Allow a property owner to confidently submit their property to LANDLOGY for sale.**

The core journey is:

```text
Visit LANDLOGY
      ↓
Understand LANDLOGY
      ↓
Build Trust
      ↓
Choose "Sell Your Property"
      ↓
Enter Property Details
      ↓
Enter Contact Details
      ↓
Submit
      ↓
Backend Validation
      ↓
Submission Created
      ↓
Confirmation
      ↓
LANDLOGY Team Follow-up
```

This is the most important workflow of the Seller Website.

---

# 3. Target Users

The primary users are:

### Property Owners

People who own a property and want to sell it.

### Potential Sellers

People who are considering selling and want to understand LANDLOGY's process before submitting their property.

### General Visitors

People who want to learn about:

* LANDLOGY
* its services
* its property-selling process
* its credibility
* how to contact the company

The website should primarily optimize for the **property owner's journey**.

---

# 4. Core Responsibilities

The Seller Website is responsible for:

* public LANDLOGY presentation
* property-selling information
* customer trust and credibility
* property-selling CTA
* property submission form
* customer information collection
* property information collection
* property image collection where required
* enquiry/lead submission
* submission confirmation
* contact functionality
* responsive UI
* SEO
* accessibility
* frontend API integration

---

# 5. What This Website Is NOT

The Seller Website is **not**:

* the PostgreSQL database
* the backend
* the admin panel
* the broker mobile application
* the dedicated buyer website
* the transaction-management system
* the commission-management system
* the financial reporting system

Those responsibilities belong to other parts of the LANDLOGY platform.

The Seller Website should not gradually become a duplicate of those systems.

---

# 6. Technology Stack

The Seller Website uses:

* **Next.js**
* **React**
* **JavaScript**
* **Next.js App Router**
* **Tailwind CSS**
* **ESLint**
* **npm**
* **REST API**

No TypeScript is required for the current project unless the architecture is deliberately changed later.

---

# 7. Prerequisites

Before running the Seller Website, install:

* Node.js
* npm
* Git

Check Node.js:

```bash
node --version
```

Check npm:

```bash
npm --version
```

The project should use a currently supported Node.js version compatible with the installed Next.js version.

---

# 8. Installation

Clone the LANDLOGY repository if it is not already available locally.

Then enter the Seller Website directory:

```bash
cd seller-website
```

Install dependencies:

```bash
npm install
```

This installs the dependencies defined in:

```text
package.json
```

and generates/updates:

```text
package-lock.json
```

Do not manually install random packages unless they are actually required.

---

# 9. Environment Configuration

Local frontend environment configuration should be stored in:

```text
.env.local
```

Example:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

The exact API URL must match the backend configuration.

### Important

Only values that are safe to expose to browser-side code may use `NEXT_PUBLIC_`.

Never place these inside the Seller Website's public environment variables:

```text
DATABASE_URL
JWT_SECRET
JWT_REFRESH_SECRET
PRIVATE_API_KEY
STORAGE_SECRET
EMAIL_SECRET
```

The Seller Website must never contain backend/database secrets.

---

# 10. Local Development

After installation and environment configuration:

```bash
npm run dev
```

The Next.js development server will normally start at:

```text
http://localhost:3000
```

Open this address in the browser.

The typical local architecture is:

```text
Browser
   │
   ▼
Seller Website
localhost:3000
   │
   ▼
Backend API
localhost:5000
   │
   ▼
PostgreSQL
```

The actual backend port and API prefix must always match the backend configuration.

---

# 11. Running Website + Backend Together

The Seller Website depends on backend APIs for dynamic/business functionality.

A typical local setup uses two terminals.

### Terminal 1 — Backend

```bash
cd backend
npm run dev
```

### Terminal 2 — Seller Website

```bash
cd seller-website
npm run dev
```

Typical result:

```text
Seller Website
http://localhost:3000

Backend
http://localhost:5000
```

The Seller Website communicates with the backend using the configured:

```text
NEXT_PUBLIC_API_URL
```

---

# 12. Available npm Commands

The main commands are:

### Start development server

```bash
npm run dev
```

### Create production build

```bash
npm run build
```

### Start production server

```bash
npm run start
```

### Run ESLint

```bash
npm run lint
```

The exact available scripts are defined in:

```text
package.json
```

Do not assume a script exists if it is not present in `package.json`.

---

# 13. Production Build

To create a production build:

```bash
npm run build
```

Before running the production build, make sure required environment variables are configured.

If the build succeeds, the application can be started using:

```bash
npm run start
```

The production server will use the production build generated by Next.js.

---

# 14. Local Development Checklist

Before starting development:

```text
[ ] Node.js installed
[ ] npm available
[ ] Dependencies installed
[ ] .env.local configured
[ ] Backend running if API functionality is required
[ ] PostgreSQL available through backend
```

Then:

```bash
npm run dev
```

---

# 15. Project Structure

The initial application should follow a structure similar to:

```text
seller-website/
│
├── public/
│
├── src/
│   ├── app/
│   │   ├── layout.js
│   │   ├── page.js
│   │   ├── globals.css
│   │   │
│   │   ├── about/
│   │   ├── services/
│   │   ├── contact/
│   │   ├── sell/
│   │   └── properties/
│   │
│   ├── components/
│   ├── features/
│   ├── services/
│   ├── hooks/
│   ├── lib/
│   ├── utils/
│   └── config/
│
├── package.json
├── package-lock.json
├── next.config.mjs
├── jsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
├── .env.local
└── README.md
```

Not every directory needs to exist immediately.

Create directories when the corresponding functionality actually requires them.

---

# 16. App Router

The website uses the Next.js App Router.

Example:

```text
src/app/
│
├── page.js
│
├── about/
│   └── page.js
│
├── contact/
│   └── page.js
│
└── sell/
    └── page.js
```

This results in routes such as:

```text
/
 /about
 /contact
 /sell
```

Dynamic routes can be introduced where required.

Example:

```text
properties/
└── [id]/
    └── page.js
```

---

# 17. Main Website Sections

The website may contain:

```text
Home
About
Services
How We Work
Why LANDLOGY
Our Team
Contact
Sell Your Property
Privacy Policy
Terms & Conditions
```

The exact page structure may change according to the approved Phase 1 product requirements.

The primary conversion path must remain clear.

---

# 18. Home Page

The homepage should communicate:

### What LANDLOGY does

Explain the company's real-estate/property-selling service clearly.

### Why customers should trust LANDLOGY

Use appropriate trust signals such as:

* experience
* process
* team
* market knowledge
* testimonials
* verified information
* relevant statistics

### What the visitor should do

The primary action should guide the user toward:

> **Sell Your Property**

---

# 19. Primary CTA

The primary CTA of the Seller Website is:

> **Sell Your Property**

It should be clearly visible in appropriate areas such as:

* header
* hero section
* relevant service sections
* CTA sections
* footer

Possible wording:

```text
Sell Your Property
List Your Property
Sell With LANDLOGY
Submit Your Property
```

The final wording should be standardized across the website.

---

# 20. Property Submission

The property submission workflow is the most important functional feature.

Conceptually:

```text
Sell Your Property
        ↓
Property Submission Form
        ↓
Customer Details
        ↓
Property Details
        ↓
Additional Information
        ↓
Images (if required)
        ↓
Submit
        ↓
Backend
        ↓
Confirmation
```

---

# 21. Customer Information

The property submission form may collect:

* full name
* mobile number
* email address

The exact fields must follow the approved Phase 1 requirements and backend API contract.

Do not collect unnecessary personal information.

---

# 22. Property Information

The property submission form may collect information such as:

* property type
* location
* city
* locality/area
* property details
* expected price/value
* description
* additional relevant information

The exact schema must be determined by the Phase 1 backend contract.

The frontend must not invent a conflicting property model.

---

# 23. Property Images

If images are required in the Phase 1 submission workflow, the website may provide:

* image selection
* preview
* removal
* upload progress
* supported-format feedback
* size validation

Final file validation and authorization remain backend/storage responsibilities.

The website must not treat browser-side file validation as a security boundary.

---

# 24. Form Validation

Client-side validation should provide immediate feedback.

Examples:

* required fields
* mobile number format
* email format
* numeric values
* supported image formats
* file size limits

However:

> **Backend validation is authoritative.**

The website must handle validation errors returned by the backend.

---

# 25. Form States

The property submission form should support:

```text
Idle
 ↓
Editing
 ↓
Submitting
 ↓
Success
```

or:

```text
Idle
 ↓
Editing
 ↓
Submitting
 ↓
Error
```

The user should always understand the current state.

---

# 26. Duplicate Submission Protection

When the user submits a property:

```text
Submit
  ↓
Button disabled
  ↓
Request processing
  ↓
Response
  ↓
Success / Error
```

The UI should prevent accidental repeated clicks.

Where duplicate records are a business concern, the backend must provide the authoritative protection.

---

# 27. Success Experience

After a successful submission, the website should clearly communicate:

* submission received
* submission was successfully processed
* what happens next
* how LANDLOGY will contact the customer, where applicable

Example:

```text
Your property details have been submitted successfully.

Our team will review the information and contact you regarding the next steps.
```

The final wording should follow approved LANDLOGY communication.

---

# 28. Error Experience

The website must handle:

* invalid form data
* backend validation errors
* network failures
* server errors
* timeout
* failed uploads
* unexpected responses

Avoid showing technical errors directly to customers.

Instead of:

```text
ECONNREFUSED
AxiosError
500 Internal Server Error
```

show a user-friendly message.

---

# 29. Loading States

API-driven operations must provide appropriate loading feedback.

Examples:

```text
Submitting property...
```

```text
Uploading images...
```

```text
Loading...
```

Never leave the user wondering whether their action was received.

---

# 30. API Architecture

API communication should be separated from presentation components.

Recommended:

```text
src/
└── services/
    └── api/
```

Conceptually:

```text
Page / Component
       ↓
Feature Logic
       ↓
API Service
       ↓
Backend API
```

Avoid scattering complex API request logic throughout UI components.

---

# 31. Backend Authority

The Seller Website is a client.

The backend decides:

* whether the request is valid
* whether the user is authorized
* whether a property can be created
* property ownership
* business status
* data integrity
* database changes

The frontend may provide UX validation but must never become the authoritative business layer.

---

# 32. No Direct Database Access

The Seller Website must never connect directly to PostgreSQL.

Do not add:

```javascript
import pg from "pg";
```

or equivalent database connection code.

Correct:

```text
Seller Website
      ↓
REST API
      ↓
Backend
      ↓
PostgreSQL
```

---

# 33. No Database Credentials

Never store:

```text
DATABASE_URL
DB_USER
DB_PASSWORD
```

inside browser-exposed frontend configuration.

The database belongs exclusively to the backend environment.

---

# 34. Customer Privacy

Property submission may contain personal information.

The website should:

* collect only necessary information
* transmit information securely
* avoid unnecessary local persistence
* avoid exposing submitted information in URLs
* avoid logging sensitive form values
* provide appropriate privacy information

---

# 35. SEO

The Seller Website is public-facing and should be search-engine friendly.

Public pages should consider:

* page titles
* descriptions
* metadata
* semantic HTML
* heading hierarchy
* canonical URLs
* Open Graph metadata
* structured data where appropriate
* clean URLs
* crawlability

SEO should support discovery of LANDLOGY and its property-selling service.

---

# 36. Responsive Design

The website must work across:

```text
Mobile
Tablet
Laptop
Desktop
Large Desktop
```

The property submission flow is especially important on mobile.

Test:

* forms
* image upload
* navigation
* CTA buttons
* cards
* modals
* typography
* spacing
* error messages

A customer should be able to submit a property comfortably from a mobile device.

---

# 37. UI/UX Principles

The website should communicate:

```text
Trust
Professionalism
Transparency
Real Estate Expertise
Premium Quality
```

The design should feel intentional and professional rather than like a generic template.

Prioritize:

* clear hierarchy
* strong typography
* consistent spacing
* high-quality imagery
* intuitive interactions
* clear CTAs
* responsive behavior
* accessibility

---

# 38. Animation

Animation can be used to improve the premium feel of the website.

Appropriate uses include:

* hero motion
* section reveals
* hover effects
* CTA interactions
* subtle scroll effects
* image transitions
* page transitions

Avoid animation that:

* delays important content
* blocks interaction
* creates excessive layout movement
* makes forms difficult to use
* harms performance
* distracts from the selling journey

---

# 39. Image and Asset Management

Public assets should be stored in:

```text
public/
```

when they are static application assets.

Large property/customer-uploaded media should not be stored permanently in the Git repository.

Those files should use the approved backend/storage architecture.

---

# 40. Accessibility

The website should provide:

* semantic HTML
* proper form labels
* keyboard navigation
* visible focus states
* meaningful alt text
* accessible buttons
* useful validation messages
* readable typography
* sufficient contrast

Do not rely only on color to communicate important information.

---

# 41. Performance

Performance should be considered from the beginning.

Pay attention to:

* image size
* image loading
* JavaScript bundle size
* API request count
* unnecessary re-renders
* large assets
* third-party scripts

Use Next.js capabilities appropriately.

Do not add complex optimization without an actual performance reason.

---

# 42. Third-Party Libraries

Before installing a package, ask:

1. Is it actually required?
2. Can the current stack solve the problem?
3. Is it maintained?
4. Does it introduce unnecessary complexity?
5. Does it affect bundle size?
6. Does it introduce security concerns?

Avoid dependency bloat.

---

# 43. Third-Party Services

Third-party services may be integrated for:

* analytics
* maps
* anti-abuse protection
* communication
* media
* other approved functionality

Integration credentials must never be exposed unnecessarily.

Third-party scripts should also be evaluated for:

* performance
* privacy
* security
* loading behavior

---

# 44. State Management

Use client-side state only when necessary.

Appropriate examples:

* form state
* modal state
* filters
* temporary selections
* upload progress
* UI preferences

Do not recreate the backend database inside frontend state.

---

# 45. Mock Data

Mock data may be used during UI development.

However:

* mock data must be clearly separated
* it must not accidentally reach production
* production flows must use real backend APIs

Never display fabricated property information as real customer/backend data.

---

# 46. Authentication

Authentication is not the primary purpose of the public Seller Website.

The property-selling journey should not unnecessarily require account creation unless Phase 1 explicitly requires it.

If authenticated functionality is introduced:

* use the shared backend authentication system
* do not create an independent user database
* do not create a separate authentication architecture

---

# 47. Broker and Admin Boundaries

The Seller Website collects information that may later be used by LANDLOGY's internal systems.

```text
Customer
   ↓
Seller Website
   ↓
Backend
   ↓
Admin / Internal Operations
   ↓
Broker Workflow
```

The Seller Website itself should not become the full admin or broker management system.

---

# 48. Buyer Boundary

The Seller Website is not the dedicated buyer platform.

Do not add full buyer functionality unless explicitly brought into Phase 1 scope.

Examples of functionality that belongs outside the core Seller Website scope:

* buyer accounts
* advanced buyer dashboards
* buyer-specific lead management
* full buyer search experience
* buyer transaction workflows

---

# 49. Transaction and Commission Boundary

The Seller Website does not own:

* transaction management
* payment tracking
* commission calculation
* commission disbursement
* financial reporting

These are later platform capabilities unless explicitly required by an approved Phase 1 change.

---

# 50. Development Workflow

Every development task should follow:

```text
1. Inspect
   ↓
2. Verify existing functionality
   ↓
3. Identify required files
   ↓
4. Make focused change
   ↓
5. Run checks
   ↓
6. Test affected flow
```

Before changing code, verify whether the requested functionality already exists.

---

# 51. Scope Discipline

A small requirement should result in a focused change.

For example:

> Fix property submission validation.

Should not automatically cause:

* homepage redesign
* backend rewrite
* database redesign
* dependency upgrades
* unrelated refactoring
* route restructuring

Principle:

> **Small requirement → small change → small risk.**

---

# 52. Backend Change Boundary

If a feature cannot be implemented correctly because the backend lacks an API:

```text
Seller Website Requirement
        ↓
Identify Missing Backend Capability
        ↓
Define API Contract
        ↓
Backend Implementation
        ↓
Frontend Integration
```

Do not fake backend functionality inside the frontend.

---

# 53. Testing

Important Seller Website flows should be tested.

### Property Submission

```text
Open website
   ↓
Click Sell Your Property
   ↓
Complete form
   ↓
Client validation
   ↓
Submit
   ↓
Backend API
   ↓
Success
```

Test failure cases:

* missing required fields
* invalid values
* invalid email
* invalid mobile
* duplicate submission attempt
* backend unavailable
* network failure
* timeout
* invalid image
* oversized image

---

# 54. Responsive Testing

At minimum, test:

```text
Mobile
Tablet
Desktop
```

Especially test the primary conversion flow:

```text
Home
 ↓
Sell Your Property
 ↓
Form
 ↓
Submit
 ↓
Confirmation
```

---

# 55. Production Checklist

Before production release:

### Setup

* [ ] Production dependencies installed
* [ ] Production environment configured
* [ ] API URL verified

### Build

* [ ] `npm run build` succeeds
* [ ] No build errors
* [ ] No unintended development configuration

### Functionality

* [ ] Homepage works
* [ ] Sell Your Property CTA works
* [ ] Property submission works
* [ ] Validation works
* [ ] Success state works
* [ ] Error state works

### API

* [ ] Production backend URL configured
* [ ] API integration verified
* [ ] Backend failures handled

### Security

* [ ] No secrets committed
* [ ] No database credentials exposed
* [ ] No private API keys exposed
* [ ] Public forms protected appropriately

### UI

* [ ] Mobile tested
* [ ] Tablet tested
* [ ] Desktop tested
* [ ] Accessibility checked
* [ ] Loading states checked
* [ ] Error states checked

### SEO

* [ ] Metadata verified
* [ ] Titles verified
* [ ] Public URLs verified
* [ ] Social metadata verified

### Performance

* [ ] Images optimized
* [ ] Large assets reviewed
* [ ] Unnecessary dependencies removed
* [ ] Third-party scripts reviewed

---

# 56. Definition of Done

A Seller Website feature is complete when:

* required customer-facing functionality works
* correct backend API is used
* client-side validation works where appropriate
* backend validation is respected
* loading state exists
* success state exists
* error state exists
* responsive behavior works
* accessibility is considered
* no secrets are exposed
* no direct database access exists
* no unnecessary business logic is duplicated
* affected user flow is tested
* unrelated functionality remains unchanged

---

# 57. Phase 1 Success Criteria

The Seller Website should successfully allow a property owner to complete:

```text
"I want to sell my property."
          ↓
"I understand LANDLOGY."
          ↓
"I trust LANDLOGY."
          ↓
"I know how to proceed."
          ↓
"I submit my property."
          ↓
"My submission was received."
          ↓
"I understand what happens next."
```

If this flow is reliable, clear, fast, and trustworthy, the primary Phase 1 Seller Website objective has been achieved.

---

# 58. Final Architecture

```text
                         LANDLOGY
                            │
                            ▼
                    Seller Website
                            │
                    REST API Requests
                            │
                            ▼
                     Shared Backend
                            │
                    Business Logic
                            │
                            ▼
                       PostgreSQL
                            │
                            ▼
                  LANDLOGY Operations
```

The Seller Website is the **customer-facing entry point into the LANDLOGY property-selling ecosystem**.

Its primary job is:

> **Bring property owners to LANDLOGY, build trust, collect accurate property and customer information, submit that information securely to the backend, and clearly communicate what happens next.**
