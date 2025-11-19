import searchIcon from '../assets/images/search_icon.png'

export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative w-full">
      <input
        type="text"
        placeholder="Search..."
        value={value}
        onChange={onChange}
        className="w-full pl-4 pr-10 py-4 bg-white border border-gray-100 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
        style={{ height: '2rem' }}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
        <img src={searchIcon} alt="Search" className="h-5 w-5" />
      </span>
    </div>
  );
}