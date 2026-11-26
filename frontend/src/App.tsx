import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, homeFor, useAuth } from "./auth/AuthContext";
import { AppShell } from "./components/shell/AppShell";
import type { Role } from "./data/types";
import { NotFound, Placeholder } from "./screens/Placeholder";
import { SignIn } from "./screens/SignIn";

function RequireAuth() {
  const { user } = useAuth();
  return user ? <AppShell /> : <Navigate to="/login" replace />;
}

/** Sends a signed-in user who opens a page of another role back to their own home. */
function Only({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  return roles.includes(user.role) ? <>{children}</> : <Navigate to={homeFor(user.role)} replace />;
}

function RoleHome() {
  const { user } = useAuth();
  return <Navigate to={user ? homeFor(user.role) : "/login"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<SignIn />} />
          <Route element={<RequireAuth />}>
            <Route index element={<RoleHome />} />
            {/* Nurse flow (the admin sees the same dashboard with all patients) */}
            <Route path="dashboard" element={<Only roles={["nurse", "admin"]}><Placeholder title="Dashboard" flow="Nurse flow" /></Only>} />
            <Route path="alerts/:id" element={<Only roles={["nurse", "admin"]}><Placeholder title="Alert detail" flow="Nurse flow" /></Only>} />
            <Route path="patients/:id" element={<Only roles={["nurse", "admin"]}><Placeholder title="Patient" flow="Nurse flow" /></Only>} />
            {/* Family flow */}
            <Route path="home" element={<Only roles={["family"]}><Placeholder title="Home" flow="Family flow" /></Only>} />
            {/* Admin flow */}
            <Route path="admin/patients" element={<Only roles={["admin"]}><Placeholder title="Patients" flow="Admin flow" /></Only>} />
            <Route path="admin/patients/new" element={<Only roles={["admin"]}><Placeholder title="Add patient" flow="Admin flow" /></Only>} />
            <Route path="admin/patients/:id" element={<Only roles={["admin"]}><Placeholder title="Patient detail" flow="Admin flow" /></Only>} />
            <Route path="admin/users" element={<Only roles={["admin"]}><Placeholder title="Users" flow="Admin flow" /></Only>} />
            <Route path="admin/users/new" element={<Only roles={["admin"]}><Placeholder title="Add user" flow="Admin flow" /></Only>} />
            <Route path="admin/users/:id" element={<Only roles={["admin"]}><Placeholder title="User detail" flow="Admin flow" /></Only>} />
            <Route path="admin/settings" element={<Only roles={["admin"]}><Placeholder title="Settings" flow="Admin flow" /></Only>} />
            {/* Everyone */}
            <Route path="account" element={<Placeholder title="Account" flow="Account" />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
