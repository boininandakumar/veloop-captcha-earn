import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login/Login.jsx";
import CaptchaEarn from "./pages/CaptchaEarn/CaptchaEarn.jsx";

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return null;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/captcha-earn"
        element={
          <ProtectedRoute>
            <CaptchaEarn />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/captcha-earn" replace />} />
    </Routes>
  );
}
