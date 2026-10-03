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
    <div className="loginPage">
      <form className="loginCard" onSubmit={handleSubmit}>
        <div className="loginLogo">◆</div>
        <h1 className="loginTitle">VELoop Rewards</h1>
        <p className="loginSub">Sign in to start earning Gems</p>

        <label className="loginLabel" htmlFor="email">Email</label>
        <input
          id="email"
          className="loginInput"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />

        <label className="loginLabel" htmlFor="password">Password</label>
        <input
          id="password"
          className="loginInput"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />

        {error && <p className="loginError">{error}</p>}

        <button className="loginBtn" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p className="loginHint">
          Demo account is pre-filled. Run <code>npm run seed</code> in the backend first.
        </p>
      </form>
    </div>
  );
}
