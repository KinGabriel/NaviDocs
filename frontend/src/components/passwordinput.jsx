import React, { useState } from 'react';
import passwordIcon from '../assets/images/password_icon.png';

export default function PasswordInput({ value, onChange, placeholder = "Password", name = "password" }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="mb-6 relative">
      <img
        src={passwordIcon}
        alt="Password Icon"
        className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6.5 h-6.5"
      />
      <input
        type={showPassword ? 'text' : 'password'}
        name={name}
        placeholder={placeholder}
        className="w-full pl-12 pr-12 py-4 text-lg rounded-lg border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={value}
        onChange={onChange}
        required
      />
      {/* eye icon toggle */}
      <button
        type="button"
        className="absolute right-4 top-1/2 transform -translate-y-1/2"
        onClick={() => setShowPassword((prev) => !prev)}
        tabIndex={-1}
      >
        {showPassword ? (
          // eye open
          <svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 24 24"><g fill="none" stroke="#9b9b9b" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
            <path d="M21.257 10.962c.474.62.474 1.457 0 2.076C19.764 14.987 16.182 19 12 19s-7.764-4.013-9.257-5.962a1.69 1.69 0 0 1 0-2.076C4.236 9.013 7.818 5 12 5s7.764 4.013 9.257 5.962"/>
            <circle cx="12" cy="12" r="3"/></g>
          </svg>
        ) : (
          // eye closed
         <svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 16 16">
          <path fill="#9b9b9b" d="M8 11c-1.65 0-3-1.35-3-3s1.35-3 3-3s3 1.35 3 3s-1.35 3-3 3m0-5c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"/>
          <path fill="#9b9b9b" d="M8 13c-3.19 0-5.99-1.94-6.97-4.84a.44.44 0 0 1 0-.32C2.01 4.95 4.82 3 8 3s5.99 1.94 6.97 4.84c.04.1.04.22 0 .32C13.99 11.05 11.18 13 8 13M2.03 8c.89 2.4 3.27 4 5.97 4s5.07-1.6 5.97-4C13.08 5.6 10.7 4 8 4S2.93 5.6 2.03 8"/>
          <path fill="#9b9b9b" d="M14 14.5a.47.47 0 0 1-.35-.15l-12-12c-.2-.2-.2-.51 0-.71s.51-.2.71 0l11.99 12.01c.2.2.2.51 0 .71c-.1.1-.23.15-.35.15Z"/>
         </svg>
        )}
      </button>
    </div>
  );
}
