import React, { useEffect, useMemo, useState, useRef } from "react";
import { shareDocumentAPI } from '../../api/documentsAPI';
import { searchUsersByEmailAPI, getUserIdByEmailAPI, getUsersInfoByIdsAPI } from '../../api/userAPI';
import Loader from "../../components/loader";
import { toast } from 'react-hot-toast';

export default function ShareDocumentModal({
  open,
  onClose,
  template,
  selectedIds,
  setSelectedIds,
  onShare,
  submitting = false,
}) {
  if (!open) return null;

  // State
  const [memberToAdd, setMemberToAdd] = useState("");
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [knownUsers, setKnownUsers] = useState({});
  const [selectedAccess, setSelectedAccess] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceRef = useRef();

  const addMember = async (val) => {
    if (!val) return;

    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    const key = String(val);

    // Check if already selected
    if (selectedIds.includes(key)) {
      toast.error('User already added');
      return;
    }

    let userId = key;
    let userInfo = knownUsers[key];

    // If it's an email and we don't have the user info, fetch it
    if (emailRegex.test(key) && !userInfo) {
      try {
        userId = await getUserIdByEmailAPI(key);
        if (!userId) {
          toast.error('No user found with this email.');
          return;
        }

        // Fetch full user info
        try {
          const userInfoArray = await getUsersInfoByIdsAPI([userId]);
          if (Array.isArray(userInfoArray) && userInfoArray.length > 0) {
            const u = userInfoArray[0];
            const id = String(u.userId || u.id || u._id);
            const email = u.email || key;
            const name = u.name || `${u.firstname || ''} ${u.lastname || ''}`.trim() || email;
            const role = u.role || u.user_role || u.position || "User";

            userInfo = { id, email, name, role };
            setKnownUsers((prev) => ({
              ...prev,
              [id]: userInfo,
              [email]: userInfo,
            }));
          }

        } catch (infoErr) {
          console.error('Error fetching user info:', infoErr);
        }
      } catch (err) {
        toast.error('Error checking user existence.');
        return;
      }
    }

    const useId = String(userId);
    setSelectedIds((prev) => prev.includes(useId) ? prev : [...prev, useId]);
    setSelectedAccess((prev) => ({ ...prev, [useId]: prev[useId] || 'viewer' }));
    setMemberToAdd("");
    setSuggestions([]);
  };

  // Debounced email suggestion fetcher
  const fetchEmailSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const users = await searchUsersByEmailAPI(query);
      const list = Array.isArray(users)
        ? users.map(u => {
          const id = u.userId || u.id || u._id || u.email;
          const email = u.email || '';
          const name = u.name || u.fullname || (`${u.firstname || ''} ${u.lastname || ''}`).trim() || email;
          const role = u.role || u.user_role || u.position || "User";
          return { id, email, name, role };
        }) : [];

      // Update knownUsers map
      setKnownUsers((prev) => {
        const copy = { ...prev };
        users.forEach((u) => {
          const id = String(u.userId || u.id || u._id);
          const email = u.email || '';
          const name = u.name || `${u.firstname || ''} ${u.lastname || ''}`.trim() || email || id;
          const role = u.role || 'User';
          const obj = { id, email, name, role };
          copy[id] = obj;
          if (email) copy[String(email)] = obj;
          if (name) copy[String(name).toLowerCase()] = obj;
        });
        return copy;
      });

      setSuggestions(list);
    } catch (err) {
      console.error('Search error:', err);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Initialize debounce function 
  useEffect(() => {
    const createDebounce = (fn, delay) => {
      let timer;
      return (...args) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
      };
    };
    debounceRef.current = createDebounce(fetchEmailSuggestions, 400);
  }, []);

  // Function to load all users
  const loadAllUsers = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await searchUsersByEmailAPI("");
      const list = Array.isArray(res) ? res.map(u => {
        const id = u.userId || u.id || u._id || u.email;
        const email = u.email || '';
        const name = u.name || u.fullname || u.fullName || (`${u.firstname || ''} ${u.lastname || ''}`).trim() || email;
        const role = u.role || 'User';
        return { id, email, name, role };
      }) : [];

      setKnownUsers((prev) => {
        const copy = { ...prev };
        users.forEach((u) => {
          const id = String(u.userId || u.id || u._id);
          const email = u.email || '';
          const name = u.name || `${u.firstname || ''} ${u.lastname || ''}`.trim() || email || id;
          const role = u.role || 'User';
          const obj = { id, email, name, role };
          copy[id] = obj;
          if (email) copy[String(email)] = obj;
          if (name) copy[String(name).toLowerCase()] = obj;
        });
        return copy;
      });
      setSuggestions(list);
    } catch (err) {
      toast.error('Failed to load users');
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Build list of selected members by matching id to name from members (API)
  const selectedMembers = useMemo(() => {
    return selectedIds.map((sid) => {
      const sidStr = String(sid);
      // prefer knownUsers map
      if (knownUsers[sidStr]) { return { id: sidStr, name: knownUsers[sidStr].name, email: knownUsers[sidStr].email, role: knownUsers[sidStr].role }; }
      // try to find in members fetched earlier
      const found = members.find((c) => String(c.id) === sidStr);
      if (found) {
        return {
          id: sidStr,
          name: found.name || found.fullName || found.displayName || sidStr,
          email: found.email || '',
          role: found.role || ''
        };
      }
      if (Array.isArray(template?.assigned) && Array.isArray(template?.assignedNames)) {
        const idx = template.assigned.indexOf(sid);
        if (idx !== -1) return { id: sidStr, name: template.assignedNames[idx] || sidStr, email: '', role: '' };
      }
      // fallback to raw id/email
      return { id: sidStr, name: sidStr, email: '', role: '' };
    });
  }, [selectedIds, members, knownUsers, template]);

  // Resolve names and emails for all selectedIds in one batch request (fetch on modal open / when selectedIds change)
  useEffect(() => {
    let cancelled = false;
    // Build a candidate list: selectedIds + owner + template.assigned entries
    const sIds = Array.isArray(selectedIds) ? selectedIds.map((s) => String(s)) : [];
    const ownerId = template?.created_by ? String(template.created_by) : null;
    const assignedIds = Array.isArray(template?.assigned) ? template.assigned.map((a) => {
      if (!a) return null;
      if (typeof a === 'string' || typeof a === 'number') return String(a);
      // object-shaped assigned entry
      return String(a.userId || a.id || a._id || a.user || '');
    }).filter(Boolean) : [];

    const all = Array.from(new Set([...(sIds || []), ...(assignedIds || []), ...(ownerId ? [ownerId] : [])]));
    if (!all.length) return;

    (async () => {
      try {
        const users = await getUsersInfoByIdsAPI(all);
        if (cancelled) return;
        setKnownUsers((prev) => {
          const copy = { ...prev };
          users.forEach((u) => {
            const id = String(u.userId || u.id || u._id);
            const email = u.email || '';
            const name = u.name || `${u.firstname || ''} ${u.lastname || ''}`.trim() || email || id;
            const role = u.role || 'User';
            const obj = { id, email, name, role };
            copy[id] = obj;
            if (email) copy[String(email)] = obj;
            if (name) copy[String(name).toLowerCase()] = obj;
          });
          return copy;
        });
      } catch (err) {
        console.error('Error fetching user info:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedIds, template]);

  // initialize selectedAccess from template.assigned if available
  useEffect(() => {
    if (!template) return;
    const map = {};
    if (Array.isArray(template.assigned)) {
      template.assigned.forEach((a) => {
        if (!a) return;
        // support legacy string entries and new object entries
        if (typeof a === 'string' || typeof a === 'number') {
          map[String(a)] = map[String(a)] || 'viewer';
        } else if (typeof a === 'object') {
          const uid = a.userId || a.id || a._id || a.user;
          if (uid) map[String(uid)] = a.access === 'editor' ? 'editor' : 'viewer';
        }
      });
    }
    // merge with any existing selectedIds
    setSelectedAccess((prev) => ({ ...map, ...prev }));
  }, [template]);

  // Owner extraction
  const owner = useMemo(() => {
    if (!template?.created_by) return null;
    const id = String(template.created_by);
    let name = template.createdByName || "";
    let email = '';
    let role = '';
    if (!name && knownUsers[id]) {
      name = knownUsers[id].name || '';
      email = knownUsers[id].email || '';
      role = knownUsers[id].role || '';
    }
    if (!name && Array.isArray(members) && members.length) {
      const found = members.find((m) => String(m.id) === String(id));
      if (found) {
        name = found.name || found.fullName || found.displayName || '';
        email = found.email || '';
        role = found.role || '';
      }
    }
    if (!name && Array.isArray(template.assigned) && Array.isArray(template.assignedNames)) {
      const idx = template.assigned.indexOf(id);
      if (idx !== -1) name = template.assignedNames[idx];
    }
    if (!name) name = id;
    return { id, name, email, role };
  }, [template, members, knownUsers]);

  // Submit
  const [localLoading, setLocalLoading] = useState(false);

  const handleDone = async () => {
    // Build normalized assignees: [{ userId, access }]
    const assigneesPayload = (Array.isArray(selectedIds) ? selectedIds : []).map((sid) => ({
      userId: String(sid),
      access: (selectedAccess[sid] === 'editor' ? 'editor' : 'viewer')
    }));

    // Prefer parent-provided handler
    if (onShare) {
      setLocalLoading(true);
      try {
        await onShare({ assignees: assigneesPayload });
      } finally {
        setLocalLoading(false);
      }
      return;
    }

    const docId = template?._id || template?.id;
    if (!docId) {
      console.error('shareDocumentModal: document id not found on template');
      return;
    }

    try {
      setLocalLoading(true);
      await shareDocumentAPI(docId, assigneesPayload);
      toast.success('Document access updated');
      if (onClose) onClose();
    } catch (err) {
      console.error('shareDocumentModal share error', err);
      toast.error('Failed to update document access');
    } finally {
      setLocalLoading(false);
    }
  };

  const hasSelectedMembers = selectedMembers.filter((c) => !owner || c.id !== owner.id).length > 0;
  const isSharing = submitting || localLoading;

  // Filter out already selected members from suggestions
  const filteredSuggestions = suggestions.filter(s =>
    !selectedIds.includes(s.id) && (!owner || s.id !== owner.id)
  );

  // Handle Enter key to add email directly
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && memberToAdd) {
      e.preventDefault();
      addMember(memberToAdd);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-[2px] transition-opacity"
        onClick={() => {
          setSuggestions([]);
          onClose();
        }}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">
                Share Document
              </h2>
              <p className="text-sm text-blue-100">
                "{template?.title || "Untitled Document"}"
              </p>
            </div>
            <button
              onClick={() => {
                setSuggestions([]);
                onClose();
              }}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors text-white"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
          {/* Owner Section */}
          {owner && (
            <div className="px-6 pt-6 pb-4">
              <div className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Document Owner
              </div>
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {owner.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{owner.name}</div>
                  {owner.email && <div className="text-xs text-gray-600 truncate mt-1">{owner.email}</div>}
                  {owner.role && (
                    <div className="text-xs text-blue-700">
                      {owner.role}
                    </div>
                  )}
                  <div className="inline-block px-2 py-0.5 text-xs text-blue-700 bg-blue-100 rounded-md mt-0.5">Full access</div>
                </div>
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Add member section */}
          <div className="px-6 py-4 bg-gray-50 border-y border-gray-200">
            <div className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Add Members
            </div>
            {membersLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader message="Loading users..." />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={memberToAdd}
                        onChange={(e) => {
                          setMemberToAdd(e.target.value);
                          debounceRef.current(e.target.value);
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter email address..."
                        className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                    <button
                      onClick={() => addMember(memberToAdd)}
                      disabled={!memberToAdd}
                      className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                      Add
                    </button>
                  </div>

                  {/* Suggestions dropdown */}
                  {loadingSuggestions && memberToAdd.length >= 2 && (
                    <div className="absolute left-0 right-0 mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-3 z-10">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        Searching...
                      </div>
                    </div>
                  )}

                  {!loadingSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-64 overflow-auto z-10">
                      {filteredSuggestions.map((s) => (
                        <button
                          key={s.id || s.email}
                          type="button"
                          onClick={() => addMember(s.id || s.email)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-0 transition-colors flex items-center gap-3"
                        >
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold shadow-md">
                            {(s.name || s.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{s.name || s.email}</div>
                            <div className="text-sm text-gray-500 truncate">{s.email}</div>
                            {s.role && (
                              <div className="text-xs text-blue-600 mt-0.5 font-medium">
                                {s.role}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {!loadingSuggestions && memberToAdd.length >= 2 && filteredSuggestions.length === 0 && (
                    <div className="absolute left-0 right-0 mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-4 z-10">
                      <div className="text-center text-sm text-gray-500">
                        No users found. Press Enter or click Add to invite by email.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Members with access */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Shared With
              </h3>
              {hasSelectedMembers && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  {selectedMembers.filter((c) => !owner || c.id !== owner.id).length} member{selectedMembers.filter((c) => !owner || c.id !== owner.id).length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="rounded-xl border-2 border-gray-200 overflow-hidden bg-white">
              {!hasSelectedMembers ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium mb-1">No members selected</p>
                  <p className="text-sm text-gray-400">Enter an email address to share access</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <ul className="divide-y divide-gray-200">
                    {selectedMembers.filter((c) => !owner || c.id !== owner.id).map((c) => (
                      <li key={c.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold shadow-md">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 truncate">{c.name}</div>
                            {c.email && <div className="text-xs text-gray-500 truncate mt-0.5">{c.email}</div>}
                            {(c.role || knownUsers[c.id]?.role) && (
                              <div className="text-xs text-blue-700 ">
                                {c.role || knownUsers[c.id]?.role}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              {selectedAccess[c.id] === 'viewer' ? 'Can view only' : 'Can view and edit'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <select
                              value={selectedAccess[c.id] || 'viewer'}
                              onChange={(e) => setSelectedAccess((prev) => ({ ...prev, [c.id]: e.target.value }))}
                              className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedIds((prev) => prev.filter((x) => x !== c.id));
                              setSelectedAccess((prev) => { const copy = { ...prev }; delete copy[c.id]; return copy; });
                              toast('Removed member');
                            }}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Restricted access</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="px-5 py-2.5 rounded-lg border-2 border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={onClose}
                disabled={isSharing}
              >
                Cancel
              </button>
              <button
                onClick={handleDone}
                disabled={isSharing || !Array.isArray(selectedIds) || selectedIds.length === 0}
                className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center gap-2 min-w-[100px] justify-center"
              >
                {isSharing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sharing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span>Share</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}