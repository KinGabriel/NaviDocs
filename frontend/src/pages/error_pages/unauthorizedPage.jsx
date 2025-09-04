import { Shield, ArrowLeft, LogIn} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UnauthorizedPage() {
   const navigate = useNavigate(); 

  const handleLogin = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F6FF] via-red-50 to-pink-50 flex items-center justify-center px-6">
      {/* Background  */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-32 h-32 bg-red-200/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-[#003DA5]/10 rounded-full blur-2xl"></div>
        <div className="absolute top-1/3 left-1/3 w-24 h-24 bg-pink-200/15 rounded-full blur-lg"></div>
      </div>
      
      <div className="relative z-10 text-center max-w-2xl">
        {/* Main content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-10">
          {/* Icon container */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-2xl shadow-lg">
                <Shield className="h-16 w-16 text-white" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-red-500 rounded-2xl blur-md opacity-30 -z-10"></div>
            </div>
          </div>
          
          {/* Error code */}
          <div className="mb-6">
            <h1 className="text-7xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-2">
              401
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-red-500 to-[#EB8317] mx-auto rounded-full"></div>
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-3">
              Access Denied
            </h2>
            <p className="text-slate-600 leading-relaxed">
              You don’t have permission to access this page in NaviDocs. Please log in with the right account or contact your administrator if you believe this is a mistake.
            </p>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button 
              onClick={handleLogin}
              className="bg-gradient-to-r from-[#003DA5] to-[#003DA5] hover:from-[#002A7A] hover:to-[#002A7A] text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 w-35 m"
            >
              <LogIn className="h-5 w-5 mr-3" />
              Sign In
            </button>
            <button 
              onClick={() => navigate(-1)}
              className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-5 w-5" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}