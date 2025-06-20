export default function TemplateCard() {
  return (
    <div className="w-[260px] bg-white rounded shadow border flex flex-col overflow-hidden hover:shadow-md transition mt-5">
        
    {/* change the logic for dynamic contents */}
      {/* document preview */}
      <div className="w-full h-[310px] bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400 text-sm">*Preview Image of Document</span>
      </div>

      {/* footer */}
      <div className="flex items-start justify-between px-3 py-3 border-t">
        <div>
          <p className="text-sm font-medium text-black leading-tight">Course Syllabi 2026–2027</p>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20">
            <path fill="none" stroke="#79747E" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M21 19.75c0-2.09-1.67-5.068-4-5.727m-2 5.727c0-2.651-2.686-6-6-6s-6 3.349-6 6m9-12.5a3 3 0 1 1-6 0a3 3 0 0 1 6 0m3 3a3 3 0 1 0 0-6" />
        </svg>
            <span>Opened March 24, 2025</span>
          </div>
        </div>

        {/* 3-dot menu */}
        <div className="flex items-center justify-center">
          <svg
            className="w-5 h-5 text-gray-500 hover:text-gray-700 cursor-pointer"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 2a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm0 5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
