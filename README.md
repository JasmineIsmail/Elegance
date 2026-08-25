# ✨ Elegance — Full-Stack E-Commerce Platform

> A feature-rich full-stack fashion e-commerce platform built with **Node.js, Express.js, MongoDB, EJS, and Razorpay**, featuring secure authentication, product management, shopping cart, wishlist, offers, coupons, wallet, order management, online payments, and an administrative dashboard.

<p align="center">
  <img src="public/assets/img/logoElegance.png" alt="Elegance Logo" width="220">
</p>

<p align="center">
  <strong>A complete end-to-end e-commerce application designed with real-world business workflows.</strong>
</p>

---

## 🚀 Project Overview

**Elegance** is a full-stack fashion e-commerce application developed to simulate a production-style online shopping platform.

The application provides two major interfaces:

* 🛍️ **Customer Application** — product discovery, shopping cart, wishlist, checkout, payments, orders, wallet, profile and address management.
* 🛠️ **Admin Dashboard** — product/category management, offers, coupons, users, orders, sales reports and dashboard analytics.

The project focuses not only on UI development but also on implementing complete backend workflows such as authentication, inventory management, payment verification, order processing, coupon validation and sales reporting.

---

# 🎯 Key Features

## 👤 User Features

### Authentication & Account Management

* User registration
* OTP-based email verification
* Secure password hashing using bcrypt
* User login/logout
* Session-based authentication
* Forgot password
* Password reset
* Profile management
* Change password
* User account blocking/unblocking

### 🛍️ Product Discovery

* Browse products
* Browse products by category
* Product details page
* Product image gallery
* Product search
* Product pagination
* Category-based filtering
* Product offers
* Category offers
* Offer price calculation

### ❤️ Wishlist

* Add products to wishlist
* Remove products from wishlist
* Wishlist product listing
* Prevent duplicate wishlist entries

### 🛒 Shopping Cart

* Add products to cart
* Increase/decrease quantity
* Remove products
* Stock validation
* Dynamic price calculation
* Cart total calculation
* Coupon application
* Discount calculation

### 📦 Checkout & Orders

* Address management
* Add/edit/delete addresses
* Select delivery address
* Order placement
* Cash on Delivery
* Online payment through Razorpay
* Payment verification
* Order history
* Individual order details
* Cancel orders
* Return order workflow
* Order status management

### 💳 Payments

Integrated **Razorpay** for online payments.

Payment workflow includes:

1. Create order on the backend
2. Generate Razorpay order
3. Open Razorpay checkout
4. Receive payment details
5. Verify payment signature using HMAC
6. Update order/payment status
7. Handle payment-related failures

### 🎟️ Coupons

* Coupon creation and management
* Coupon activation/deactivation
* Coupon expiry validation
* Coupon usage restrictions
* Maximum discount limitation
* Apply coupons during checkout
* Discount calculation

### 💰 Wallet

* User wallet
* Wallet balance
* Wallet transactions
* Refund handling
* Wallet transaction history

---

# 🛠️ Admin Features

The admin dashboard provides complete control over the e-commerce platform.

## Dashboard

* Sales overview
* Order statistics
* Revenue statistics
* Top-selling products
* Top-selling categories
* Sales analytics
* Dashboard charts

## Product Management

* Add products
* Edit products
* Delete products
* Product image upload
* Multiple product images
* Image cropping
* Product stock management
* Product pricing
* Offer pricing
* Category assignment

## Category Management

* Create categories
* Edit categories
* Delete categories
* Category validation
* Category status management
* Category offers

## Offer Management

* Product offers
* Category offers
* Offer creation
* Offer editing
* Offer activation/deactivation
* Offer validation
* Offer price calculation

## Coupon Management

* Create coupons
* Edit coupons
* Delete/deactivate coupons
* Start/end date validation
* Maximum discount configuration
* Usage restrictions

## User Management

* View users
* Block users
* Unblock users
* View user information

## Order Management

* View orders
* View order details
* Update order status
* Process cancellations
* Manage returns
* Refund through wallet

## Sales Reports

* Generate sales reports
* Filter reports by date
* View sales data
* Export sales information
* PDF report generation
* Excel report generation

---

# 🧰 Technology Stack

## Frontend

| Technology | Purpose                   |
| ---------- | ------------------------- |
| HTML5      | Page structure            |
| CSS3       | Styling                   |
| Bootstrap  | Responsive UI             |
| JavaScript | Client-side functionality |
| jQuery     | DOM manipulation & AJAX   |
| EJS        | Server-side rendering     |
| Chart.js   | Dashboard analytics       |

## Backend

| Technology           | Purpose                      |
| -------------------- | ---------------------------- |
| Node.js              | JavaScript runtime           |
| Express.js           | Backend framework            |
| Mongoose             | MongoDB ODM                  |
| MongoDB              | Database                     |
| Express Session      | Session-based authentication |
| bcrypt               | Password hashing             |
| Nodemailer           | Email/OTP functionality      |
| Multer               | File uploads                 |
| Razorpay             | Online payments              |
| PDFKit/PDF libraries | Sales report generation      |
| ExcelJS              | Excel report generation      |

---

# 🏗️ Application Architecture

Elegance follows a **MVC-inspired architecture** that separates application responsibilities into controllers, models, routes, middleware, views and configuration.

```text
Client
   │
   ▼
EJS Views
   │
   ▼
Express Routes
   │
   ▼
Middleware
   │
   ▼
Controllers
   │
   ▼
Mongoose Models
   │
   ▼
MongoDB
```

External services such as Razorpay and Nodemailer are integrated into the backend where required.

---

# 📁 Project Structure

```text
Elegance/
│
├── app.js
├── package.json
├── package-lock.json
├── .gitignore
├── .env
│
├── config/
│   ├── connectDB.js
│   └── session.js
│
├── controller/
│   ├── addressController.js
│   ├── adminController.js
│   ├── cartController.js
│   ├── categoryController.js
│   ├── couponController.js
│   ├── offerController.js
│   ├── orderController.js
│   ├── productController.js
│   ├── userController.js
│   └── wishlistController.js
│
├── helper/
│   ├── ...
│   └── ...
│
├── middlewares/
│   ├── adminAuth.js
│   ├── userAuth.js
│   ├── upload.js
│   └── errorHandler.js
│
├── model/
│   ├── addressModel.js
│   ├── cartModel.js
│   ├── categoryModel.js
│   ├── categoryOfferModel.js
│   ├── couponModel.js
│   ├── orderModel.js
│   ├── otpModel.js
│   ├── productModel.js
│   ├── productOfferModel.js
│   ├── referalOfferModel.js
│   ├── returnModel.js
│   ├── userModel.js
│   ├── walletTransactionModel.js
│   └── wishlistModel.js
│
├── public/
│   ├── assets/
│   ├── user_assets/
│   ├── uploads/
│   └── vendor/
│
├── routes/
│   ├── adminRoute.js
│   └── userRoute.js
│
└── views/
    ├── admin/
    ├── users/
    └── partials/
```

---

# 🔐 Authentication & Security

The application implements several security-focused practices:

* Session-based authentication
* Separate user and admin authentication middleware
* Password hashing with bcrypt
* OTP-based account verification
* Protected admin routes
* Protected user routes
* Environment variables for sensitive credentials
* Razorpay payment signature verification
* Server-side validation for important business operations

Sensitive configuration such as database credentials, email credentials and payment keys are stored using environment variables.

---

# 💳 Razorpay Payment Flow

The online payment architecture follows this workflow:

```text
User
 │
 │ Place Order
 ▼
Backend
 │
 │ Create Razorpay Order
 ▼
Razorpay
 │
 │ Checkout
 ▼
User completes payment
 │
 ▼
Razorpay returns payment details
 │
 ▼
Backend
 │
 │ Verify signature
 ▼
Payment verified
 │
 ▼
Order confirmed
```

The backend verifies the Razorpay signature using cryptographic HMAC verification rather than trusting payment information received directly from the client.

---

# 🗄️ Database Design

MongoDB is used as the primary database with Mongoose for schema modeling.

Major collections/models include:

```text
User
 │
 ├── Address
 ├── Cart
 ├── Wishlist
 ├── Orders
 └── Wallet Transactions

Product
 │
 ├── Category
 └── Product Offer

Category
 │
 └── Category Offer

Order
 │
 ├── User
 ├── Products
 ├── Address
 └── Payment
```

The application uses MongoDB references and Mongoose population where relationships between documents are required.

---

# ⚙️ Installation & Setup

## 1. Clone the repository

```bash
git clone https://github.com/JasmineIsmail/Elegance.git
```

## 2. Navigate into the project

```bash
cd Elegance
```

## 3. Install dependencies

```bash
npm install
```

## 4. Create `.env`

Create a `.env` file in the project root.

Example:

```env
PORT=3000

MONGODB_URI=your_mongodb_connection_string

SESSION_SECRET=your_session_secret

EMAIL_USER=your_email
EMAIL_PASSWORD=your_email_password

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

> Never commit `.env` to GitHub.

## 5. Start the application

For development:

```bash
npm run dev
```

or, depending on the scripts configured in `package.json`:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```


# 🧠 Key Engineering Highlights

This project helped me gain hands-on experience with real-world backend and full-stack development concepts, including:

* Designing REST-style Express routes
* MVC architecture
* MongoDB schema design
* Mongoose relationships and population
* Session-based authentication
* Middleware-based authorization
* Secure password hashing
* OTP verification workflows
* AJAX-based asynchronous operations
* Shopping cart state management
* Inventory and stock validation
* Coupon and offer business logic
* Payment gateway integration
* Payment signature verification
* Wallet and refund workflows
* Image upload and processing
* Server-side validation
* Error handling middleware
* Sales analytics
* PDF and Excel report generation
* Git/GitHub version control

---

# 🔄 Major User Journey

```text
Register
   ↓
OTP Verification
   ↓
Login
   ↓
Browse Products
   ↓
Search / Filter / Category
   ↓
Product Details
   ↓
Add to Cart / Wishlist
   ↓
Apply Coupon
   ↓
Checkout
   ↓
Select Address
   ↓
Choose Payment Method
   ↓
Razorpay / COD
   ↓
Order Confirmation
   ↓
Track Order
   ↓
Cancel / Return
   ↓
Refund / Wallet
```

---

# 📈 Future Improvements

Potential improvements planned for future versions:

* React-based frontend migration
* JWT authentication
---

### Technical Focus

```text
JavaScript
Node.js
Express.js
MongoDB
Mongoose
React
Redux
HTML
CSS
Bootstrap
Git
GitHub
REST APIs
```

---

# ⭐ Why This Project?

Elegance was developed as a practical full-stack project to understand how an e-commerce application works beyond basic CRUD operations.

The project focuses on implementing complete business workflows—from user authentication and product discovery to cart management, payment verification, order processing, refunds, wallet transactions and administrative reporting.

---

# 📄 License

This project was developed for educational and portfolio purposes.

---

<p align="center">
  <strong>⭐ If you find this project interesting, consider giving the repository a star!</strong>
</p>
