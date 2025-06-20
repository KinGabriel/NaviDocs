import { useState } from 'react';
import Header from '../../layout/header'; 
import Sidebar from '../../layout/sidebar';
import useUser from '../../hooks/useUser'; 
import SearchBar from '../../components/searchbar';
import Dropdown from '../../components/dropdown';
import TemplateCard from '../../components/templatecard';

export default function DocumentControllerTemplates() {
  const user = useUser();
  const [search, setSearch] = useState('');

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Templates" />
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <div className="flex-1 p-10">
            <h2 className="text-3xl font-semibold mb-2 tracking-wide">TEMPLATES</h2>
            <div className="w-30 h-1 bg-yellow-400 mb-6 rounded" />

            {/* Filter, Sort, Search - Visual Only */}
            <div className="flex items-center gap-2 mb-4">
              {/* Filter by Type */}
              <Dropdown
                options={["All", "Academic", "Administrative"]}
                value="All"
                onChange={() => {}}
                width="w-50"
              />

              {/* Sort by */}
              <Dropdown
                options={["A-Z", "Z-A"]}
                value="A-Z"
                onChange={() => {}}
                width="w-36"
              />

              {/* Search bar */}
              <div className="flex-1 flex justify-start m-2">
                <div className="w-64">
                  <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>

             {/* create template btn */}
            <div className="flex-1 flex justify-end ">
            <button className="flex items-center gap-2 bg-[#0035DA] hover:bg-[#043485] text-white font-semibold px-5 py-2 rounded shadow">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                   </svg>
                   Create Template
            </button>
                 </div>      
            </div>

            {/* placeholder template content */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[...Array(3)].map((_, i) => (
            <TemplateCard key={i} />
            ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
