import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, ArrowRight, Trash2, Shield, UserPlus, X, 
  ChevronLeft, LayoutList, Calendar, Edit2, Check, AlertCircle, Search, UserCheck 
} from 'lucide-react';

import CreateTaskModal from './CreateTaskModal';

const TeamsView = ({ token, currentUser, onTaskClick }) => { // Προστέθηκε το onTaskClick
  const [viewState, setViewState] = useState('list'); // 'list' or 'detail'
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamTasks, setTeamTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempDesc, setTempDesc] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamLeader, setNewTeamLeader] = useState(''); 

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState(''); 
  const [availableUsers, setAvailableUsers] = useState([]); 
  const [isAddingMember, setIsAddingMember] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';
  const isLeader = currentUser?.username === selectedTeam?.leader_username;
  const canEdit = isLeader || isAdmin;

  // --- 1. FETCH TEAMS ---
  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8001/api/teams', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();
      setTeams(data);
    } catch (err) {
      console.error(err);
      setError('Could not load teams.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTeams(); }, []);

  // --- 2. FETCH TASKS ---
  const fetchTeamTasks = async (teamId) => {
    try {
      const response = await fetch(`http://localhost:8002/api/teams/${teamId}/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTeamTasks(data);
      }
    } catch (err) { console.error(err); }
  };

  // --- 3. FETCH ALL USERS ---
  const fetchAllUsers = async () => {
    try {
        const response = await fetch('http://localhost:8000/users', { 
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            setAvailableUsers(data);
        } else {
            setAvailableUsers([]);
        }
    } catch (err) {
        console.error("Error fetching users:", err);
    }
  };

  useEffect(() => {
      if (showAddMemberModal || (showCreateModal && isAdmin)) {
          fetchAllUsers();
          setUserSearchQuery(''); 
      }
      if (showCreateModal && !newTeamLeader) {
          setNewTeamLeader(currentUser.username);
      }
  }, [showAddMemberModal, showCreateModal]);



  const handleTeamClick = (team) => {
    setSelectedTeam(team);
    setTempName(team.name);
    setTempDesc(team.description);
    setViewState('detail');
    fetchTeamTasks(team._id);
  };

  // CREATE TEAM
  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return alert("Team name is required");
    
    try {
      const response = await fetch('http://localhost:8001/api/teams', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeamName, 
          description: newTeamDesc, 
          leader_username: isAdmin ? newTeamLeader : currentUser.username 
        })
      });
      if (response.ok) {
        setShowCreateModal(false);
        setNewTeamName(''); setNewTeamDesc(''); setNewTeamLeader('');
        fetchTeams();
      } else {
          alert("Failed to create team");
      }
    } catch (err) { alert("Error creating team"); }
  };

  // DELETE TEAM
  const handleDeleteTeam = async (e, teamId) => {
      e.stopPropagation(); 
      try {
          const response = await fetch(`http://localhost:8001/api/teams/${teamId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
              setTeams(teams.filter(t => t._id !== teamId));
          } else {
              alert("Failed to delete team.");
          }
      } catch (err) {
          alert("Error deleting team.");
      }
  };

  // UPDATE TEAM INFO
  const handleUpdateTeamInfo = async () => {
    if (tempName === selectedTeam.name && tempDesc === selectedTeam.description) {
        setIsEditingName(false); setIsEditingDesc(false);
        return;
    }
    try {
        const response = await fetch(`http://localhost:8001/api/teams/${selectedTeam._id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: tempName, description: tempDesc })
        });

        if (response.ok) {
            const newTeamData = { ...selectedTeam, name: tempName, description: tempDesc };
            setSelectedTeam(newTeamData);
            setTeams(teams.map(t => t._id === selectedTeam._id ? newTeamData : t));
        } else {
            alert("Failed to update team details.");
            setTempName(selectedTeam.name);
            setTempDesc(selectedTeam.description);
        }
    } catch (err) { console.error("Update failed", err); } 
    finally { setIsEditingName(false); setIsEditingDesc(false); }
  };

  // MEMBER MANAGEMENT
  const updateTeamMembers = async (teamId, updatedMemberList) => {
    try {
      const response = await fetch(`http://localhost:8001/api/teams/${teamId}/members`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: updatedMemberList })
      });

      if (response.ok) {
        const updatedTeam = { ...selectedTeam, members: updatedMemberList };
        setSelectedTeam(updatedTeam);
        setTeams(teams.map(t => t._id === teamId ? updatedTeam : t));
        return true;
      } 
      return false;
    } catch (err) { console.error(err); return false; }
  };

  const handleAddSpecificMember = async (usernameToAdd) => {
    setIsAddingMember(true);
    const currentMembers = selectedTeam.members || [];
    
    if (currentMembers.includes(usernameToAdd)) {
        alert("User is already a member!");
        setIsAddingMember(false);
        return;
    }

    const success = await updateTeamMembers(selectedTeam._id, [...currentMembers, usernameToAdd]);
    
    if (success) {
        setShowAddMemberModal(false);
    } else {
        alert(`Failed to add user "${usernameToAdd}".`);
    }
    setIsAddingMember(false);
  };

  const handleRemoveMember = (usernameToRemove) => {
    const currentMembers = selectedTeam.members || [];
    updateTeamMembers(selectedTeam._id, currentMembers.filter(m => m !== usernameToRemove));
  };

  const handleCreateTask = async (taskData) => {
      setIsCreatingTask(true);
      try {
          const payload = { ...taskData };
          if (payload.due_date) payload.due_date = new Date(payload.due_date).toISOString();

          const response = await fetch(`http://localhost:8002/api/teams/${selectedTeam._id}/tasks`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (response.ok) {
              const newTask = await response.json();
              setTeamTasks([newTask, ...teamTasks]); 
              setShowTaskModal(false);
          } else {
              const err = await response.json();
              alert(err.detail || "Failed to create task");
          }
      } catch (error) {
          console.error(error);
          alert("Error creating task");
      } finally {
          setIsCreatingTask(false);
      }
  };


  const filteredUsersForAdd = availableUsers.filter(u => 
      !selectedTeam?.members?.includes(u.username) && 
      u.username.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const filteredUsersForLeader = availableUsers.filter(u => 
      u.username.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  if (viewState === 'list') {
    return (
      <div className="h-full flex flex-col animate-fadeIn">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-4xl font-extrabold text-gray-800 tracking-tight">My Teams</h2>
            <p className="text-gray-500 mt-2 text-lg"></p>
          </div>
          {isAdmin && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-[#6dabe4] hover:bg-[#5a9bd4] text-white px-6 py-3 rounded-[20px] flex items-center gap-2 shadow-lg hover:shadow-xl transition-all font-bold transform hover:-translate-y-1"
            >
              <Plus size={24} /> Create Team
            </button>
          )}
        </div>

        {isLoading && <p className="text-gray-500 text-center py-10">Loading teams...</p>}
        {error && <p className="text-red-500 text-center">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-4">
          {teams.map((team) => (
            <div 
              key={team._id}
              onClick={() => handleTeamClick(team)}
              className="bg-white p-6 rounded-[30px] shadow-sm hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-[#6dabe4]/20 group relative"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-[#f8f9fd] rounded-2xl text-[#6dabe4] group-hover:bg-[#6dabe4] group-hover:text-white transition-colors duration-300">
                  <Users size={28} />
                </div>
                
                {isAdmin && (
                    <button 
                        onClick={(e) => handleDeleteTeam(e, team._id)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full"
                        title="Delete Team"
                    >
                        <Trash2 size={20} />
                    </button>
                )}
              </div>
              
              <div className="flex justify-between items-center mb-2">
                  <h3 className="text-2xl font-bold text-gray-800">{team.name}</h3>
                  <div className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600">
                    {team.members?.length || 0} Members
                  </div>
              </div>
              
              <p className="text-gray-500 text-sm line-clamp-2 h-10">{team.description}</p>
              
              <div className="mt-6 flex items-center gap-2 text-sm text-[#6dabe4] font-bold opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300">
                View Details <ArrowRight size={16} />
              </div>
            </div>
          ))}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-[30px] shadow-2xl w-full max-w-md animate-scaleIn relative flex flex-col max-h-[85vh]">
               <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24}/></button>
               
               <h3 className="text-2xl font-bold mb-6 text-gray-800">New Team</h3>
               
               <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                   <input type="text" placeholder="Team Name" className="w-full p-4 bg-[#f8f9fd] rounded-[20px] outline-none focus:ring-2 focus:ring-[#6dabe4] text-gray-700 font-medium" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
                   <textarea placeholder="Description" className="w-full p-4 bg-[#f8f9fd] rounded-[20px] outline-none focus:ring-2 focus:ring-[#6dabe4] h-24 resize-none text-gray-700" value={newTeamDesc} onChange={(e) => setNewTeamDesc(e.target.value)} />
                   
                   {isAdmin && (
                       <div className="mt-4">
                           <label className="text-sm font-bold text-gray-500 ml-2">Assign Leader</label>
                           <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-[15px] mb-3 mt-1 border border-blue-100">
                               <div className="w-8 h-8 rounded-full bg-[#6dabe4] text-white flex items-center justify-center font-bold">
                                   {newTeamLeader.charAt(0).toUpperCase()}
                               </div>
                               <span className="font-bold text-gray-700">{newTeamLeader}</span>
                           </div>
                           <div className="relative mb-2">
                               <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                               <input 
                                   type="text" placeholder="Search users..." 
                                   className="w-full pl-10 pr-4 py-2 bg-[#f8f9fd] rounded-[15px] text-sm outline-none"
                                   value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)}
                               />
                           </div>
                           <div className="h-40 overflow-y-auto custom-scrollbar border border-gray-100 rounded-[15px] p-1">
                               {filteredUsersForLeader.map(user => (
                                   <div key={user.username} onClick={() => setNewTeamLeader(user.username)} className={`flex items-center gap-3 p-2 rounded-[10px] cursor-pointer transition-colors ${newTeamLeader === user.username ? 'bg-blue-100' : 'hover:bg-gray-50'}`}>
                                       <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">{user.username.charAt(0).toUpperCase()}</div>
                                       <span className="text-sm text-gray-700 font-medium">{user.username}</span>
                                       {newTeamLeader === user.username && <Check size={16} className="ml-auto text-[#6dabe4]"/>}
                                   </div>
                               ))}
                           </div>
                       </div>
                   )}
               </div>
               <button onClick={handleCreateTeam} className="w-full bg-[#6dabe4] hover:bg-[#5a9bd4] text-white py-4 rounded-[20px] font-bold shadow-md transition-all mt-6">Create Team</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- DETAIL VIEW ---
  return (
    <div className="h-full flex flex-col animate-fadeIn">
       <div className="flex items-start gap-4 mb-6 shrink-0">
          <button onClick={() => setViewState('list')} className="mt-1 p-2 bg-white rounded-full hover:bg-gray-100 text-gray-600 shadow-sm transition-all">
             <ChevronLeft size={24} />
          </button>
          
          <div className="flex-1">
            <div className="flex items-center gap-3">
                {isEditingName && canEdit ? (
                    <div className="flex items-center gap-2 w-full max-w-md">
                        <input autoFocus type="text" className="text-4xl font-extrabold text-gray-800 bg-white border-b-2 border-[#6dabe4] outline-none w-full" value={tempName} onChange={(e) => setTempName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUpdateTeamInfo()} />
                        <button onClick={handleUpdateTeamInfo} className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200"><Check size={20}/></button>
                        <button onClick={() => {setIsEditingName(false); setTempName(selectedTeam.name);}} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"><X size={20}/></button>
                    </div>
                ) : (
                    <h2 className={`text-4xl font-extrabold text-gray-800 tracking-tight ${canEdit ? 'cursor-pointer hover:text-[#6dabe4] transition-colors flex items-center gap-2' : ''}`} onDoubleClick={() => canEdit && setIsEditingName(true)} title={canEdit ? "Double click to edit" : ""}>
                        {selectedTeam.name}
                        {canEdit && <Edit2 size={18} className="text-gray-300 opacity-50" />}
                    </h2>
                )}
            </div>
            <div className="flex items-center gap-2 text-gray-500 mt-2">
                <Shield size={16} className="text-[#6dabe4]"/> 
                <span className="text-sm font-medium">Leader: <span className="font-bold text-gray-800">{selectedTeam.leader_username}</span></span>
            </div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
           {/* LEFT COLUMN */}
           <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2 no-scrollbar">
               {/* Description */}
               <div className="bg-white p-6 rounded-[30px] shadow-sm relative group">
                   <h3 className="text-lg font-bold text-gray-800 mb-3 flex justify-between">
                       About
                       {canEdit && !isEditingDesc && <Edit2 size={16} className="text-gray-300 cursor-pointer hover:text-[#6dabe4]" onClick={() => setIsEditingDesc(true)}/>}
                   </h3>
                   {isEditingDesc && canEdit ? (
                       <div>
                           <textarea autoFocus className="w-full p-3 bg-[#f8f9fd] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#6dabe4] min-h-[100px] resize-none" value={tempDesc} onChange={(e) => setTempDesc(e.target.value)} />
                           <div className="flex gap-2 mt-2 justify-end">
                               <button onClick={() => {setIsEditingDesc(false); setTempDesc(selectedTeam.description);}} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                               <button onClick={handleUpdateTeamInfo} className="text-xs bg-[#6dabe4] text-white px-3 py-1 rounded-lg hover:bg-[#5a9bd4]">Save</button>
                           </div>
                       </div>
                   ) : (
                       <p className={`text-gray-500 text-sm leading-relaxed ${canEdit ? 'cursor-pointer hover:text-gray-700' : ''}`} onDoubleClick={() => canEdit && setIsEditingDesc(true)} title={canEdit ? "Double click to edit" : ""}>
                           {selectedTeam.description || "No description provided."}
                       </p>
                   )}
               </div>
               
               {/* Members */}
               <div className="bg-white rounded-[30px] shadow-sm p-6">
                   <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-800">Team Members</h3>
                        {isLeader && (
                            <button onClick={() => setShowAddMemberModal(true)} className="bg-[#6dabe4] hover:bg-[#5a9bd4] text-white p-2 rounded-xl transition-all shadow-md hover:shadow-lg" title="Add Member">
                                <Plus size={20}/>
                            </button>
                        )}
                   </div>
                   <div className="space-y-3">
                       {selectedTeam.members?.map((member, index) => (
                           <div key={index} className="flex items-center justify-between p-3 bg-[#f8f9fd] rounded-[20px] group hover:bg-blue-50 transition-colors">
                               <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#6dabe4] font-extrabold text-sm shadow-sm border border-gray-100">
                                       {member.charAt(0).toUpperCase()}
                                   </div>
                                   <span className="font-bold text-gray-700 text-sm">{member}</span>
                                   {member === selectedTeam.leader_username && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold shadow-sm">LEADER</span>}
                               </div>
                               {isLeader && member !== selectedTeam.leader_username && (
                                   <button onClick={() => handleRemoveMember(member)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"><Trash2 size={18} /></button>
                               )}
                           </div>
                       ))}
                   </div>
               </div>
           </div>

           {/* RIGHT COLUMN */}
           <div className="lg:col-span-2 bg-white rounded-[30px] shadow-sm p-8 flex flex-col h-full overflow-hidden">
               <div className="flex justify-between items-center mb-6 shrink-0">
                   <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                       <LayoutList className="text-[#6dabe4]"/> Team Tasks
                   </h3>
                   {/* --- ΝΕΟ ΚΟΥΜΠΙ: NEW TASK --- */}
                   {isLeader && (
                       <button 
                           onClick={() => setShowTaskModal(true)} 
                           className="bg-[#6dabe4] hover:bg-[#5a9bd4] text-white px-4 py-2 rounded-[15px] flex items-center gap-2 shadow-md text-sm font-bold transition-all"
                       >
                           <Plus size={18}/> New Task
                       </button>
                   )}
               </div>
               <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar">
                   {teamTasks.length > 0 ? (
                       teamTasks.map(task => (
                           <div 
                               key={task._id}
                               onClick={() => onTaskClick(task)} // --- ΝΕΟ: ΚΛΙΚ ΓΙΑ ΛΕΠΤΟΜΕΡΕΙΕΣ ---
                               className="p-5 border border-gray-100 rounded-[25px] hover:shadow-md bg-gray-50 hover:bg-white hover:border-blue-100 transition-all cursor-pointer flex justify-between items-center group"
                           >
                               <div>
                                   <h4 className="font-bold text-gray-800 text-md group-hover:text-[#6dabe4] transition-colors">{task.title}</h4>
                                   <div className="flex items-center gap-2 mt-2">
                                       <span className={`text-[10px] px-2 py-1 rounded-md border uppercase font-bold ${task.priority === 'HIGH' ? 'bg-red-50 text-red-600 border-red-100' : task.priority === 'MEDIUM' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{task.priority}</span>
                                       {task.due_date && <span className="text-[11px] text-gray-400 flex items-center bg-white px-2 py-1 rounded-md border border-gray-100"><Calendar size={12} className="mr-1"/>{new Date(task.due_date).toLocaleDateString()}</span>}
                                   </div>
                               </div>
                               <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">Assignee</span>
                                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-bold text-gray-600 border border-gray-200" title={task.assigned_to}>{task.assigned_to.charAt(0).toUpperCase()}</div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full mt-1 ${task.status === 'DONE' ? 'bg-emerald-100 text-emerald-700' : task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'}`}>{task.status.replace('_', ' ')}</span>
                               </div>
                           </div>
                       ))
                   ) : (
                       <div className="flex flex-col items-center justify-center h-full opacity-50">
                           <LayoutList size={48} className="text-gray-300 mb-4"/>
                           <p className="text-gray-400 font-medium">No tasks found for this team.</p>
                       </div>
                   )}
               </div>
           </div>
       </div>

       {/* ADD MEMBER MODAL */}
       {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white p-8 rounded-[30px] shadow-2xl w-full max-w-sm animate-scaleIn relative flex flex-col max-h-[80vh]">
                <button onClick={() => {setShowAddMemberModal(false); setUserSearchQuery('');}} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24}/></button>
                
                <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">Add Team Member</h3>
                    <p className="text-gray-500 text-sm mt-1">Select users to invite to {selectedTeam.name}.</p>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                    <input 
                        autoFocus type="text" placeholder="Search users..." 
                        className="w-full pl-12 pr-4 py-3 bg-[#f8f9fd] rounded-[20px] outline-none border-2 border-transparent focus:border-[#6dabe4] transition-all font-medium"
                        value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)}
                    />
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 min-h-[200px]">
                    {filteredUsersForAdd.length > 0 ? (
                        filteredUsersForAdd.map(user => (
                            <div key={user.username} className="flex items-center justify-between p-3 rounded-[15px] hover:bg-blue-50 transition-colors group cursor-pointer" onClick={() => handleAddSpecificMember(user.username)}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{user.username}</p>
                                        {user.email && <p className="text-xs text-gray-400">{user.email}</p>}
                                    </div>
                                </div>
                                <button disabled={isAddingMember} className="p-2 bg-white border border-gray-200 rounded-full text-[#6dabe4] group-hover:bg-[#6dabe4] group-hover:text-white transition-colors shadow-sm">
                                    <Plus size={16} />
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 opacity-50">
                            <Users size={40} className="mx-auto mb-2 text-gray-300"/>
                            <p className="text-sm text-gray-400">No users found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
       )}

       {/* --- ΝΕΟ: CREATE TASK MODAL --- */}
       <CreateTaskModal 
          isOpen={showTaskModal} 
          onClose={() => setShowTaskModal(false)} 
          teamMembers={selectedTeam?.members || []}
          onSubmit={handleCreateTask}
          isSubmitting={isCreatingTask}
       />

    </div>
  );
};

export default TeamsView;