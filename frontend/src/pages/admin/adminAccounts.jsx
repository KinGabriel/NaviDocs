import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { 
  fetchUsersAccountsAPI,
  archiveUserAccountAPI,
  unarchiveUserAccountAPI 
} from "../../api/adminAPI";
import useUser from '../../hooks/useUser';
import Sidebar from '../../layout/sidebars/sidebar';
import Header from '../../layout/headers/header';
import SearchBar from '../../components/searchbar';
import Table from '../../components/table';
import Dropdown from '../../components/dropdowns/dropdown';
import usePagination from '../../hooks/usePagination';
import Loader from '../../components/loader';

export default function AdminAccounts() {
  const navigate = useNavigate();
  const user = useUser();

  const [users, setUsers] = useState([]);
  const usersPerPage = 8;

  const [roleFilter, setRoleFilter] = useState("All Roles");
  const sortOptions = ["Sort By", "Name (A-Z)", "Name (Z-A)"];
  const [sortBy, setSortBy] = useState(sortOptions[0]);
  const [search, setSearch] = useState(""); 
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await fetchUsersAccountsAPI();
        setUsers(data);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  
  // --- Archive modal state ---
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [targetUser, setTargetUser] = useState(null); // the row being archived

  const openArchiveModal = (row) => {
    setTargetUser(row);
    setArchiveOpen(true);
  };
  const closeArchiveModal = () => {
    if (archiving) return;
    setArchiveOpen(false);
    setTargetUser(null);
  };
  const confirmArchive = async () => {
    if (!targetUser?._id) return;
    try {
      setArchiving(true);
      await archiveUserAccountAPI(targetUser._id);
      setUsers(prev => prev.map(u => u._id === targetUser._id ? { ...u, is_deleted: true } : u));
      toast.success("User archived successfully");
      setArchiving(false);
      closeArchiveModal();
    } catch (err) {
      toast.error(err.message || "Failed to archive user.");
      setArchiving(false);
    }
  };

  // --- Unarchive modal state ---
  const [unarchiveOpen, setUnarchiveOpen] = useState(false);
  const [unarchiving, setUnarchiving] = useState(false);
  const [targetUserUnarchive, setTargetUserUnarchive] = useState(null);

  const openUnarchiveModal = (row) => {
    setTargetUserUnarchive(row);
    setUnarchiveOpen(true);
  };
  const closeUnarchiveModal = () => {
    if (unarchiving) return;
    setUnarchiveOpen(false);
    setTargetUserUnarchive(null);
  };
  const confirmUnarchive = async () => {
    if (!targetUserUnarchive?._id) return;
    try {
      setUnarchiving(true);
      await unarchiveUserAccountAPI(targetUserUnarchive._id);
      setUsers(prev => prev.map(u => u._id === targetUserUnarchive._id ? { ...u, is_deleted: false } : u));
      toast.success("User unarchived successfully");
      // clear the unarchiving flag first so the modal close can proceed
      setUnarchiving(false);
      closeUnarchiveModal();
    } catch (err) {
      toast.error(err.message || "Failed to unarchive user.");
      setUnarchiving(false);
    }
  };
  const columns = [
  {
    key: "name",
    label: "Name",
    render: (row) => `${row.firstname} ${row.lastname}`,
  },
  { key: "email", label: "School Email" },
  {
    key: "department",
    label: "Department",
    render: (row) => row.role?.department || "N/A",
  },
  {
    key: "school",
    label: "School",
    render: (row) => row.role?.school || "N/A",
  },
  {
    key: "role",
    label: "Role",
    render: (row) => row.role?.name || "",
  },
  {
    key: "actions",
    label: "Actions",
    render: (row) => (
      <div className="flex gap-2">
        <button
          className="bg-blue-100 text-blue-700 px-4 py-1 rounded text-xs font-semibold hover:bg-blue-200"
          onClick={() => navigate(`/admin/edit-user/${row._id}`)}
        >
          Edit
        </button>
        {row.is_deleted ? (
          <button
            className="bg-green-100 text-green-700 px-4 py-1 rounded text-xs font-semibold hover:bg-green-200"
            onClick={() => openUnarchiveModal(row)}
          >
            Unarchive
          </button>
        ) : (
          <button
            className="bg-red-100 text-red-500 px-4 py-1 rounded text-xs font-semibold hover:bg-red-200"
            onClick={() => openArchiveModal(row)}
          >
            Archive
          </button>
        )}
      </div>
    ),
  },
];
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await fetchUsersAccountsAPI();
        setUsers(data);
      } catch (err) {
        setUsers([]);
        setAccountsInfo(null)
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // roles for the filter dropdown
  const roles = ["All Roles", ...Array.from(new Set(users.map(u => u.role?.name).filter(Boolean)))];

  // filter users by selected role
  const filteredUsers = roleFilter === "All Roles"
    ? users
    : users.filter(u => u.role?.name === roleFilter);

  // filter users by search query
  const searchedUsers = search
    ? filteredUsers.filter(u =>
        (`${u.firstname} ${u.lastname}`.toLowerCase().includes(search.toLowerCase()) ||
         u.email?.toLowerCase().includes(search.toLowerCase()) ||
         u.role?.school?.toLowerCase().includes(search.toLowerCase()) ||
         u.role?.department?.toLowerCase().includes(search.toLowerCase()) ||
         u.role?.name?.toLowerCase().includes(search.toLowerCase()))
      )
    : filteredUsers;

  // sort users by name
  const sortedUsers = sortBy === "Sort By"
    ? searchedUsers
    : [...searchedUsers].sort((a, b) => {
        const nameA = `${a.firstname} ${a.lastname}`.toLowerCase();
        const nameB = `${b.firstname} ${b.lastname}`.toLowerCase();
        if (sortBy === "Name (A-Z)") return nameA.localeCompare(nameB);
        if (sortBy === "Name (Z-A)") return nameB.localeCompare(nameA);
        return 0;
      });

  //handle pagination
  const totalPages = Math.ceil(sortedUsers.length / usersPerPage);
  const {
    currentPage,
    setCurrentPage,
    handlePrev,
    handleNext,
    handlePage,
    getPageNumbers,
  } = usePagination(totalPages);

  const startIdx = (currentPage - 1) * usersPerPage;
  const endIdx = startIdx + usersPerPage;
  const currentUsers = sortedUsers.slice(startIdx, endIdx);

     // loading animation
  if (loading) {
   return (
     <div className="min-h-screen bg-gray-200 flex flex-col">
       <Header user={user} />
       <div className="flex flex-1">
         <Sidebar user={user} />
         <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
           <div className="flex-1 flex items-center justify-center">
             <Loader message="Loading..." />
           </div>
         </div>
       </div>
     </div>
   );
 }

    // error state
    if (!users) {
    return (
      <div className="min-h-screen bg-gray-200 flex flex-col">
        <Header user={user} />
        <div className="flex flex-1">
          <Sidebar user={user} />
          <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <h2 className="text-xl font-semibold text-red-600 mb-2">Unable to load dashboard</h2>
                <p className="text-gray-500">Please check your connection or try again later.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="User Accounts" />
       <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <div className="flex-1 p-10">
            <h2 className="text-3xl font-bold text-black-800 tracking-widest uppercase mb-2">NAVIDOCS USERS</h2>
            <div className="w-24 h-1 bg-yellow-400 mb-6 rounded" />

            {/* Filter, Sort, Search */}
            <div className="flex items-center gap-2 mb-4">
              {/* Filter by Role */}
              <Dropdown
                value={roleFilter}
                onChange={value => { setRoleFilter(value); setCurrentPage(1); }}
                options={roles}
                width='w-52'
              />
              {/* Sort by Name */}
              <Dropdown
                value={sortBy}
                onChange={setSortBy}
                options={sortOptions}
                width='w-36'
              />
              <div className="flex-1 flex justify-end">
                <div className="w-64">
                  <SearchBar value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded shadow p-0 overflow-x-auto">
              <Table columns={columns} data={currentUsers} />
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center mt-6 gap-2">
              <button
                onClick={handlePrev}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Prev
              </button>
              {getPageNumbers().map((num, idx) =>
                num === "..." ? (
                  <span key={idx} className="px-2 text-gray-400">...</span>
                ) : (
                  <button
                    key={num}
                    onClick={() => setCurrentPage(num)}
                    className={`px-3 py-1 rounded border ${
                      currentPage === num
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {num}
                  </button>
                )
              )}
              <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ARCHIVE CONFIRMATION MODAL */}
      {archiveOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeArchiveModal} />
          <div className="relative w-[520px] max-w-[92vw] rounded-2xl bg-white p-6 shadow-2xl">
            {/* Close (X) */}
            <button
              onClick={closeArchiveModal}
              className="absolute right-3 top-3 rounded-full p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Icon */}
            <div className="mx-auto mb-4 mt-2 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-red-500">
                <path d="M9 3h6m-9 4h12m-1 0-.7 11.2a2 2 0 0 1-2 1.8H8.7a2 2 0 0 1-2-1.8L6 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 10v6M14 10v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
            </div>

            {/* Message */}
            <p className="text-center text-lg font-semibold text-gray-800">
              Are you sure you want to archive
              <br />
              <span className="font-bold">
                {`${targetUser?.firstname ?? ""} ${targetUser?.lastname ?? ""}`.trim()}
              </span>
              ?
            </p>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={closeArchiveModal}
                disabled={archiving}
                className="rounded-md bg-gray-200 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={confirmArchive}
                disabled={archiving}
                className="rounded-md bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {archiving ? "Archiving…" : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* END ARCHIVE MODAL */}

      {/* UNARCHIVE CONFIRMATION MODAL */}
      {unarchiveOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeUnarchiveModal} />
          <div className="relative w-[520px] max-w-[92vw] rounded-2xl bg-white p-6 shadow-2xl">
            {/* Close (X) */}
            <button
              onClick={closeUnarchiveModal}
              className="absolute right-3 top-3 rounded-full p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Icon (green accent) */}
            <div className="mx-auto mb-4 mt-2 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-green-600">
                <path d="M12 3v18m9-9H3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>

            {/* Message */}
            <p className="text-center text-lg font-semibold text-gray-800">
              Are you sure you want to unarchive
              <br />
              <span className="font-bold">
                {`${targetUserUnarchive?.firstname ?? ""} ${targetUserUnarchive?.lastname ?? ""}`.trim()}
              </span>
              ?
            </p>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={closeUnarchiveModal}
                disabled={unarchiving}
                className="rounded-md bg-gray-200 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnarchive}
                disabled={unarchiving}
                className="rounded-md bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                {unarchiving ? "Unarchiving…" : "Unarchive"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* END UNARCHIVE MODAL */}
     </div>
  );
}
