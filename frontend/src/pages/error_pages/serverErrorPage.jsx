import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function ServerErrorPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleRefresh = () => {
    navigate(location.pathname, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center px-6">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-32 h-32 bg-amber-200/30 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-orange-200/20 rounded-full blur-2xl"></div>
        <div className="absolute top-1/3 right-1/3 w-24 h-24 bg-red-200/20 rounded-full blur-lg"></div>
      </div>
      
      <div className="relative z-10 text-center max-w-2xl">
        {/* Main content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-10">
          {/* Icon container */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-2xl shadow-lg">
                <AlertTriangle className="h-16 w-16 text-white" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl blur-md opacity-30 -z-10"></div>
            </div>
          </div>

          {/* Error code */}
          <div className="mb-6">
            <h1 className="text-7xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-2">
              500
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-orange-600 mx-auto rounded-full"></div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-3">
              Server Error
            </h2>
            <p className="text-slate-600 leading-relaxed">
              NaviDocs is currently experiencing an internal error. Our team has been notified and is already working to fix the issue. Please try again shortly.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={handleRefresh}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            <button 
              onClick={() => navigate(-1)}
              className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
