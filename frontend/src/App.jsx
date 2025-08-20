import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './assets/css/global.css'
import Login from './pages/login';
import AdminDashboard from './pages/admin/adminDashboard';
import AdminAccounts from './pages/admin/adminAccounts';
import CreateUser from './pages/admin/adminCreateUser';
import AccountSettings from "./pages/accountSettings";
import AdminEditUser from "./pages/admin/adminEditUser";
import DocumentControllerDashboard from './pages/document_controller/documentControllerDashboard';
import DocumentControllerTemplates from './pages/document_controller/documentControllerTemplates';
import DocumentControllerCreateTemplate from './pages/document_controller/documentControllerCreateTemplate';
import ProtectedRoute from './guards/protectedroute';
import DocumentControllerStatistics from './pages/document_controller/documentControllerStatistics';
import DocumentControllerStorage from './pages/document_controller/documentControllerStorage';
import DocumentControllerWorkFlow from './pages/document_controller/documentControllerWorkFlow';
import DocumentControllerDocuments from './pages/document_controller/documentControllerDocuments';
import NotFoundPage from './pages/error_pages/notFoundPage';
import ServerErrorPage from './pages/error_pages/serverErrorPage';
import UnauthorizedPage from './pages/error_pages/UnauthorizedPage';
import useUser from './hooks/useUser';
import { Navigate } from "react-router-dom";
import SecretaryDashboard from './pages/secretary/secretaryDashboard';
import SecretaryTemplates from './pages/secretary/secretaryTemplates';
import DeanDashboard from './pages/dean/deanDashboard';
import DeanDocuments from './pages/dean/deanDocuments';

/**
 * LoginRoute component checks if the user is logged in and if not it will return back to login page.
 */
function LoginRoute() {
  const user = useUser();
  if (user) {
    const role = user.role?.name;
    if (role === "Admin") return <Navigate to="/admin/dashboard" replace />;
    if (role === "Document Controller") return <Navigate to="/document-controller/dashboard" replace />;

  }
  return <Login />;
}

function App() {
  return(
    <Router>
      <Routes>
        <Route path="/" element={<LoginRoute />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/document-controller" element={<Navigate to="/document-controller/dashboard" replace />} />

        {/* Admin Module */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/accounts"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminAccounts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/create-user"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <CreateUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/edit-user"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminEditUser />
            </ProtectedRoute>
          }
        />

        {/* Document Controller Module */}
        <Route
          path="/document-controller/dashboard"
          element={
            <ProtectedRoute allowedRoles={["Document Controller"]}>
              <DocumentControllerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/document-controller/templates"
          element={
            <ProtectedRoute allowedRoles={["Document Controller"]}>
              <DocumentControllerTemplates />
            </ProtectedRoute>
          }
          />
        <Route
          path="/document-controller/create-template"
          element={
            <ProtectedRoute allowedRoles={["Document Controller"]}>
              <DocumentControllerCreateTemplate />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/document-controller/statistics"
          element={
            <ProtectedRoute allowedRoles={["Document Controller"]}>
              <DocumentControllerStatistics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/document-controller/document-workflow"
          element={
            <ProtectedRoute allowedRoles={["Document Controller"]}>
              <DocumentControllerWorkFlow />
            </ProtectedRoute>
          }
        />
        <Route
          path="/document-controller/storage"
          element={
            <ProtectedRoute allowedRoles={["Document Controller"]}>
              <DocumentControllerStorage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/document-controller/documents"
          element={
            <ProtectedRoute allowedRoles={["Document Controller"]}>
              <DocumentControllerDocuments />
            </ProtectedRoute>
          }
        />

        {/* Secretary Module */}
         <Route
          path="/secretary/dashboard"
          element={
            <ProtectedRoute allowedRoles={["Secretary"]}>
              <SecretaryDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/secretary/templates"
          element={
            <ProtectedRoute allowedRoles={["Secretary"]}>
              <SecretaryTemplates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/secretary/settings"
          element={
            <ProtectedRoute allowedRoles={["Secretary"]}>
              <AccountSettings />
            </ProtectedRoute>
          }
        />

        {/* Dean Module */}
        <Route
          path="/dean/dashboard"
          element={
            <ProtectedRoute allowedRoles={["Dean"]}>
              <DeanDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dean/documents"
          element={
            <ProtectedRoute allowedRoles={["Dean"]}>
              <DeanDocuments />
            </ProtectedRoute>
          }
        />

        {/* Global */}
         <Route
          path="/account/settings"
          element={
            <ProtectedRoute allowedRoles={["Admin", "Document Controller","Secretary", "Dean"]}>
              <AccountSettings />
            </ProtectedRoute>
          }
        />
        
        {/* Error Pages */}
        <Route path="*" 
          element={<NotFoundPage />} />
        <Route path="/server-error" 
          element={<ServerErrorPage />} />
        <Route path="/unauthorized" 
          element={<UnauthorizedPage />} />
      </Routes>
      
    </Router>
  )
}

export default App
