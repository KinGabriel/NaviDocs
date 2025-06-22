import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './assets/css/global.css'
import Login from './pages/login';
import AdminDashboard from './pages/admin/adminDashboard';
import AdminAccounts from './pages/admin/adminAccounts';
import DocumentControllerDashboard from './pages/document_controller/documentControllerDashboard';
import DocumentControllerTemplates from './pages/document_controller/documentControllerTemplates';
import ProtectedRoute from './guards/protectedroute';

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
      </Routes>
    </Router>
  )
}

export default App
