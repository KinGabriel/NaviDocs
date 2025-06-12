import Sidebar from '../layout/sidebar';
import Header from '../layout/header';

export default function AdminAccounts() {
  const user = JSON.parse(localStorage.getItem('user'));
  return (
    <div className="min-h-screen bg-gray-200">
          <Header user={user} />
            <Sidebar user={user} />
        </div>
  );
}