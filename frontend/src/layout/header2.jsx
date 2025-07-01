import naviLogo from '../assets/images/navilogo.png';

export default function Header2({ title, setTitle,user }) {
  return (
    <div>
      <div className="h-4 bg-[#063c8d] w-full" />
      <div className="flex items-center justify-between bg-[#f3f3f3] px-6 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <img src={naviLogo} alt="Logo" className="w-12 h-12" />
          <input
            className="bg-transparent text-lg font-semibold outline-none"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <span className="ml-2 text-gray-400 cursor-pointer text-lg" title="Edit title">✏️</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-[#063c8d] text-white rounded px-4 py-1.5 text-sm font-semibold hover:bg-[#052c6d]">Save</button>
          <button className="bg-[#063c8d] text-white rounded px-4 py-1.5 text-sm font-semibold hover:bg-[#052c6d]">Publish</button>
          <button className="bg-[#063c8d] text-white rounded px-4 py-1.5 text-sm font-semibold hover:bg-[#052c6d]">Share</button>
          <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center shadow overflow-hidden">
            <img
              src={user && user.profile_picture ? `http://localhost:8001${user.profile_picture}` : '/default-avatar.png'}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}