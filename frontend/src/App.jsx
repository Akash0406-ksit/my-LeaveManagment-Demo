import React, { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "./firebaseClient";

const ADMIN_EMAILS = ["admin@example.com", "admin@gmail.com"];
const LEAVE_TYPES = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "casual", label: "Casual Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
];

const API_TIMEOUT_MS = 20000;

async function api(path, options = {}) {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  const headers = {
    ...(options.body && typeof options.body === "string" ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(path, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText || "Request failed");
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") throw new Error("Backend not responding. Start it in a separate terminal: cd backend && npm run dev");
    throw err;
  }
}

const base = {
  width: "100%",
  minHeight: "100vh",
  height: "100%",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  color: "#e5e7eb",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  padding: "1rem",
};

const card = {
  width: "100%",
  maxWidth: 960,
  minWidth: 280,
  padding: "1.25rem",
  borderRadius: "1rem",
  background: "rgba(15,23,42,0.95)",
  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
  border: "1px solid rgba(148,163,184,0.2)",
  overflowX: "hidden",
  overflowY: "auto",
  maxHeight: "calc(100vh - 2.5rem)",
  boxSizing: "border-box",
};

const formWrap = { maxWidth: 380, width: "100%" };

const input = {
  width: "100%",
  maxWidth: "100%",
  padding: "0.5rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid rgba(148,163,184,0.5)",
  backgroundColor: "#020617",
  color: "#e5e7eb",
  outline: "none",
  boxSizing: "border-box",
};

const btn = (primary = false) => ({
  padding: "0.6rem 1.2rem",
  borderRadius: "0.5rem",
  border: "none",
  background: primary
    ? "linear-gradient(135deg, rgb(56,189,248), rgb(59,130,246))"
    : "transparent",
  color: primary ? "#0f172a" : "#9ca3af",
  fontWeight: 600,
  cursor: "pointer",
  borderWidth: primary ? 0 : 1,
  borderStyle: "solid",
  borderColor: "rgba(148,163,184,0.5)",
});

const errorBox = {
  padding: "0.75rem 1rem",
  borderRadius: "0.5rem",
  backgroundColor: "rgba(248,113,113,0.15)",
  color: "#fecaca",
  border: "1px solid rgba(248,113,113,0.4)",
  marginBottom: "1rem",
};

// ============ LANDING PAGE (Choose Admin Login, Employee Login, or Employee Register) ============
function LandingPage({ onSelectAdmin, onSelectEmployeeLogin, onSelectEmployeeRegister }) {
  return (
    <div style={base}>
      <div style={{ ...card, maxWidth: 480, textAlign: "center" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Leave Management System</h1>
        <p style={{ color: "#9ca3af", marginBottom: "2rem" }}>
          Choose how you want to sign in
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <button
            type="button"
            onClick={onSelectAdmin}
            style={{
              ...btn(true),
              width: "100%",
              padding: "1rem 1.5rem",
              fontSize: "1rem",
            }}
          >
            Admin Login
          </button>
          <button
            type="button"
            onClick={onSelectEmployeeLogin}
            style={{
              ...btn(true),
              width: "100%",
              padding: "1rem 1.5rem",
              fontSize: "1rem",
              background: "linear-gradient(135deg, rgb(34,197,94), rgb(22,163,74))",
            }}
          >
            Employee Login
          </button>
          <button
            type="button"
            onClick={onSelectEmployeeRegister}
            style={{
              ...btn(true),
              width: "100%",
              padding: "1rem 1.5rem",
              fontSize: "1rem",
              background: "linear-gradient(135deg, rgb(168,85,247), rgb(126,34,206))",
            }}
          >
            Employee Register
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ AUTH PAGE (Login or Register - used for Admin login only & Employee login/register) ============
function AuthPage({
  authType,
  employeeScreen,
  onBack,
  onModeChange,
  mode,
  email,
  setEmail,
  password,
  setPassword,
  role,
  setRole,
  fullName,
  setFullName,
  phone,
  setPhone,
  department,
  setDepartment,
  employeeId,
  setEmployeeId,
  error,
  setError,
  onSubmit,
  loading,
  onForgotPassword,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const isAdminOnly = authType === "admin";
  const showLoginRegisterTabs = !isAdminOnly && employeeScreen === "both";
  const isLoginOnly = isAdminOnly || employeeScreen === "login";
  const isRegisterOnly = employeeScreen === "register";

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotSuccess(false);
    setError("");
    try {
      await onForgotPassword(forgotEmail.trim());
      setForgotSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={base}>
      <div style={{ ...card, maxWidth: 420 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          {onBack && (
            <button type="button" onClick={onBack} style={btn(false)}>
              ← Back
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: "1.35rem", marginBottom: "0.25rem" }}>
              {isAdminOnly ? "Admin Login" : isRegisterOnly ? "Employee Register" : "Employee Login"}
            </h1>
            <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
              {isAdminOnly ? "Sign in as administrator." : isRegisterOnly ? "Create a new employee account." : "Sign in to your account."}
            </p>
          </div>
        </div>
        {showLoginRegisterTabs && (
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <button
              type="button"
              onClick={() => {
                onModeChange("login");
                setShowForgotPassword(false);
                setError("");
              }}
              style={{
                ...btn(mode === "login"),
                flex: 1,
              }}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                onModeChange("register");
                setShowForgotPassword(false);
                setError("");
              }}
              style={{
                ...btn(mode === "register"),
                flex: 1,
              }}
            >
              Register
            </button>
          </div>
        )}

        {showForgotPassword ? (
          <div style={{ marginBottom: "1rem", ...formWrap }}>
            <h2 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>Forgot Password</h2>
            <p style={{ color: "#9ca3af", fontSize: "0.85rem", marginBottom: "0.85rem" }}>
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
            <form onSubmit={handleForgotSubmit}>
              <div style={{ marginBottom: "0.85rem" }}>
                <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500, fontSize: "0.9rem" }}>Email</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={input}
                />
              </div>
              {forgotSuccess && (
                <div style={{ ...errorBox, backgroundColor: "rgba(34,197,94,0.15)", borderColor: "rgba(34,197,94,0.4)", color: "#86efac", marginBottom: "1rem" }}>
                  Check your email for the reset link.
                </div>
              )}
              {error && <div style={errorBox}>{error}</div>}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" disabled={forgotLoading} style={{ ...btn(true), flex: 1 }}>
                  {forgotLoading ? "Sending..." : "Send reset link"}
                </button>
                <button type="button" onClick={() => { setShowForgotPassword(false); setError(""); setForgotSuccess(false); }} style={btn(false)}>
                  Back
                </button>
              </div>
            </form>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={formWrap}>
            <div style={{ marginBottom: "0.85rem" }}>
              <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500, fontSize: "0.9rem" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
                style={input}
              />
            </div>
            <div style={{ marginBottom: "0.85rem" }}>
              <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500, fontSize: "0.9rem" }}>Password</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="off"
                  style={{ ...input, paddingRight: "2.5rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{
                    position: "absolute",
                    right: "0.5rem",
                    background: "none",
                    border: "none",
                    color: "#9ca3af",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    padding: "0.25rem",
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {(mode === "login" || isLoginOnly) && (
              <div style={{ marginBottom: "1rem", textAlign: "right" }}>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgb(56,189,248)",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    padding: 0,
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}
            {(mode === "register" || isRegisterOnly) && (
              <>
                <div style={{ marginBottom: "0.85rem" }}>
                  <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500, fontSize: "0.9rem" }}>Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    style={input}
                  />
                </div>
                <div style={{ marginBottom: "0.85rem" }}>
                  <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500, fontSize: "0.9rem" }}>Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                    style={input}
                  />
                </div>
                <div style={{ marginBottom: "0.85rem" }}>
                  <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500, fontSize: "0.9rem" }}>Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Engineering, HR"
                    style={input}
                  />
                </div>
                <div style={{ marginBottom: "0.85rem" }}>
                  <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500, fontSize: "0.9rem" }}>Employee ID</label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="Optional"
                    style={input}
                  />
                </div>
                <div style={{ marginBottom: "0.85rem" }}>
                  <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500, fontSize: "0.9rem" }}>Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{ ...input, cursor: "pointer" }}
                  >
                    <option value="user">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </>
            )}
            {error && <div style={errorBox}>{error}</div>}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...btn(true),
                width: "100%",
                marginTop: "0.25rem",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? (isLoginOnly || mode === "login" ? "Logging in..." : "Registering...")
                : (isLoginOnly || mode === "login" ? "Login" : "Register")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ============ USER DASHBOARD ============
function UserDashboard({ user, onLogout, balance, requests, loading, error, onApply, onCancel }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveType, setLeaveType] = useState("annual");
  const [reason, setReason] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) return;
    setSubmitLoading(true);
    try {
      await onApply({ startDate, endDate, leaveType, reason });
      setStartDate("");
      setEndDate("");
      setReason("");
    } catch (_) {
      // Error already set by parent; ensure we stop loading state
    } finally {
      setSubmitLoading(false);
    }
  };

  const statusColor = (s) => (s === "approved" ? "#22c55e" : s === "rejected" ? "#ef4444" : "#f59e0b");

  return (
    <div style={base}>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem" }}>Leave Management</h1>
            <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
              Welcome, {user?.email}
            </p>
          </div>
          <button type="button" onClick={onLogout} style={btn(false)}>
            Logout
          </button>
        </div>

        {/* Balance */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {["annual", "sick", "casual"].map((t) => (
            <div
              key={t}
              style={{
                padding: "1rem",
                borderRadius: "0.5rem",
                background: "rgba(15,23,42,0.8)",
                border: "1px solid rgba(148,163,184,0.2)",
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "#9ca3af", textTransform: "uppercase" }}>
                {t} Leave
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{balance?.[t] ?? 0}</div>
            </div>
          ))}
        </div>

        {/* Apply form */}
        <form onSubmit={handleApply} style={{ marginBottom: "1.5rem", overflow: "visible", maxWidth: 420 }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.6rem" }}>Apply for Leave</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", position: "relative", zIndex: 10, overflow: "visible" }}>
            <div style={{ overflow: "visible", minWidth: 0 }}>
              <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.9rem" }}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                style={{ ...input, minHeight: "2.5rem" }}
                title="Pick start date"
              />
            </div>
            <div style={{ overflow: "visible", minWidth: 0 }}>
              <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.9rem" }}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                style={{ ...input, minHeight: "2.5rem" }}
                title="Pick end date"
              />
            </div>
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.9rem" }}>Leave Type</label>
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} style={{ ...input, cursor: "pointer" }}>
              {LEAVE_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.9rem" }}>Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              placeholder="Enter reason..."
              style={{ ...input, resize: "vertical" }}
            />
          </div>
          {error && <div style={errorBox}>{error}</div>}
          <button type="submit" disabled={submitLoading} style={{ ...btn(true), marginTop: "0.75rem" }}>
            {submitLoading ? "Submitting..." : "Submit Request"}
          </button>
        </form>

        {/* My requests */}
        <div>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>My Leave Requests</h2>
          {loading ? (
            <p style={{ color: "#9ca3af" }}>Loading...</p>
          ) : requests.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No requests yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {requests.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "0.5rem",
                    background: "rgba(15,23,42,0.8)",
                    border: "1px solid rgba(148,163,184,0.2)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 500 }}>{r.leaveType}</span> • {r.startDate} to {r.endDate} • {r.days} day(s)
                    <br />
                    <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>{r.reason}</span>
                    {r.adminComment && (
                      <div style={{ fontSize: "0.8rem", color: "#f59e0b", marginTop: "0.25rem" }}>
                        Admin: {r.adminComment}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: statusColor(r.status), fontWeight: 600, textTransform: "capitalize" }}>
                      {r.status}
                    </span>
                    {r.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => onCancel(r.id)}
                        style={{ ...btn(false), padding: "0.35rem 0.6rem", fontSize: "0.8rem" }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ ADMIN DASHBOARD ============
function AdminDashboard({ user, onLogout, requests, users, stats, loading, error, onApprove, onReject, onSetBalance }) {
  const [filter, setFilter] = useState("all");
  const [comment, setComment] = useState("");
  const [selectedReq, setSelectedReq] = useState(null);

  const filtered = filter === "all"
    ? requests
    : requests.filter((r) => r.status === filter);

  const handleReview = async (id, status) => {
    try {
      await (status === "approved" ? onApprove(id, comment) : onReject(id, comment));
      setSelectedReq(null);
      setComment("");
    } catch (_) {}
  };

  const statusColor = (s) => (s === "approved" ? "#22c55e" : s === "rejected" ? "#ef4444" : "#f59e0b");

  return (
    <div style={base}>
      <div style={{ ...card, maxWidth: 960 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem" }}>Admin Dashboard</h1>
            <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>{user?.email}</p>
          </div>
          <button type="button" onClick={onLogout} style={btn(false)}>Logout</button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ padding: "1rem", borderRadius: "0.5rem", background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)" }}>
            <div style={{ fontSize: "0.75rem", color: "#fbbf24" }}>PENDING</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{stats?.pending ?? 0}</div>
          </div>
          <div style={{ padding: "1rem", borderRadius: "0.5rem", background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)" }}>
            <div style={{ fontSize: "0.75rem", color: "#4ade80" }}>APPROVED</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{stats?.approved ?? 0}</div>
          </div>
          <div style={{ padding: "1rem", borderRadius: "0.5rem", background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)" }}>
            <div style={{ fontSize: "0.75rem", color: "#f87171" }}>REJECTED</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{stats?.rejected ?? 0}</div>
          </div>
          <div style={{ padding: "1rem", borderRadius: "0.5rem", background: "rgba(148,163,184,0.2)", border: "1px solid rgba(148,163,184,0.4)" }}>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>TOTAL</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{stats?.total ?? 0}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          {["all", "pending", "approved", "rejected"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                ...btn(filter === f),
                textTransform: "capitalize",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {error && <div style={errorBox}>{error}</div>}

        {/* Leave requests */}
        <div>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Leave Requests</h2>
          {loading ? (
            <p style={{ color: "#9ca3af" }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No requests.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {filtered.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "0.5rem",
                    background: "rgba(15,23,42,0.8)",
                    border: "1px solid rgba(148,163,184,0.2)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ minWidth: 0, flex: "1 1 200px", wordBreak: "break-word" }}>
                      <span style={{ fontWeight: 500 }}>{r.userEmail}</span> • {r.leaveType} • {r.startDate} to {r.endDate} • {r.days} day(s)
                      <br />
                      <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>{r.reason}</span>
                    </div>
                    <span style={{ color: statusColor(r.status), fontWeight: 600, textTransform: "capitalize", flexShrink: 0 }}>
                      {r.status}
                    </span>
                  </div>
                  {r.status === "pending" && (
                    <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="text"
                        placeholder="Comment (optional)"
                        value={selectedReq === r.id ? comment : ""}
                        onChange={(e) => {
                          setSelectedReq(r.id);
                          setComment(e.target.value);
                        }}
                        style={{ ...input, flex: "1 1 180px", minWidth: 0, maxWidth: 240 }}
                      />
                      <button type="button" onClick={() => handleReview(r.id, "approved")} style={{ ...btn(true), padding: "0.4rem 0.8rem" }}>
                        Approve
                      </button>
                      <button type="button" onClick={() => handleReview(r.id, "rejected")} style={{ ...btn(false), padding: "0.4rem 0.8rem", borderColor: "#ef4444", color: "#f87171" }}>
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Users & balance */}
        <div style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Users & Leave Balance</h2>
          {users.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No users registered yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {users.map((u) => (
                <UserBalanceRow key={u.uid} user={u} onSetBalance={onSetBalance} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserBalanceRow({ user, onSetBalance }) {
  const [editing, setEditing] = useState(false);
  const [annual, setAnnual] = useState(user.leaveBalance?.annual ?? 12);
  const [sick, setSick] = useState(user.leaveBalance?.sick ?? 10);
  const [casual, setCasual] = useState(user.leaveBalance?.casual ?? 8);

  const handleSave = async () => {
    try {
      await onSetBalance(user.uid, { annual, sick, casual });
      setEditing(false);
    } catch (_) {}
  };

  return (
    <div
      style={{
        padding: "0.75rem 1rem",
        borderRadius: "0.5rem",
        background: "rgba(15,23,42,0.8)",
        border: "1px solid rgba(148,163,184,0.2)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0.5rem",
        minWidth: 0,
      }}
    >
      <span style={{ fontWeight: 500, minWidth: 0, wordBreak: "break-word", flex: "1 1 120px" }}>{user.email}</span>
      {editing ? (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <input type="number" value={annual} onChange={(e) => setAnnual(+e.target.value)} style={{ ...input, width: 52, minWidth: 52 }} />
          <input type="number" value={sick} onChange={(e) => setSick(+e.target.value)} style={{ ...input, width: 52, minWidth: 52 }} />
          <input type="number" value={casual} onChange={(e) => setCasual(+e.target.value)} style={{ ...input, width: 52, minWidth: 52 }} />
          <button type="button" onClick={handleSave} style={btn(true)}>Save</button>
          <button type="button" onClick={() => setEditing(false)} style={btn(false)}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
            Annual: {user.leaveBalance?.annual ?? 0} | Sick: {user.leaveBalance?.sick ?? 0} | Casual: {user.leaveBalance?.casual ?? 0}
          </span>
          <button type="button" onClick={() => setEditing(true)} style={btn(false)}>Edit</button>
        </div>
      )}
    </div>
  );
}

// ============ MAIN APP ============
function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState("landing");
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState("");
  const [authSubmitLoading, setAuthSubmitLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [balance, setBalance] = useState(null);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) setLoggingOut(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    setError("");
    const load = async () => {
      setDataLoading(true);
      try {
        if (isAdmin) {
          const [reqRes, usersRes, statsRes] = await Promise.all([
            api("/api/leave-requests"),
            api("/api/users"),
            api("/api/stats"),
          ]);
          setRequests(reqRes.requests || []);
          setUsers(usersRes.users || []);
          setStats(statsRes);
        } else {
          const [reqRes, balRes] = await Promise.all([
            api("/api/leave-requests"),
            api(`/api/leave-balance/${user.uid}`),
          ]);
          setRequests(reqRes.requests || []);
          setBalance(balRes.balance || { annual: 12, sick: 10, casual: 8 });
        }
      } catch (err) {
        setError(err.message);
        if (err.message?.includes("Admin only") && !isAdmin) {
          setBalance({ annual: 12, sick: 10, casual: 8 });
          setRequests([]);
        }
      } finally {
        setDataLoading(false);
      }
    };
    load();
  }, [user, isAdmin]);

  const clearAuthForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setPhone("");
    setDepartment("");
    setEmployeeId("");
    setRole("user");
    setError("");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setAuthSubmitLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const token = await cred.user.getIdToken();
      await fetch("/api/register-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          role,
          fullName: fullName.trim() || undefined,
          phone: phone.trim() || undefined,
          department: department.trim() || undefined,
          employeeId: employeeId.trim() || undefined,
        }),
      });
      clearAuthForm();
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setAuthSubmitLoading(false);
    }
  };

  const handleForgotPassword = async (emailToReset) => {
    await sendPasswordResetEmail(auth, emailToReset);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setAuthSubmitLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      clearAuthForm();
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setAuthSubmitLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    setBalance(null);
    setRequests([]);
    setUsers([]);
    setStats(null);
    setError("");
    await signOut(auth);
  };

  const handleApply = async (payload) => {
    setError("");
    try {
      await api("/api/leave-requests", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const [reqRes, balRes] = await Promise.all([
        api("/api/leave-requests"),
        api(`/api/leave-balance/${user.uid}`),
      ]);
      setRequests(reqRes.requests || []);
      setBalance(balRes.balance || balance);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = async (id) => {
    setError("");
    try {
      await api(`/api/leave-requests/${id}`, { method: "DELETE" });
      const res = await api("/api/leave-requests");
      setRequests(res.requests || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApprove = async (id, adminComment) => {
    setError("");
    try {
      await api(`/api/leave-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "approved", adminComment }),
      });
      const [reqRes, statsRes, usersRes] = await Promise.all([
        api("/api/leave-requests"),
        api("/api/stats"),
        api("/api/users"),
      ]);
      setRequests(reqRes.requests || []);
      setStats(statsRes);
      setUsers(usersRes.users || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReject = async (id, adminComment) => {
    setError("");
    try {
      await api(`/api/leave-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected", adminComment }),
      });
      const [reqRes, statsRes, usersRes] = await Promise.all([
        api("/api/leave-requests"),
        api("/api/stats"),
        api("/api/users"),
      ]);
      setRequests(reqRes.requests || []);
      setStats(statsRes);
      setUsers(usersRes.users || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSetBalance = async (userId, bal) => {
    setError("");
    try {
      await api("/api/leave-balance", {
        method: "POST",
        body: JSON.stringify({ userId, ...bal }),
      });
      const usersRes = await api("/api/users");
      setUsers(usersRes.users || []);
    } catch (err) {
      setError(err.message);
    }
  };

  if (authLoading || loggingOut) {
    return (
      <div style={{ ...base, color: "#9ca3af" }}>
        {loggingOut ? "Logging out..." : "Loading..."}
      </div>
    );
  }

  if (!user) {
    if (authScreen === "landing") {
      return (
        <LandingPage
          onSelectAdmin={() => { setAuthScreen("admin"); clearAuthForm(); }}
          onSelectEmployeeLogin={() => { setAuthScreen("employee-login"); clearAuthForm(); }}
          onSelectEmployeeRegister={() => { setAuthScreen("employee-register"); clearAuthForm(); setAuthMode("register"); }}
        />
      );
    }
    const isAdminAuth = authScreen === "admin";
    const employeeScreen =
      authScreen === "employee-login" ? "login" : authScreen === "employee-register" ? "register" : "both";
    const mode = isAdminAuth ? "login" : employeeScreen === "login" ? "login" : employeeScreen === "register" ? "register" : authMode;
    const onSubmit =
      isAdminAuth || mode === "login" ? handleLogin : handleRegister;
    return (
      <AuthPage
        authType={isAdminAuth ? "admin" : "employee"}
        employeeScreen={employeeScreen}
        onBack={() => { setAuthScreen("landing"); clearAuthForm(); }}
        mode={mode}
        onModeChange={setAuthMode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        role={role}
        setRole={setRole}
        fullName={fullName}
        setFullName={setFullName}
        phone={phone}
        setPhone={setPhone}
        department={department}
        setDepartment={setDepartment}
        employeeId={employeeId}
        setEmployeeId={setEmployeeId}
        error={error}
        setError={setError}
        onSubmit={onSubmit}
        loading={authSubmitLoading}
        onForgotPassword={handleForgotPassword}
      />
    );
  }

  if (isAdmin) {
    return (
      <AdminDashboard
        user={user}
        onLogout={handleLogout}
        requests={requests}
        users={users}
        stats={stats}
        loading={dataLoading}
        error={error}
        onApprove={handleApprove}
        onReject={handleReject}
        onSetBalance={handleSetBalance}
      />
    );
  }

  return (
    <UserDashboard
      user={user}
      onLogout={handleLogout}
      balance={balance}
      requests={requests}
      loading={dataLoading}
      error={error}
      onApply={handleApply}
      onCancel={handleCancel}
    />
  );
}

export default App;
