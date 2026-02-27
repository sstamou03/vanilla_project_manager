import React, { useState, useEffect } from 'react';
import { Trash2, Shield, UserCheck, ChevronLeft, Mail, User } from 'lucide-react';

const AdminView = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleUserStatus = async (e, username, currentStatus) => {
    if (e) e.stopPropagation();

    const originalUsers = [...users];

    setUsers(prev =>
      prev.map(u =>
        u.username === username ? { ...u, is_active: !currentStatus } : u
      )
    );

    if (selectedUser && selectedUser.username === username) {
      setSelectedUser(prev => ({ ...prev, is_active: !currentStatus }));
    }

    try {
      const endpoint = currentStatus
        ? `http://localhost:8000/admin/users/${username}/deactivate`
        : `http://localhost:8000/admin/users/${username}/activate`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed');

    } catch (err) {
      setUsers(originalUsers);
      if (selectedUser) setSelectedUser(prev => ({ ...prev, is_active: currentStatus }));
      alert('Failed to update user status');
    }
  };

  // --- CHANGE ROLE ---
  const handleChangeRole = async (e, username, newRole) => {
    if (e) e.stopPropagation();

    const originalUsers = [...users];
    setUsers(prev => prev.map(u => u.username === username ? { ...u, role: newRole } : u));
    if (selectedUser && selectedUser.username === username) setSelectedUser(prev => ({ ...prev, role: newRole }));

    try {
      const res = await fetch(`http://localhost:8000/admin/users/${username}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error();
    } catch (err) {
      setUsers(originalUsers);
      alert('Failed to change role');
    }
  };

  const handleDeleteUser = async (e, username) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete user ${username}?`)) return;

    const originalUsers = [...users];
    setUsers(prev => prev.filter(u => u.username !== username));
    if (selectedUser && selectedUser.username === username) setSelectedUser(null);

    try {
      const res = await fetch(`http://localhost:8000/admin/users/${username}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        setUsers(originalUsers);
        alert('Failed to delete user');
      }
    } catch (err) {
      setUsers(originalUsers);
      alert('Error deleting user');
    }
  };

  if (selectedUser) {
    return (
      <div className="h-full flex flex-col animate-fadeIn">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setSelectedUser(null)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl font-extrabold text-gray-800">User Details</h2>
            <p className="text-gray-500">Manage {selectedUser.username}'s profile</p>
          </div>
        </div>

        <div className="bg-white rounded-[30px] shadow-sm border border-gray-100 p-8 max-w-3xl">
          <div className="flex items-start justify-between border-b border-gray-100 pb-8 mb-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-[#6dabe4] font-bold text-4xl border-4 border-white shadow-sm">
                {selectedUser.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{selectedUser.first_name} {selectedUser.last_name}</h3>
                <p className="text-gray-500 font-medium flex items-center gap-2 mt-1"><Mail size={16}/> {selectedUser.email}</p>
                <p className="text-gray-400 text-sm flex items-center gap-2 mt-1"><User size={16}/> @{selectedUser.username}</p>
              </div>
            </div>

            {selectedUser.is_active ? (
              <button onClick={(e) => handleToggleUserStatus(e, selectedUser.username, true)} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-red-200 transition">
                <Shield size={18}/> Deactivate Account
              </button>
            ) : (
              <button onClick={(e) => handleToggleUserStatus(e, selectedUser.username, false)} className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-green-200 transition">
                <UserCheck size={18}/> Activate Account
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2"></label>
              <select value={selectedUser.role}
  onChange={(e) => handleChangeRole(null, selectedUser.username, e.target.value)}
  className="w-full p-4 bg-[#f8f9fd] rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#6dabe4]"
>
  <option value="MEMBER">Member</option>
  <option value="TEAM_LEADER">Team Leader</option>
  <option value="ADMIN">Administrator</option>
</select>
            </div>

            <div>
              <label className="block text-xs font-bold text-red-400 uppercase mb-2">         </label>
              <button onClick={(e) => handleDeleteUser(e, selectedUser.username)} className="w-full p-4 border-2 border-red-50 text-red-500 rounded-xl font-bold hover:bg-red-50 transition flex items-center justify-center gap-2">
                <Trash2 size={20}/> Delete User Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-4xl font-extrabold text-gray-800">User Management</h2>
          <p className="text-gray-500 mt-1 text-lg"></p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm text-sm font-bold text-gray-600">Total Users: {users.length}</div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 bg-white rounded-[30px] shadow-sm border border-gray-100 p-6">
        {isLoading ? <p className="text-center text-gray-400 mt-10">Loading users...</p> : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold text-gray-400 uppercase border-b">
                <th className="py-3 pl-4">User</th>
                <th className="py-3">Email</th>
                <th className="py-3">Role</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.username} onClick={() => setSelectedUser(user)} className="border-b hover:bg-blue-50 transition cursor-pointer">
                  <td className="py-4 pl-4 font-bold">{user.username}</td>
                  <td className="py-4 text-sm text-gray-500">{user.email}</td>
                  <td className="py-4" onClick={e => e.stopPropagation()}>
  <select
    value={user.role}
    onChange={(e) => handleChangeRole(e, user.username, e.target.value)}
    className={`text-xs font-bold rounded px-2 py-1 outline-none border border-transparent focus:border-[#6dabe4] cursor-pointer ${
      user.role === 'ADMIN'
        ? 'bg-purple-100 text-purple-700'
        : user.role === 'TEAM_LEADER'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-gray-100 text-gray-600'
    }`}
  >
    <option value="MEMBER">MEMBER</option>
    <option value="TEAM_LEADER">LEADER</option>
    <option value="ADMIN">ADMIN</option>
  </select>
</td>
                  <td className="py-4">
                    <button onClick={(e) => handleToggleUserStatus(e, user.username, user.is_active)} className={`text-xs px-3 py-1 rounded-full font-bold ${user.is_active ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {user.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
                    </button>
                  </td>
                  <td className="py-4 text-right pr-4">
                    <button onClick={(e) => handleDeleteUser(e, user.username)} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminView;
