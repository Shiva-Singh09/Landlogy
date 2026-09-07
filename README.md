# LANDLOGY — Professional Real Estate Ecosystem

A high-performance React/Vite + Express/Nodemailer implementation designed for real estate brokers, based on the LANDLOGY design reference.

## 🌟 Key Features

### Premium UI/UX
- **Immersive Visuals**: Premium hero treatment with real-estate photography, depth/parallax, grid atmosphere, and layered lighting.
- **Interactions**: Scroll reveal animations, hover interactions, animated metric bands, magnetic CTAs, and pointer-aware micro-effects.
- **Responsive Design**: Fully responsive layouts with mobile navigation and property filtering.

### Lead Capture & Email System
- **Dual Enquiry Channels**: Both **Quick Property Enquiry** and **General Contact** forms post to a unified `/api/enquiries` endpoint.
- **Automated Notifications**: Backend leverages **Nodemailer** to send formatted lead notifications to the client's email via SMTP.
- **Secure Architecture**: SMTP credentials and sensitive configuration are strictly server-side (stored in `.env`), ensuring zero exposure to the client.

### Professional Form Validation
- **Dual-Layer Validation**: Comprehensive validation implemented on both the **Frontend (React)** and **Backend (Express)** to ensure data integrity and prevent API bypass.
- **Strict Requirements**:
  - **Mobile**: Validates Indian mobile number formats (10-digit, optional +91).
  - **Name**: Rejects numbers-only or excessively long inputs.
  - **Email**: Regex-based format verification.
  - **Message**: Minimum length requirements for detailed enquiries.
- **UX-First Feedback**: Professional inline error messages and visual field highlighting instead of default browser alerts.

### Security & Stability
- **Rate Limiting**: Protects the API from spam and brute-force submissions.
- **Honeypot Protection**: Invisible fields to filter out automated bot submissions.
- **Robust Error Handling**: Detailed server-side reporting for SMTP configuration issues, providing clear feedback to the frontend.

---

## 🚀 Getting Started

### 1. Frontend Setup
```bash
cd client
npm install
npm run dev
```
*Optional: Create `client/.env` to override the API base URL:*
```env
VITE_API_BASE_URL=http://localhost:5000
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
```
**Crucial:** Edit `.env` and provide valid SMTP credentials and the target `MAIL_TO` address. Then start the server:
```bash
npm run dev
```

*For production, set `CLIENT_ORIGIN` to your actual frontend domain and use a production-grade SMTP provider.*

---

## ⚠️ Important Notes
- **Data Placeholders**: Contact details (phone, email, address) are currently inherited from the reference data. Replace these with the client's confirmed details in `client/public/site-data.json` before deployment.
- **Accessibility**: Includes reduced-motion support for better accessibility.
