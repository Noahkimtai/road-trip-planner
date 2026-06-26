import { Suspense } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { LoginPage } from "./components/auth/LoginPage";
import { RegisterPage } from "./components/auth/RegisterPage";
import Home from "./components/home";
import DynamicFeatureDemo from "./components/DynamicFeatureDemo";
import { Toaster } from "./components/ui/toaster";
import routes from "tempo-routes";

// Wrapper so useRoutes is never called conditionally (hooks must run on every render)
const TempoRoutes = () => useRoutes(routes);

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<p>Loading...</p>}>
        <>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />
            <Route path="/demo" element={
              <ProtectedRoute>
                <DynamicFeatureDemo />
              </ProtectedRoute>
            } />
          </Routes>
          {import.meta.env.VITE_TEMPO === "true" && <TempoRoutes />}
          <Toaster />
        </>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
