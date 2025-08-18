import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './assets/css/global.css'
import Login from './pages/login';
import AdminDashboard from './pages/admin/adminDashboard';
import AdminAccounts from './pages/admin/adminAccounts';
import CreateUser from './pages/admin/adminCreateUser';
import DocumentControllerDashboard from './pages/document_controller/documentControllerDashboard';
import DocumentControllerTemplates from './pages/document_controller/documentControllerTemplates';
import DocumentControllerCreateTemplate from './pages/document_controller/documentControllerCreateTemplate';
import ProtectedRoute from './guards/protectedroute';
import DocumentControllerStatistics from './pages/document_controller/documentControllerStatistics';
import NotFoundPage from './pages/error_pages/notFoundPage';
import ServerErrorPage from './pages/error_pages/serverErrorPage';
import UnauthorizedPage from './pages/error_pages/UnauthorizedPage';

function App() {
  return(
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
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
