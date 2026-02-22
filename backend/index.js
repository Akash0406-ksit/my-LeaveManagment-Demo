const path = require("path");
const fs = require("fs");

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();

app.use(cors());
app.use(express.json());

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  path.join(__dirname, "serviceAccountKey.json");

let db = null;
let firebaseInitialized = false;
const ADMIN_EMAILS = ["admin@example.com", "admin@gmail.com"]; // add your admin emails

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = require(serviceAccountPath);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
    }
    db = admin.database();
    firebaseInitialized = true;
    console.log("✅ Firebase Realtime Database initialized");
  } catch (err) {
    console.error("❌ Error initializing Firebase:", err.message);
  }
}

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid auth token" });
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email);
}

const DEFAULT_BALANCE = { annual: 12, sick: 10, casual: 8 };

// ============ HEALTH ============
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// ============ USERS & BALANCE ============
app.get("/api/users", verifyToken, async (req, res) => {
  if (!db || !firebaseInitialized) {
    return res.status(500).json({ error: "Firebase not configured" });
  }
  if (!isAdmin(req.user.email)) {
    return res.status(403).json({ error: "Admin only" });
  }
  try {
    const snapshot = await db.ref("users").once("value");
    const data = snapshot.val() || {};
    const users = Object.entries(data).map(([uid, u]) => ({ uid, ...u }));
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/leave-balance/:userId", verifyToken, async (req, res) => {
  if (!db || !firebaseInitialized) {
    return res.status(500).json({ error: "Firebase not configured" });
  }
  const { userId } = req.params;
  if (req.user.uid !== userId && !isAdmin(req.user.email)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const snap = await db.ref(`users/${userId}/leaveBalance`).once("value");
    const balance = snap.val() || DEFAULT_BALANCE;
    res.json({ balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/leave-balance", verifyToken, async (req, res) => {
  if (!db || !firebaseInitialized) {
    return res.status(500).json({ error: "Firebase not configured" });
  }
  if (!isAdmin(req.user.email)) {
    return res.status(403).json({ error: "Admin only" });
  }
  const { userId, annual, sick, casual } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: "userId required" });
  }
  try {
    const updates = {};
    if (typeof annual === "number") updates.annual = annual;
    if (typeof sick === "number") updates.sick = sick;
    if (typeof casual === "number") updates.casual = casual;
    await db.ref(`users/${userId}/leaveBalance`).update(updates);
    const snap = await db.ref(`users/${userId}/leaveBalance`).once("value");
    res.json({ balance: snap.val() || DEFAULT_BALANCE });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/register-user", verifyToken, async (req, res) => {
  if (!db || !firebaseInitialized) {
    return res.status(500).json({ error: "Firebase not configured" });
  }
  const { email, role, fullName, phone, department, employeeId } = req.body || {};
  if (!email || !role) {
    return res.status(400).json({ error: "email and role required" });
  }
  const uid = req.user.uid;
  if (req.user.email !== email) {
    return res.status(400).json({ error: "Email mismatch" });
  }
  try {
    const userData = {
      email,
      role,
      leaveBalance: DEFAULT_BALANCE,
      createdAt: Date.now(),
    };
    if (fullName != null && String(fullName).trim()) userData.fullName = String(fullName).trim();
    if (phone != null && String(phone).trim()) userData.phone = String(phone).trim();
    if (department != null && String(department).trim()) userData.department = String(department).trim();
    if (employeeId != null && String(employeeId).trim()) userData.employeeId = String(employeeId).trim();
    await db.ref(`users/${uid}`).set(userData);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ LEAVE REQUESTS ============
const LEAVE_TYPES = ["annual", "sick", "casual", "unpaid"];
const STATUSES = ["pending", "approved", "rejected"];

app.get("/api/leave-requests", verifyToken, async (req, res) => {
  if (!db || !firebaseInitialized) {
    return res.status(500).json({ error: "Firebase not configured" });
  }
  const { userId, status } = req.query;
  const isAdm = isAdmin(req.user.email);
  const filterUserId = userId || (isAdm ? null : req.user.uid);
  try {
    const snapshot = await db.ref("leaveRequests").orderByChild("createdAt").once("value");
    let list = [];
    snapshot.forEach((child) => {
      const val = child.val();
      list.push({ id: child.key, ...val });
    });
    list = list.reverse();
    if (filterUserId) list = list.filter((r) => r.userId === filterUserId);
    if (status) list = list.filter((r) => r.status === status);
    res.json({ requests: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/leave-requests", verifyToken, async (req, res) => {
  if (!db || !firebaseInitialized) {
    return res.status(500).json({ error: "Firebase not configured" });
  }
  const { startDate, endDate, leaveType, reason } = req.body || {};
  if (!startDate || !endDate || !leaveType || !reason) {
    return res.status(400).json({ error: "startDate, endDate, leaveType, reason required" });
  }
  if (!LEAVE_TYPES.includes(leaveType)) {
    return res.status(400).json({ error: "Invalid leaveType" });
  }
  const start = new Date(startDate + "T00:00:00").getTime();
  const end = new Date(endDate + "T23:59:59").getTime();
  if (isNaN(start) || isNaN(end) || end < start) {
    return res.status(400).json({ error: "Invalid dates" });
  }
  const todayStr = new Date().toISOString().slice(0, 10);
  if (startDate < todayStr) {
    return res.status(400).json({ error: "Start date cannot be in the past" });
  }
  const days = Math.ceil((end - start) / (24 * 60 * 60 * 1000)) + 1;
  try {
    const ref = db.ref("leaveRequests").push();
    await ref.set({
      userId: req.user.uid,
      userEmail: req.user.email,
      startDate,
      endDate,
      leaveType,
      reason: String(reason).trim(),
      days,
      status: "pending",
      createdAt: admin.database.ServerValue.TIMESTAMP,
    });
    const snap = await ref.once("value");
    res.status(201).json({ id: ref.key, ...snap.val() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/leave-requests/:id", verifyToken, async (req, res) => {
  if (!db || !firebaseInitialized) {
    return res.status(500).json({ error: "Firebase not configured" });
  }
  if (!isAdmin(req.user.email)) {
    return res.status(403).json({ error: "Admin only" });
  }
  const { id } = req.params;
  const { status, adminComment } = req.body || {};
  if (!status || !STATUSES.includes(status)) {
    return res.status(400).json({ error: "Valid status required (pending/approved/rejected)" });
  }
  try {
    const ref = db.ref(`leaveRequests/${id}`);
    const snap = await ref.once("value");
    if (!snap.exists()) {
      return res.status(404).json({ error: "Request not found" });
    }
    const updates = {
      status,
      reviewedBy: req.user.email,
      reviewedAt: admin.database.ServerValue.TIMESTAMP,
    };
    if (adminComment != null) updates.adminComment = String(adminComment);
    if (status === "approved") {
      const data = snap.val();
      const balanceRef = db.ref(`users/${data.userId}/leaveBalance`);
      const balanceSnap = await balanceRef.once("value");
      let bal = balanceSnap.val() || { ...DEFAULT_BALANCE };
      if (data.leaveType === "annual" && typeof bal.annual === "number") {
        bal.annual = Math.max(0, bal.annual - data.days);
      } else if (data.leaveType === "sick" && typeof bal.sick === "number") {
        bal.sick = Math.max(0, bal.sick - data.days);
      } else if (data.leaveType === "casual" && typeof bal.casual === "number") {
        bal.casual = Math.max(0, bal.casual - data.days);
      }
      await balanceRef.set(bal);
    }
    await ref.update(updates);
    const updated = await ref.once("value");
    res.json({ id, ...updated.val() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/leave-requests/:id", verifyToken, async (req, res) => {
  if (!db || !firebaseInitialized) {
    return res.status(500).json({ error: "Firebase not configured" });
  }
  const { id } = req.params;
  try {
    const ref = db.ref(`leaveRequests/${id}`);
    const snap = await ref.once("value");
    if (!snap.exists()) {
      return res.status(404).json({ error: "Request not found" });
    }
    const data = snap.val();
    if (data.userId !== req.user.uid && !isAdmin(req.user.email)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (data.status !== "pending") {
      return res.status(400).json({ error: "Can only delete pending requests" });
    }
    await ref.remove();
    res.json({ deleted: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ STATS (admin) ============
app.get("/api/stats", verifyToken, async (req, res) => {
  if (!db || !firebaseInitialized || !isAdmin(req.user.email)) {
    return res.status(403).json({ error: "Admin only" });
  }
  try {
    const snap = await db.ref("leaveRequests").once("value");
    let pending = 0, approved = 0, rejected = 0;
    snap.forEach((child) => {
      const s = child.val().status;
      if (s === "pending") pending++;
      else if (s === "approved") approved++;
      else rejected++;
    });
    res.json({ pending, approved, rejected, total: pending + approved + rejected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
  if (!firebaseInitialized) {
    console.warn("⚠️  Firebase not initialized. Check serviceAccountKey.json and FIREBASE_DATABASE_URL in .env");
  }
});
