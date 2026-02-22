## Leave Management System

A full-stack leave management app with React, Node.js, and Firebase.

### Features

**Employees (Users)**
- Login / Register
- View leave balance (Annual, Sick, Casual)
- Apply for leave (start/end date, type, reason)
- View own leave requests (Pending, Approved, Rejected)
- Cancel pending requests

**Admins**
- Admin dashboard with stats (Pending, Approved, Rejected, Total)
- View all leave requests
- Approve / Reject with optional comment
- Manage leave balances for all users
- Filter requests by status

### Tech Stack

- **Frontend**: React (Vite) + Firebase Auth
- **Backend**: Node.js (Express) + Firebase Admin SDK
- **Database**: Firebase Realtime Database

**Actor → frontend (React) → backend (Node.js) → Firebase**

### Getting started

1. Install Node.js (LTS) if you do not already have it.
2. In one terminal:
   - `cd backend`
   - `npm install`
   - `npm run dev` (or `npm start` if you prefer)
3. In another terminal:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

### Firebase Setup (Realtime Database - No Billing Required!)

1. **Create Firebase Project**: Go to https://console.firebase.google.com and create a new project
2. **Enable Realtime Database** (NOT Firestore - Realtime Database doesn't require billing):
   - In Firebase Console, go to **Realtime Database**
   - Click **Create Database**
   - Choose **Start in test mode** (for development)
   - Select a region and click **Enable**
3. **Get Service Account Key**:
   - Go to **Project Settings** → **Service Accounts** tab
   - Click **Generate new private key** → **Generate**
   - Save the downloaded JSON file as `backend/serviceAccountKey.json`
4. **Configure `.env` file**:
   - Copy `backend/.env.example` to `backend/.env`
   - Update `FIREBASE_DATABASE_URL` with your Realtime Database URL (found in Firebase Console → Realtime Database → Data tab, looks like `https://your-project-id.firebaseio.com`)

### Admin users

Add admin emails in `backend/index.js`:
```js
const ADMIN_EMAILS = ["admin@example.com", "admin@gmail.com"]; // add your admin emails
```

**Note**: This uses Firebase Realtime Database (not Firestore) because it doesn't require billing to be enabled!

