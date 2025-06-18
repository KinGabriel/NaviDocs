// when data is still loading
export default function Loader({ message = "Loading..." }) {
  return (
    <div className="flex justify-center items-center py-10 text-gray-500">
      <svg className="animate-spin h-7 w-7 mr-4 text-[#003DA5]" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      {message}
    </div>
  );
}
