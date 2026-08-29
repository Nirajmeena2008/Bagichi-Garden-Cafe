## Architecture and Technical Stack

* **Frontend:** The application is built using React 19 and React Router DOM for single-page navigation. It utilizes Tailwind CSS for styling, Lucide React for iconography, and Framer Motion for UI animations. The frontend is bundled and served using Vite.


* **Backend:** An Express.js server (`server.ts`) handles API requests, input validation via Zod, and business logic.


* **Database:** Data is stored locally in a SQLite database (`dev.db`) and managed using the Prisma Object-Relational Mapper (ORM).



## Database Schema and Models

The application relies on five primary data models defined in `prisma/schema.prisma`:

* **User:** Manages authentication details including name, email, password, and a role (defaulting to "USER").


* **MenuItem:** Stores the digital menu with fields for the item's name, description, price, category (e.g., Starters, Main Course), and an Unsplash image URL.


* **Reservation:** The core booking model containing a unique `reservationNumber` (formatted as `BGC-XXXXXX`), customer contact details, party size (`guests`), date, time, status (defaulting to "PENDING"), and a 6-digit `otp` for verification.


* **OrderItem:** A relational model linking specific `MenuItem`s to a `Reservation`, tracking the `quantity` of food pre-ordered by a guest.


* **Review:** Stores guest testimonials, including a 1-5 star `rating`, text `comment`, and `authorName`.



## Core Features and Application Flow

### 1. Landing Page (`src/pages/Home.tsx`)

The primary interface is a single-page scrolling layout comprised of several modular components:

* **Navigation (`Header.tsx`):** Features a sticky, glass-morphism navbar with a responsive mobile hamburger menu and direct anchor links to page sections.


* **Hero Section (`Hero.tsx`):** A landing banner with a background image, fading gradients, and call-to-action buttons directing users to view the menu or book a table.


* **Digital Menu (`Menu.tsx`):** Fetches food data from `/api/menu` and dynamically renders it. Users can filter the grid of items by categories generated directly from the database (e.g., Starters, Main Course, Italian, Desserts & Beverages).


* **Booking Engine (`Booking.tsx`):** A form capturing customer name, email, phone number, date, time (restricted between 11:00 AM and 11:00 PM), and party size. Upon successful submission, it generates a confirmation screen displaying the unique `BGC` reservation number and OTP, offering a link to manage the booking.


* **Testimonials (`Reviews.tsx`):** Fetches data from `/api/reviews` and displays 5-star customer quotes in an animated grid using Framer Motion.


* **Footer (`Footer.tsx`):** Displays operating hours, contact information, social media links, and an embedded Google Maps iframe for location routing.



### 2. Reservation Management Engine (`src/pages/ManageBooking.tsx`)

This standalone page allows customers to interact with their existing bookings:

* **Search System:** Users input their `BGC-XXXXXX` reservation ID to fetch their booking details from the `/api/bookings/:number` endpoint.


* **Status Control:** If a booking is marked as "PENDING", the user has UI options to either "Confirm Booking" or "Cancel Booking", which updates the database via a PUT request.


* **Food Pre-Ordering:** The management screen features a pre-order interface where users can browse the menu and add items directly to their reservation ahead of time. The system calculates the running total price and updates the `OrderItem` database relations dynamically.



### 3. Backend API and Notifications (`server.ts`)

The Express server handles complex background processes when a reservation is interacted with:

* **Validation:** All incoming booking data is strictly parsed and validated using a Zod schema to ensure required fields (like proper email formatting and minimum phone number lengths) are present before hitting the database.


* **Email Dispatch:** Utilizes the Resend SDK to dispatch automated HTML emails. It sends a formatted confirmation to the customer's email and an alert to the owner's email (`animer10yt@gmail.com`) whenever a booking is created, updated, or cancelled.


* **SMS Dispatch:** Integrates the Twilio SDK to send automated text messages to the customer's phone number containing their reservation number, OTP, and current booking status.


* **Mock Payments:** Includes a `/api/create-payment-intent` endpoint that returns a simulated Stripe `clientSecret` (`pi_mock_12345_secret_67890`) to lay the groundwork for a future checkout flow.
