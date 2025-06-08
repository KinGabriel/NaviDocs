import React, { useState } from 'react';
import axios from 'axios';
import sluLogo from '../assets/images/slulogo.png';
import naviLogo from '../assets/images/navilogo.png';
import userIcon from '../assets/images/user_icon.png';
import passwordIcon from '../assets/images/password_icon.png';


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }
    try {
      const response = await axios.post('http://localhost:8001/api/users/login', {
        email,
        password,
      });
      localStorage.setItem('token', response.data.token);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left side  */}
      <div className="w-1/2 flex flex-col justify-center items-center bg-gradient-to-b from-blue-100 to-blue-300">
        <img src={naviLogo} alt="Navidocs Logo" className="w-160  mb-4" />
        <h1 className="text-7xl font-bold tracking-widest mb-2 text-[#1a237e] font-poppins"> NAVIDOCS </h1>
        <p className="text-m  font-semibold mt-2">Smart Docs. Smooth Flow. NaviDocs.</p>
      </div>
      {/* Right side  */}
      <div className="w-1/2 flex flex-col justify-center items-center bg-white ">
        <img src={sluLogo} alt="School Logo" className="w-30 mb-6" />
        <h2 className="text-7xl font-bold text-yellow-400 mb-4">Welcome!</h2>
        <p className="mb-8 text-lg text-gray-500">Please enter your details</p>
        <form className="w-[40rem] max-w-full" onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 text-red-500 text-center font-semibold">{error}</div>
          )}
          <div className="mb-6 relative">
            <img
              src={userIcon}
              alt="User Icon"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-7 h-7"
            />
            <input
              type="text"
              placeholder="Username"
              className="w-full pl-12 pr-4 py-4 text-lg rounded-lg border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6 relative">
            <img
              src={passwordIcon}
              alt="Password Icon"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-7 h-7"
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full pl-12 pr-4 py-4 text-lg rounded-lg border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
            <button
            type="submit"
            className="w-full py-4 rounded-lg bg-gradient-to-r from-blue-700 to-blue-400 text-white font-bold text-xl mb-3 shadow-lg
                        transition-all duration-200 ease-in-out active:scale-95 active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
            >
            {isLoading ? (
            <div className="flex justify-center items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Logging in...
            </div>
            ) : "Login"}
            </button>
          <div className="text-center">
            <a href="#" className="text-base text-gray-400 hover:underline">
              Forgot Password
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}