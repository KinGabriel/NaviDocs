import { SearchX, Home } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F6FF] via-[#F4F6FF] to-blue-50 flex items-center justify-center px-6">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-32 h-32 bg-[#003DA5]/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-[#003DA5]/10 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-[#FFB200]/15 rounded-full blur-lg"></div>
      </div>
      
      <div className="relative z-10 text-center max-w-lg">
        {/* Main content*/}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-10">
          {/* Icon container */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="bg-gradient-to-br from-[#003DA5] to-[#003DA5] p-6 rounded-2xl shadow-lg">
                <SearchX className="h-16 w-16 text-white" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-[#003DA5] to-[#003DA5] rounded-2xl blur-md opacity-30 -z-10"></div>
            </div>
          </div>
          
          {/* Error code */}
          <div className="mb-6">
            <h1 className="text-7xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-2">
              404
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-[#344BFD] to-[#1F2D97] mx-auto rounded-full"></div>
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-3">
              Page Not Found
            </h2>
            <p className="text-slate-600 leading-relaxed">
              The page you're looking for might have been moved, deleted, or entered incorrectly. Let's get you back on track.
            </p>
          </div>
          
          {/* Action button */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate("/")}
              className="bg-gradient-to-r from-[#344BFD] to-[#1F2D97] hover:from-[#344BFD] hover:to-[#1F2D97] text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
            <Home size={20} className="inline-block mr-3" />
              Return Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}