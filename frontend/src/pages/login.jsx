import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Navigate, useNavigate } from 'react-router-dom';
import { loginAPI } from "../api/authAPI";
import sluLogo from '../assets/images/slulogo.png';
import naviLogo from '../assets/images/navilogo.png';
import userIcon from '../assets/images/user_icon.png';
import PasswordInput from '../components/passwordinput.jsx';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!email || !password) {
      toast.error("Please fill in all fields");
      setLoading(false);
      return;
    }
    try {
      const data = await loginAPI(email, password);
      localStorage.setItem('user', JSON.stringify(data.user));
      const userRole = data.user.role.name;
      toast.success("Login successful!");
      switch (userRole) {
        case 'Admin':
          navigate('/admin/dashboard');
          break;
        case 'Faculty':
          navigate('/faculty/dashboard');
          break;
        case 'Dean':
          navigate('/dean/dashboard');
          break;
        case 'Secretary':
          navigate('/secretary/dashboard');
          break;
        case 'Document Controller':
          navigate('/document-controller/dashboard');
          break;
        case 'Lead Document Controller':
          navigate('/document-controller/dashboard');
          break;
        case 'Document Control Officer':
          navigate('/document-controller/dashboard');
          break;
        case 'Unit Document Controller':
          navigate('/document-controller/dashboard');
          break;
        case 'Department Head':
          navigate('/dept-head/dashboard');
          break;
        default:
          toast.error("Unknown role");
      }
    } catch (err) {
      if (err.response?.status === 404 || err.message.includes("not found")) {
      toast.error("The email you entered isn’t connected to an account.");
    } else {
      toast.error(err.message || "Login failed");
    }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side  */}
      <div className="md:w-1/2 w-full flex flex-col justify-center items-center bg-gradient-to-b from-blue-100 to-blue-300 p-6 md:p-12 lg:p-16">
        <img src={naviLogo} alt="Navidocs Logo" className="mb-4 max-w-[14rem] sm:max-w-[14rem] md:max-w-[18rem] lg:max-w-none" />
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-widest mb-2 text-[#1a237e] font-poppins"> NAVIDOCS </h1>
        <p className="text-sm sm:text-base md:text-lg font-semibold mt-2">Smart Docs. Smooth Flow. NaviDocs.</p>
      </div>
      {/* Right side  */}
      <div className="md:w-1/2 w-full flex flex-col justify-center items-center bg-white p-6 md:p-12 lg:p-16">
        <img src={sluLogo} alt="School Logo" className="mb-6 w-16 sm:w-20 md:w-28 lg:w-36" />
        <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-yellow-400 mb-4">Welcome!</h2>
        <p className="mb-6 text-sm sm:text-base md:text-lg text-gray-500">Please enter your details</p>
        <form className="w-full max-w-md md:max-w-lg" onSubmit={handleSubmit}>
          <div className="mb-6 relative">
            <img
              src={userIcon}
              alt="User Icon"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7"
            />
            <input
              type="text"
              placeholder="Email Address"
              className="w-full pl-12 pr-4 py-3 md:py-4 text-sm sm:text-base md:text-base lg:text-lg rounded-lg border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6 relative">
            {/* password input - if the users wants to check their pw */}
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <div className="text-right mb-4">
            <a href="#" className="text-base text-gray-400 hover:underline">
              Forgot Password?
            </a>
          </div>
          <button
            type="submit"
            className="w-full py-3 sm:py-3 md:py-4 mt-8 md:mt-10 rounded-lg bg-gradient-to-r from-blue-700 to-blue-400 text-white font-bold text-base md:text-lg lg:text-xl mb-3 shadow-lg transition-all duration-200 ease-in-out active:scale-95 active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex justify-center items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><circle cx="18" cy="12" r="0" fill="#fff">
                  <animate attributeName="r" begin=".67" calcMode="spline" dur="1.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/></circle>
                  <circle cx="12" cy="12" r="0" fill="#fff"><animate attributeName="r" begin=".33" calcMode="spline" dur="1.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/></circle>
                  <circle cx="6" cy="12" r="0" fill="#fff"><animate attributeName="r" begin="0" calcMode="spline" dur="1.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/></circle>
                </svg>
                Logging in...
              </div>
            ) : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}