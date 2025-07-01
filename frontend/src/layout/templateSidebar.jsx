export default function TemplateSidebar({ tabs, activeTab, setActiveTab }) {
 return (
    <div className="bg-[#f6f8fe] w-[120px] flex flex-col items-center  gap-2 ">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
         className={`flex flex-col items-center w-full py-4 transition
         ${activeTab === tab.key ? "bg-white shadow font-bold  " : ""}
         }
         `}
        >
          <span className="mb-1 text-2xl">{tab.icon}</span>
          <span className="text-xs">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}