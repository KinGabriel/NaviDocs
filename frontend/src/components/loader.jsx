// when data is still loading

export default function Loader({ message = "" }) {
  return (
    <div className="flex-1 flex justify-center items-center min-h-[60vh]">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 border-4 border-blue-300 border-t-[#003DA5] rounded-full animate-spin"></div>
        {message && <p className="text-base font-medium mt-4 text-center">{message}</p>}
      </div>
    </div>
  );
}