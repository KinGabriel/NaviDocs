import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './assets/css/global.css'
import Login from './pages/login';

function App() {
  return(
    <>
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
      </Routes>
    </Router>
    </>
  )
}

export default App
