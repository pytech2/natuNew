import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminEmployees from "./pages/admin/Employees";
import AdminProperties from "./pages/admin/Properties";
import AdminUpload from "./pages/admin/Upload";
import AdminSubmissions from "./pages/admin/Submissions";
import AdminExport from "./pages/admin/Export";
import AdminMap from "./pages/admin/Map";
import AdminBills from "./pages/admin/Bills";
import AdminBillsMap from "./pages/admin/BillsMap";
import AdminAttendance from "./pages/admin/Attendance";
import AdminTowns from "./pages/admin/Towns";
import EmployeeDashboard from "./pages/employee/Dashboard";
import EmployeeProperties from "./pages/employee/Properties";
import EmployeeSurvey from "./pages/employee/Survey";
import EmployeeAttendance from "./pages/employee/Attendance";
import EmployeePropertyMap from "./pages/employee/PropertyMap";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TownProvider } from "./context/TownContext";
import "@/App.css";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse-slow text-slate-600">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect based on role
    if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
      return <Navigate to="/admin" replace />;
    } else if (user.role === 'MC_OFFICER') {
      return <Navigate to="/admin" replace />; // MC Officer also goes to admin but with limited view
    }
    return <Navigate to="/employee" replace />;
  }
  
  return children;
}

// All non-admin roles that can access employee/surveyor routes
const SURVEYOR_ROLES = ['EMPLOYEE', 'SURVEYOR'];

// Admin-level roles (full access)
const ADMIN_ROLES = ['ADMIN', 'SUPERVISOR'];

// Roles that can view admin dashboard (includes MC_OFFICER with limited access)
const ADMIN_VIEW_ROLES = ['ADMIN', 'SUPERVISOR', 'MC_OFFICER'];

function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Admin Routes - Full Access (ADMIN, SUPERVISOR) */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={ADMIN_VIEW_ROLES}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/employees" element={
        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
          <AdminEmployees />
        </ProtectedRoute>
      } />
      <Route path="/admin/properties" element={
        <ProtectedRoute allowedRoles={ADMIN_VIEW_ROLES}>
          <AdminProperties />
        </ProtectedRoute>
      } />
      <Route path="/admin/upload" element={
        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
          <AdminUpload />
        </ProtectedRoute>
      } />
      <Route path="/admin/submissions" element={
        <ProtectedRoute allowedRoles={ADMIN_VIEW_ROLES}>
          <AdminSubmissions />
        </ProtectedRoute>
      } />
      <Route path="/admin/export" element={
        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
          <AdminExport />
        </ProtectedRoute>
      } />
      <Route path="/admin/map" element={
        <ProtectedRoute allowedRoles={ADMIN_VIEW_ROLES}>
          <AdminMap />
        </ProtectedRoute>
      } />
      <Route path="/admin/bills" element={
        <ProtectedRoute allowedRoles={ADMIN_VIEW_ROLES}>
          <AdminBills />
        </ProtectedRoute>
      } />
      <Route path="/admin/bills-map" element={
        <ProtectedRoute allowedRoles={ADMIN_VIEW_ROLES}>
          <AdminBillsMap />
        </ProtectedRoute>
      } />
      <Route path="/admin/attendance" element={
        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
          <AdminAttendance />
        </ProtectedRoute>
      } />
      <Route path="/admin/towns" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminTowns />
        </ProtectedRoute>
      } />
      
      {/* Employee/Surveyor Routes */}
      <Route path="/employee" element={
        <ProtectedRoute allowedRoles={SURVEYOR_ROLES}>
          <EmployeeDashboard />
        </ProtectedRoute>
      } />
      <Route path="/employee/properties" element={
        <ProtectedRoute allowedRoles={SURVEYOR_ROLES}>
          <EmployeeProperties />
        </ProtectedRoute>
      } />
      <Route path="/employee/survey/:propertyId" element={
        <ProtectedRoute allowedRoles={SURVEYOR_ROLES}>
          <EmployeeSurvey />
        </ProtectedRoute>
      } />
      <Route path="/employee/attendance" element={
        <ProtectedRoute allowedRoles={SURVEYOR_ROLES}>
          <EmployeeAttendance />
        </ProtectedRoute>
      } />
      <Route path="/employee/property-map" element={
        <ProtectedRoute allowedRoles={SURVEYOR_ROLES}>
          <EmployeePropertyMap />
        </ProtectedRoute>
      } />
      
      {/* Default redirect */}
      <Route path="/" element={
        user ? (
          <Navigate to={
            user.role === 'ADMIN' || user.role === 'SUPERVISOR' || user.role === 'MC_OFFICER' 
              ? '/admin' 
              : '/employee'
          } replace />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
