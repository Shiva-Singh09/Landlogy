# LANDLOGY — Professional Real Estate Ecosystem

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://landlogy.vercel.app/)

A high-performance, research-first real estate platform designed for brokers, investors, and homeowners. LANDLOGY bridges the gap between property listings and actionable intelligence, providing a verified ecosystem for buying, selling, renting, and investing in real estate across India.

## 🌐 Live Application
**Visit the live site:** [https://landlogy.vercel.app/](https://landlogy.vercel.app/)

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React.js
- **Build Tool**: Vite
- **Styling**: CSS3 (Custom Modern Design System)
- **Icons**: Lucide-React
- **Deployment**: Vercel

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Email Service**: Nodemailer (SMTP)
- **Security**: `express-rate-limit`, Honeypot protection
- **Deployment**: (Configure as per your server)

---

## 🌟 Key Features

### 🎨 Premium UI/UX
- **Immersive Visuals**: High-end hero section with real-estate photography, depth effects, and layered lighting.
- **Modern Interactions**: Scroll-reveal animations, magnetic CTAs, pointer-aware micro-effects, and interactive metric bands.
- **Responsive Architecture**: Fully optimized for mobile, tablet, and desktop browsing.

### 📊 Investment Intelligence
- **Research-First Approach**: Dedicated sections for market intelligence, opportunity screening, and investment analysis.
- **Verified Listings**: Curated property listings categorized by `Sale`, `Rent`, and `Investment` with verification badges.
- **Dynamic Data**: Entire site content is driven by a centralized `site-data.json`, allowing for rapid updates without code changes.

### 📧 Lead Capture & Email System
- **Dual-Channel Enquiries**: Separate workflows for **Quick Property Enquiries** (Hero) and **General Contact** (Footer).
- **Automated Notifications**: Real-time lead delivery to administrators via a secure Nodemailer/SMTP backend.
- **Secure Configuration**: All sensitive credentials (SMTP, API keys) are handled strictly server-side via `.env` files.

### 🛡️ Professional Validation & Security
- **Dual-Layer Validation**: Comprehensive regex-based validation on both Frontend (React) and Backend (Express).
- **Spam Prevention**: Implementation of rate-limiting and invisible honeypot fields to block automated bot submissions.
- **UX-Driven Feedback**: Inline error reporting and visual field highlighting for a seamless user experience.

---

## 📂 Project Structure

```text
LANDLOGY/
├── client/                # Frontend (Vite + React)
│   ├── public/            # Static assets & site-data.json
│   └── src/               # Application logic & styling
└── server/                # Backend (Express + Node.js)
    ├── server.js          # API endpoints & Mail server logic
    └── .env               # Environment variables (Private)
```

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

---

## ⚠️ Important Notes
- **Content Management**: To update properties, team members, or contact details, modify `client/public/site-data.json`.
- **Production Deployment**: Ensure `CLIENT_ORIGIN` in the server `.env` matches your production frontend domain to avoid CORS issues.
- **Accessibility**: Includes reduced-motion support for a better user experience.
