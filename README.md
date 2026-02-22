# Leave Management System

Full-stack leave management app with a React (Vite) frontend, Node/Express backend, and Firebase Realtime Database + Auth.

## Structure
- `frontend/` - React app (Vite)
- `backend/` - Express API

## Prerequisites
- Node.js 18+ (or 20+)
- npm

## Setup
1. Install dependencies:
   - `npm install` (root)
   - `cd backend && npm install`
   - `cd frontend && npm install`
2. Backend environment:
   - Ensure `backend/.env` is present with required Firebase settings.
   - Ensure `backend/serviceAccountKey.json` is present for Firebase Admin.
3. Frontend environment:
   - Vite proxy is configured to send `/api` to `http://localhost:4000`.

## Run
- Backend: `cd backend && npm start`
- Frontend: `cd frontend && npm run dev`

## Notes
- The backend expects Firebase Admin credentials and database URL in `backend/.env`.
- The service account key is read from `backend/serviceAccountKey.json`.
