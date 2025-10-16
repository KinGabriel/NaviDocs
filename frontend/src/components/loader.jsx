// when data is still loading

export default function Loader({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center text-gray-600 space-y-4 py-10">
      <div className="w-10 h-10 border-4 border-blue-300 border-t-[#003DA5] rounded-full animate-spin"></div>
      <p className="text-base text-md font-semibold mt-3">{message}</p>
    </div>
  );
}
