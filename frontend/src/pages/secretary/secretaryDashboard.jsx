import Header from '../../layout/header'; 
import Sidebar from '../../layout/sidebar'; 
import useUser from '../../hooks/useUser';

[/* STILL TO BE FIXED */]
export default function SecretaryDashboard() {
const user = useUser();

  return (
       <div className="min-h-screen bg-gray-200 flex flex-col">
         <Header user={user} />
         <div className="flex flex-1">
           <Sidebar user={user} active="User Accounts" />
        </div>
        </div>
  );
}