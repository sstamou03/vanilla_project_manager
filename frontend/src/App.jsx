import { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaLock, FaIdCard, FaCog, FaTimes} from 'react-icons/fa'; 
import { 
  LayoutDashboard, Users, ListTodo, LogOut, Bell, Clock, CheckCircle, 
  ChevronDown, ChevronUp, PieChart, ClipboardList, BarChart as ChartIcon, X, ShieldAlert
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import signinImage from './assets/signin-image.jpg'; 
import signupImage from './assets/signup-image.jpg';
import dashboardImage from './assets/dashboard-image.jpg'; 

import TeamsView from './TeamsView';
import TaskDetailsView from './TaskDetailsView';
import MyTasksView from './MyTasksView';
import AdminView from './AdminView';



const TaskCard = ({ task, onClick }) => {
  return (
    <div 
      onClick={() => onClick(task)} 
      className="p-5 border border-gray-100 rounded-[20px] hover:shadow-md transition hover:border-blue-100 bg-gray-50 cursor-pointer group w-full"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-800 text-sm truncate group-hover:text-[#6dabe4] transition-colors">
            {task.title}
          </h4>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
              task.priority === 'HIGH' ? 'bg-red-50 text-red-600 border-red-100' : 
              task.priority === 'MEDIUM' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' : 'bg-green-50 text-green-600 border-green-100'
            }`}>
              {task.priority}
            </span>
            {task.due_date && (
              <span className="text-[10px] text-gray-400 flex items-center whitespace-nowrap">
                 <Clock size={12} className="mr-1"/> {new Date(task.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase whitespace-nowrap border ${
            task.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
            task.status === 'TODO' ? 'bg-gray-50 text-gray-500 border-gray-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
          }`}>
            {task.status.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: DASHBOARD ---
const Dashboard = ({ token, onLogout, showMessage }) => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [userData, setUserData] = useState({ username: "User", role: "" });
  const [stats, setStats] = useState({ teamsCount: 0, tasksTodo: 0, tasksInProgress: 0, tasksDone: 0, totalTasks: 0 });
  const [myTeams, setMyTeams] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', password: '' });

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Selected Task
  const [selectedTask, setSelectedTask] = useState(null);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };

        const userRes = await fetch('http://localhost:8000/users/me', { headers });

        if (userRes.ok) {
          const user = await userRes.json();
          setUserData({ username: user.username, role: user.role });
          setEditForm({ first_name: user.first_name, last_name: user.last_name, password: '' });

          if (user.role === 'ADMIN' && currentView === 'dashboard') {
          setCurrentView('admin');}
        }

 

        // Teams
        const teamsRes = await fetch('http://localhost:8001/api/teams', { headers });
        if (teamsRes.ok) {
          const teams = await teamsRes.json();
          setMyTeams(teams);
          setStats(prev => ({ ...prev, teamsCount: teams.length }));
        }

        // Tasks
        const tasksRes = await fetch('http://localhost:8002/api/my-tasks', { headers });
        if (tasksRes.ok) {
          const tasks = await tasksRes.json();
          setMyTasks(tasks);
          const todo = tasks.filter(t => t.status === 'TODO').length;
          const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
          const done = tasks.filter(t => t.status === 'DONE').length;
          
          setStats(prev => ({ 
            ...prev, 
            tasksTodo: todo, 
            tasksInProgress: inProgress, 
            tasksDone: done, 
            totalTasks: tasks.length 
          }));
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    fetchData();
  }, [token, currentView]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('http://localhost:8002/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        const unread = data.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications(); 
    const intervalId = setInterval(fetchNotifications, 5000); 
    return () => clearInterval(intervalId);
  }, [token]);

  const handleCloseNotifications = async () => {
    setShowNotifModal(false);
    
    if (notifications.length > 0) {
        try {
            await fetch('http://localhost:8002/api/notifications', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications([]);
            setUnreadCount(0);
        } catch (err) {
            console.error("Failed to clear notifications", err);
        }
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const bodyData = { first_name: editForm.first_name, last_name: editForm.last_name };
      if (editForm.password) bodyData.password = editForm.password;

      const res = await fetch('http://localhost:8000/users/updateme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(bodyData)
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUserData(updatedUser); 
        setShowSettings(false);   
        showMessage('success', 'Profile updated successfully!'); 
        setEditForm(prev => ({ ...prev, password: '' }));
      } else {
        throw new Error('Update failed');
      }
    } catch (err) {
      showMessage('error', 'Failed to update profile.');
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setCurrentView('task-details');
  };

  const chartData = [
    { name: 'To Do', value: stats.tasksTodo, color: '#ef4444' }, 
    { name: 'In Progress', value: stats.tasksInProgress, color: '#eab308' }, 
    { name: 'Done', value: stats.tasksDone, color: '#10b981' }, 
  ];

  return (
    <div className="flex h-screen bg-[#eceff1] font-sans p-4 gap-4 overflow-hidden">

      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[25px] shadow-2xl w-[400px] relative animate-fadeIn">
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><FaTimes /></button>
            <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Edit Profile</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
               <div><label className="text-xs font-bold text-gray-500 uppercase">First Name</label><input type="text" className="w-full border-b border-gray-300 py-2 outline-none focus:border-[#6dabe4]" value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} /></div>
               <div><label className="text-xs font-bold text-gray-500 uppercase">Last Name</label><input type="text" className="w-full border-b border-gray-300 py-2 outline-none focus:border-[#6dabe4]" value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} /></div>
               <div><label className="text-xs font-bold text-gray-500 uppercase">New Password</label><input type="password" className="w-full border-b border-gray-300 py-2 outline-none focus:border-[#6dabe4]" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} placeholder="Leave empty to keep current" /></div>
               <button type="submit" className="w-full bg-[#6dabe4] text-white py-3 rounded-[10px] font-bold hover:bg-[#5a95c9] mt-4 transition">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {showNotifModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[25px] shadow-2xl w-[500px] h-[600px] flex flex-col relative animate-fadeIn overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Bell className="text-[#6dabe4]" /> Notifications</h3>
                <button onClick={() => setShowNotifModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {notifications.length > 0 ? (
                    notifications.map(notif => (
                        <div key={notif._id} className="p-4 mb-3 bg-white border border-gray-100 rounded-[15px] hover:shadow-md hover:border-blue-100 transition-all">
                            <div className="flex gap-3">
                                <div className="mt-1 w-2 h-2 rounded-full bg-[#6dabe4] shrink-0"></div>
                                <div>
                                    <p className="text-gray-700 font-medium leading-relaxed">{notif.message}</p>
                                    <p className="text-xs text-gray-400 mt-2 font-semibold">{new Date(notif.date_created).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60"><Bell size={48} className="mb-4" /><p className="text-lg">No notifications yet.</p></div>
                )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
                <button 
                    onClick={handleCloseNotifications} 
                    className="text-sm font-bold text-[#6dabe4] hover:underline"
                >
                    Close & Clear
                </button>
            </div>
          </div>
        </div>
      )}
      
      <aside className="w-72 bg-white rounded-[25px] shadow-xl flex flex-col justify-between z-10 hidden md:flex">
        <div>
          <div className="p-8 flex items-center justify-center border-b border-gray-50">
            <h1 className="text-2xl font-extrabold text-[#6dabe4] tracking-wider uppercase">TUCello</h1>
          </div>
          <nav className="mt-6 px-4 space-y-2">
            
            {userData.role === 'ADMIN' && (
                <div 
                  onClick={() => setCurrentView('admin')}
                  className={`flex items-center px-5 py-3 rounded-[15px] cursor-pointer transition-all font-medium ${currentView === 'admin' ? 'bg-[#6dabe4] text-white shadow-md font-bold' : 'text-gray-500 hover:bg-[#f4f7fa]'}`}
                >
                  <ShieldAlert size={20} className="mr-3" /> Admin Panel
                </div>
            )}

            {userData.role !== 'ADMIN' && (
                <div 
                  onClick={() => { setCurrentView('dashboard'); setTargetTeam(null); }} // <--- ΚΑΙ ΕΔΩ
                  className={`flex items-center px-5 py-3 rounded-[15px] cursor-pointer transition-all font-medium ${currentView === 'dashboard' ? 'bg-[#6dabe4] text-white shadow-md font-bold' : 'text-gray-500 hover:bg-[#f4f7fa]'}`}
                >
                    <LayoutDashboard size={20} className="mr-3" /> Dashboard
                </div>
            )}

            <div 
              onClick={() => { setCurrentView('teams'); setTargetTeam(null); }} 
              className={`flex items-center px-5 py-3 rounded-[15px] cursor-pointer transition-all font-medium ${currentView === 'teams' ? 'bg-[#6dabe4] text-white shadow-md font-bold' : 'text-gray-500 hover:bg-[#f4f7fa]'}`}
            >
              <Users size={20} className="mr-3" /> My Teams
            </div>

            <div 
              onClick={() => setCurrentView('my-tasks')} 
              className={`flex items-center px-5 py-3 rounded-[15px] cursor-pointer transition-all font-medium ${currentView === 'my-tasks' ? 'bg-[#6dabe4] text-white shadow-md font-bold' : 'text-gray-500 hover:bg-[#f4f7fa]'}`}
            >
              <ListTodo size={20} className="mr-3" /> My Tasks
            </div>

          </nav>
        </div>
        <div className="p-6">
            <button onClick={onLogout} className="flex items-center justify-center w-full px-5 py-3 border-2 border-red-100 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-300 font-bold group">
              <LogOut size={20} className="mr-2 group-hover:text-white transition-colors" /> Logout
            </button>            
        </div>
      </aside>

      <div className="flex-1 flex flex-col bg-white rounded-[25px] shadow-lg overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-8 no-scrollbar">
          
          {currentView === 'dashboard' && userData.role !== 'ADMIN' && (
             <>
                <div className="bg-[#6dabe4] rounded-[30px] p-0 shadow-lg mb-10 flex justify-between relative overflow-hidden h-48 shrink-0"><div className="z-10 p-10 flex flex-col justify-center text-white max-w-lg"><h1 className="text-4xl font-bold mb-2">Hello, {userData.username}</h1><p className="text-blue-50 text-lg opacity-90">You have <strong>{stats.tasksTodo} pending tasks</strong> waiting for you today.</p></div><div className="absolute top-6 right-6 z-20 flex flex-col gap-3"><div onClick={() => setShowNotifModal(true)} className="p-3 bg-white rounded-full shadow-md cursor-pointer hover:bg-gray-50 transition relative group"><Bell className="text-gray-400 group-hover:text-[#6dabe4]" size={20} />{unreadCount > 0 && <span className="absolute top-2 right-3 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}</div><div onClick={() => setShowSettings(true)} className="p-3 bg-white rounded-full shadow-md cursor-pointer hover:bg-gray-50 transition group"><FaCog className="text-gray-400 group-hover:text-[#6dabe4]" size={20} /></div></div><div className="h-full w-1/2 absolute right-0 top-0"><div className="absolute inset-0 bg-gradient-to-r from-[#6dabe4] via-transparent to-transparent z-10"></div><img src={dashboardImage} alt="Dashboard Art" className="h-full w-full object-cover object-center" onError={(e) => e.target.style.display='none'} /></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">{[ { label: 'Active Teams', val: stats.teamsCount, icon: Users, col: 'text-blue-500', bg: 'bg-blue-50', onClick: () => { setCurrentView('teams'); setTargetTeam(null); } }, { label: 'To Do', val: stats.tasksTodo, icon: ListTodo, col: 'text-red-500', bg: 'bg-red-50' }, { label: 'In Progress', val: stats.tasksInProgress, icon: Clock, col: 'text-yellow-500', bg: 'bg-yellow-50' }, { label: 'Completed', val: stats.tasksDone, icon: PieChart, col: 'text-green-500', bg: 'bg-green-50' } ].map((item, idx) => ( <div key={idx} onClick={item.onClick} className={`p-6 rounded-[20px] border border-gray-100 hover:shadow-lg transition bg-white flex flex-col justify-between h-32 ${item.onClick ? 'cursor-pointer hover:border-blue-200' : ''}`}><div className="flex justify-between items-start"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{item.label}</p><div className={`p-2 rounded-lg ${item.bg} ${item.col}`}><item.icon size={20}/></div></div><h3 className="text-3xl font-bold text-gray-800">{item.val}</h3></div> ))}</div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"><div className="bg-white rounded-[25px] border border-gray-100 p-8 shadow-sm h-96 flex flex-col"><h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center"><Users size={22} className="mr-3 text-[#6dabe4]"/> My Teams</h3><div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">{myTeams.length > 0 ? (myTeams.map(team => (<div key={team._id} onClick={() => handleTeamClickFromDashboard(team)} className="p-5 border border-gray-100 rounded-[20px] hover:shadow-md transition hover:border-blue-100 bg-gray-50 cursor-pointer"><div className="flex justify-between items-center mb-2"><h4 className="font-bold text-gray-800 text-lg">{team.name}</h4><span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${team.leader_username === userData.username ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-600'}`}>{team.leader_username === userData.username ? 'Leader' : 'Member'}</span></div><p className="text-sm text-gray-500 line-clamp-2">{team.description}</p></div>))) : (<div className="flex flex-col items-center justify-center h-full opacity-50"><Users size={40} className="text-gray-300 mb-2" /><p className="text-gray-400 italic">No teams yet.</p></div>)}</div></div><div className="bg-white rounded-[25px] border border-gray-100 p-8 shadow-sm h-96 flex flex-col"><h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center justify-between"><span className="flex items-center"><ClipboardList size={22} className="mr-3 text-[#6dabe4]"/> My Pending Tasks</span></h3><div className="flex-1 overflow-y-auto pr-2 space-y-3 no-scrollbar">{myTasks.filter(t => t.status !== 'DONE').length > 0 ? (myTasks.filter(t => t.status !== 'DONE').map(task => <TaskCard key={task._id} task={task} onClick={handleTaskClick} />)) : (<div className="flex flex-col items-center justify-center h-full opacity-50"><CheckCircle size={40} className="text-emerald-200 mb-2" /><p className="text-gray-400 italic">All caught up! No pending tasks.</p></div>)}</div></div></div>
                <div className="bg-white rounded-[25px] border border-gray-100 p-8 shadow-sm mb-8"><h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center"><ChartIcon size={22} className="mr-3 text-[#6dabe4]"/> Task Analytics </h3><div className="w-full h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 600}} axisLine={false} tickLine={false} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{fill: '#999'}} /><Tooltip cursor={{fill: '#f8f9fd'}} contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}/><Bar dataKey="value" barSize={60} radius={[10, 10, 0, 0]}>{chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Bar></BarChart></ResponsiveContainer></div></div>
             </>
          )}

          {currentView === 'teams' && <TeamsView token={token} currentUser={userData} onTaskClick={handleTaskClick} />}

          {currentView === 'my-tasks' && (
            <MyTasksView 
              token={token} 
              onTaskClick={handleTaskClick} 
            />
          )}

          {currentView === 'task-details' && selectedTask && (
            <TaskDetailsView 
                task={selectedTask} 
                token={token} 
                currentUser={userData}
                isLeader={myTeams.find(t => t._id === selectedTask.team_id)?.leader_username === userData.username}
                onBack={() => setCurrentView('dashboard')} 
            />
          )}

          {currentView === 'admin' && userData.role === 'ADMIN' && (
              <AdminView token={token} />
          )}

        </main>
      </div>
    </div>
  );
};

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [message, setMessage] = useState({ type: '', text: '' });

  const showMessage = (type, text) => { setMessage({ type, text }); setTimeout(() => setMessage({ type: '', text: '' }), 5000); };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await fetch('http://localhost:8000/google-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: credentialResponse.credential }), });
      if (!res.ok) { const errData = await res.json(); throw new Error(errData.detail || 'Google login failed'); }
      const data = await res.json(); localStorage.setItem('token', data.access_token); setToken(data.access_token);
    } catch (err) { showMessage('error', 'Google Login Error: ' + err.message); }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); const formData = new URLSearchParams(); formData.append('username', loginUsername); formData.append('password', loginPassword);
    try {
      const response = await fetch('http://localhost:8000/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData, });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || 'Login failed'); }
      const data = await response.json(); localStorage.setItem('token', data.access_token); setToken(data.access_token);
    } catch (error) { showMessage('error', 'Login Failed: ' + error.message); }
  };

  const handleSignup = async (e) => {
    e.preventDefault(); const userData = { username, email, first_name: firstName, last_name: lastName, password };
    try {
      const response = await fetch('http://localhost:8000/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData), });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || 'Signup failed'); }
      showMessage('success', 'Signup Successful! Please wait for admin approval to log in.'); setIsLogin(true); 
    } catch (error) { showMessage('error', 'Signup Error: ' + error.message); }
  };

  const handleLogout = () => { localStorage.removeItem('token'); setToken(null); };

  if (token) return <Dashboard token={token} onLogout={handleLogout} showMessage={showMessage}/>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8f8f8]">
      <div className="bg-white rounded-[20px] shadow-[0px_15px_16.83px_0.17px_rgba(0,0,0,0.05)] overflow-hidden w-[900px] flex flex-col md:flex-row p-[70px]">
        <div className={`flex w-full ${isLogin ? 'flex-row' : 'flex-row-reverse'}`}>
          <div className={`w-1/2 hidden md:flex flex-col items-center justify-center ${isLogin ? 'pr-10' : 'pl-10'}`}>
            <img src={isLogin ? signinImage : signupImage} alt="Illustration" className="max-w-full h-auto mb-6" />
            <a href="#" onClick={() => { setIsLogin(!isLogin); setMessage({type:'', text:''}); }} className="text-[#222] text-[14px] underline hover:text-black mt-4">{isLogin ? 'Create an account' : 'I am already member'}</a>
          </div>
          <div className="w-full md:w-1/2">
            <h2 className="text-[36px] font-bold text-[#222] mb-[20px] leading-[1.2]">{isLogin ? 'Sign in' : 'Sign up'}</h2>
            {message.text && <div className={`mb-4 p-3 rounded text-sm font-bold ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message.text}</div>}
            <form onSubmit={isLogin ? handleLogin : handleSignup}>
              {isLogin ? (
                <>
                  <div className="relative mb-[25px] border-b border-[#999] focus-within:border-[#222]"><label className="absolute left-0 top-[50%] -translate-y-[50%] text-[#222]"><FaUser/></label><input type="text" placeholder="Your Username" className="w-full h-[25px] pl-[30px] border-none outline-none py-2 bg-transparent" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} required /></div>
                  <div className="relative mb-[25px] border-b border-[#999] focus-within:border-[#222]"><label className="absolute left-0 top-[50%] -translate-y-[50%] text-[#222]"><FaLock/></label><input type="password" placeholder="Password" className="w-full h-[25px] pl-[30px] border-none outline-none py-2 bg-transparent" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required /></div>
                  <button type="submit" className="bg-[#6dabe4] text-white px-[39px] py-[15px] rounded-[5px] font-bold text-[14px] uppercase hover:bg-[#5a95c9] transition shadow-md mt-4 w-full">Log in</button>
                  <div className="mt-6 flex flex-col items-center w-full"><span className="text-sm text-gray-500 mb-3">Or login with</span><GoogleLogin onSuccess={handleGoogleSuccess} onError={() => showMessage('error', 'Google Login Failed')} width="300" /></div>
                </>
              ) : (
                <>
                  <div className="relative mb-[25px] border-b border-[#999] focus-within:border-[#222]"><label className="absolute left-0 top-[50%] -translate-y-[50%] text-[#222]"><FaUser/></label><input type="text" placeholder="Username" className="w-full h-[25px] pl-[30px] border-none outline-none py-2 bg-transparent" value={username} onChange={(e) => setUsername(e.target.value)} required /></div>
                  <div className="relative mb-[25px] border-b border-[#999] focus-within:border-[#222]"><label className="absolute left-0 top-[50%] -translate-y-[50%] text-[#222]"><FaEnvelope/></label><input type="email" placeholder="Your Email" className="w-full h-[25px] pl-[30px] border-none outline-none py-2 bg-transparent" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                  <div className="relative mb-[25px] border-b border-[#999] focus-within:border-[#222]"><label className="absolute left-0 top-[50%] -translate-y-[50%] text-[#222]"><FaIdCard/></label><input type="text" placeholder="First Name" className="w-full h-[25px] pl-[30px] border-none outline-none py-2 bg-transparent" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
                  <div className="relative mb-[25px] border-b border-[#999] focus-within:border-[#222]"><label className="absolute left-0 top-[50%] -translate-y-[50%] text-[#222]"><FaIdCard/></label><input type="text" placeholder="Last Name" className="w-full h-[25px] pl-[30px] border-none outline-none py-2 bg-transparent" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
                  <div className="relative mb-[25px] border-b border-[#999] focus-within:border-[#222]"><label className="absolute left-0 top-[50%] -translate-y-[50%] text-[#222]"><FaLock/></label><input type="password" placeholder="Password" className="w-full h-[25px] pl-[30px] border-none outline-none py-2 bg-transparent" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                  <button type="submit" className="bg-[#6dabe4] text-white px-[39px] py-[15px] rounded-[5px] font-bold text-[14px] uppercase hover:bg-[#5a95c9] transition shadow-md mt-4 w-full">Register</button>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;