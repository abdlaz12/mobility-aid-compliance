import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, homeFor, useAuth } from "./auth/AuthContext";
import { AppShell } from "./components/shell/AppShell";
import type { Role } from "./data/types";
import { AdminProvider } from "./data/admin";
import { AddPatient } from "./screens/admin/AddPatient";
import { PatientDetail } from "./screens/admin/PatientDetail";
import { AdminPatients } from "./screens/admin/Patients";
import { AdminSettings } from "./screens/admin/Settings";
import { AddUser, AdminUsers, UserDetail } from "./screens/admin/Users";
import { DataProvider } from "./data/store";
import { FamilyHome } from "./screens/family/Home";
import { AlertDetail } from "./screens/nurse/AlertDetail";
import { Dashboard } from "./screens/nurse/Dashboard";
import { PatientPage } from "./screens/nurse/PatientPage";
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
        <DataProvider>
        <AdminProvider>
        <Routes>
          <Route path="/login" element={<SignIn />} />
          <Route element={<RequireAuth />}>
            <Route index element={<RoleHome />} />
            {/* Nurse flow (the admin sees the same dashboard with all patients) */}
            <Route path="dashboard" element={<Only roles={["nurse", "admin"]}><Dashboard /></Only>} />
            <Route path="alerts/:id" element={<Only roles={["nurse", "admin"]}><AlertDetail /></Only>} />
            <Route path="patients/:id" element={<Only roles={["nurse", "admin"]}><PatientPage /></Only>} />
            {/* Family flow */}
            <Route path="home" element={<Only roles={["family"]}><FamilyHome /></Only>} />
            {/* Admin flow */}
            <Route path="admin/patients" element={<Only roles={["admin"]}><AdminPatients /></Only>} />
            <Route path="admin/patients/new" element={<Only roles={["admin"]}><AddPatient /></Only>} />
            <Route path="admin/patients/:id" element={<Only roles={["admin"]}><PatientDetail /></Only>} />
            <Route path="admin/users" element={<Only roles={["admin"]}><AdminUsers /></Only>} />
            <Route path="admin/users/new" element={<Only roles={["admin"]}><AddUser /></Only>} />
            <Route path="admin/users/:id" element={<Only roles={["admin"]}><UserDetail /></Only>} />
            <Route path="admin/settings" element={<Only roles={["admin"]}><AdminSettings /></Only>} />
            {/* Everyone */}
            <Route path="account" element={<Placeholder title="Account" flow="Account" />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </AdminProvider>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
