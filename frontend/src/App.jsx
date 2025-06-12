import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './assets/css/global.css'
import Login from './pages/login';
import AdminDashboard from './pages/adminDashboard';
import AdminAccounts from './pages/adminAccounts';

function App() {
  return(
    <>
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/accounts" element={<AdminAccounts />} />
      </Routes>
    </Router>
    </>
  )
}

export default App
