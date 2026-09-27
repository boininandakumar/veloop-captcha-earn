import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@veloop.test");
  const [password, setPassword] = useState("Demo@12345");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/captcha-earn");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 360,
          maxWidth: "100%",
          background: "var(--veloop-panel)",
          border: "1px solid var(--veloop-border)",
          borderRadius: 20,
          padding: 28,
          backdropFilter: "blur(10px)",
        }}
      >
        <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>VELoop Rewards</h1>
        <p style={{ color: "var(--veloop-text-dim)", margin: "0 0 20px", fontSize: 14 }}>
          Sign in to start earning Gems
        </p>

        <label style={{ fontSize: 13, color: "var(--veloop-text-dim)" }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          style={inputStyle}
        />

        <label style={{ fontSize: 13, color: "var(--veloop-text-dim)" }}>Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          style={inputStyle}
        />

        {error && <p style={{ color: "var(--veloop-red)", fontSize: 13 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 8,
            padding: "12px 16px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg, var(--veloop-blue), var(--veloop-purple))",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p style={{ fontSize: 12, color: "var(--veloop-text-dim)", marginTop: 14 }}>
          Demo account is pre-filled. Run <code>npm run seed</code> in the backend first.
        </p>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  marginTop: 6,
  marginBottom: 14,
  borderRadius: 10,
  border: "1px solid var(--veloop-border)",
  background: "rgba(255,255,255,0.03)",
  color: "var(--veloop-text)",
  outline: "none",
};
