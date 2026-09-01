# 🌿 Bagichi Garden Cafe — Complete System & Architecture Documentation

A modern, responsive web application designed for **Bagichi Garden Cafe** to showcase culinary offerings, cafe ambiance, table reservation workflows, and location-specific visitor details.

---

## 1. Project Overview & Architectural Vision

Bagichi Garden Cafe's digital platform serves as a modern storefront and customer portal. It bridges physical dining with digital accessibility, prioritizing performance, SEO optimization, and clean component-driven architecture.

### Key Objectives
* **Aesthetic Presentation:** Showcase the lush garden ambiance, seating zones, and curated cafe vibe through visual storytelling.
* **Interactive Menu System:** Organize multi-course categories (Starters, Main Course, Beverages, Desserts) with instant filtering and pricing details.
* **Reservation Engine:** Streamline direct table bookings with date, time, party size, and special request validation.
* **Discoverability & Reach:** Provide integrated Google Maps location routing, social connections, operating hours, and customer reviews.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js (React) | Hybrid rendering, file-system routing, and static asset optimization |
| **Styling** | Tailwind CSS | Utility-first styling with responsive utility variants and custom color schemes |
| **Icons** | Lucide React | Clean, scalable vector UI icons |
| **Animation** | Framer Motion / CSS3 | Smooth transitions, scroll-triggered reveals, and micro-interactions |
| **Deployment** | GitHub Pages / Vercel | Static export / serverless edge hosting with automated CI/CD workflows |

---

## 3. Directory & File Structure

```text
Bagichi-Garden-Cafe/
├── .github/
│   └── workflows/
│       └── deploy.yml            # CI/CD pipeline for automated build and deployment
├── public/
│   ├── assets/
│   │   ├── images/
│   │   │   ├── hero-bg.jpg       # High-res cafe hero banner
│   │   │   ├── ambiance/         # Garden seating, indoor dining, night view shots
│   │   │   └── menu/             # Dish and drink photography
│   │   └── icons/                # Favicons, vector badges, and branding assets
│   ├── favicon.ico
│   └── robots.txt                # Search engine crawler policies
├── src/
│   ├── app/                      # Next.js App Router (or /pages directory)
│   │   ├── globals.css           # Tailwind base, components, and utility layers
│   │   ├── layout.tsx            # Global HTML root layout with Nav and Footer
│   │   ├── page.tsx              # Main landing page assembling core views
│   │   ├── menu/
│   │   │   └── page.tsx          # Standalone full digital menu page
│   │   ├── reservation/
│   │   │   └── page.tsx          # Interactive table booking workflow
│   │   └── contact/
│   │       └── page.tsx          # Direct contact form, map integration, and FAQs
│   ├── components/
│   │   ├── common/
│   │   │   ├── Navbar.tsx        # Responsive header with mobile hamburger drawer
│   │   │   ├── Footer.tsx        # Social links, business hours, and copyright info
│   │   │   └── Button.tsx        # Reusable styled UI button variants
│   │   ├── home/
│   │   │   ├── HeroSection.tsx   # Atmospheric hero with CTA buttons
│   │   │   ├── AboutSection.tsx  # Story, heritage, and garden concept narrative
│   │   │   ├── FeaturedMenu.tsx  # Chef's specials and popular dishes carousel
│   │   │   ├── AmbianceGallery.tsx # Masonry photo grid with modal preview
│   │   │   └── Testimonials.tsx  # Customer reviews and social proof
│   │   ├── menu/
│   │   │   ├── MenuCategory.tsx  # Tabbed/filtered category selectors
│   │   │   └── MenuItemCard.tsx  # Dish card with badges (Veg/Non-Veg, Spicy, Chef Special)
│   │   └── reservation/
│   │       └── BookingForm.tsx   # Form validation, date-picker, and submit handling
│   ├── data/
│   │   ├── menuData.ts           # Structured menu items, pricing, tags, and descriptions
│   │   ├── galleryData.ts        # Ambiance images and layout metadata
│   │   └── cafeConfig.ts         # Global business info (Hours, Phone, Email, Address, Maps URL)
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces (MenuItem, Reservation, Review)
│   └── utils/
│       ├── cn.ts                 # ClassName merge helper (clsx + tailwind-merge)
│       └── validation.ts         # Booking and contact form input sanitizers
├── .gitignore
├── next.config.js                # Next.js configuration (static export, image domains)
├── package.json                  # Dependencies, scripts, and project metadata
├── postcss.config.js             # PostCSS plugins for Tailwind
├── tailwind.config.js            # Custom themes, color palettes, and container rules
└── README.md                     # Project documentation
