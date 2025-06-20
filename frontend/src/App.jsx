import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './assets/css/global.css'
import Login from './pages/login';
import AdminDashboard from './pages/admin/adminDashboard';
import AdminAccounts from './pages/admin/adminAccounts';
import DocumentControllerDashboard from './pages/document_controller/documentControllerDashboard';
import DocumentControllerTemplates from './pages/document_controller/documentControllerTemplates';
function App() {
  return(
    <>
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/accounts" element={<AdminAccounts />} />
        <Route path="/document-controller/dashboard" element={<DocumentControllerDashboard />} />
        <Route path="/document-controller/templates" element={<DocumentControllerTemplates/> } />
      </Routes>
    </Router>
    </>
  )
}

export default App
