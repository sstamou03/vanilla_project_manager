import React, { useState, useEffect } from 'react';
import { 
  Calendar, Filter, CheckCircle, Clock, ListTodo, ArrowUpRight, X 
} from 'lucide-react';

const MyTasksView = ({ token, onTaskClick }) => {
  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');     // ISO String YYYY-MM-DD
  const [isLoading, setIsLoading] = useState(false);

  const fetchMyTasks = async () => {
    setIsLoading(true);
    try {
      let url = 'http://localocalhostlhost:8002/api/my-tasks?';
      if (statusFilter) url += `status=${statusFilter}&`;
      if (dateFilter) {
          const isoDate = new Date(dateFilter).toISOString();
          url += `due_date_before=${isoDate}&`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, [statusFilter, dateFilter]);

  const handleStatusChange = async (e, taskId, newStatus) => {
    e.stopPropagation(); 
    
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));

    try {
      const res = await fetch(`http://localhost:8002/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!res.ok) {
        fetchMyTasks();
        alert("Failed to update status");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (s) => {
    if (s === 'DONE') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s === 'IN_PROGRESS') return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-gray-800 tracking-tight">My Tasks</h2>
          <p className="text-gray-500 mt-1 text-lg"></p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-[20px] shadow-sm border border-gray-100">
            <div className="flex bg-gray-100 p-1 rounded-xl">
                {['', 'TODO', 'IN_PROGRESS', 'DONE'].map(f => (
                    <button
                        key={f}
                        onClick={() => setStatusFilter(f)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                            statusFilter === f 
                            ? 'bg-white text-[#6dabe4] shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {f === '' ? 'ALL' : f.replace('_', ' ')}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
                <Calendar size={16} className="text-gray-400"/>
                <input 
                    type="date" 
                    className="bg-transparent text-xs font-bold text-gray-600 outline-none"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                />
                {dateFilter && (
                    <button onClick={() => setDateFilter('')} className="text-red-400 hover:text-red-600">
                        <X size={14}/>
                    </button>
                )}
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
        {isLoading ? (
            <div className="text-center py-20 text-gray-400">Loading your tasks...</div>
        ) : tasks.length > 0 ? (
            tasks.map(task => (
                <div 
                    key={task._id}
                    onClick={() => onTaskClick(task)} // CLICK TO OPEN DETAILS
                    className="bg-white p-5 rounded-[20px] shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#6dabe4]/30 transition-all cursor-pointer group flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                    <div className="flex items-center gap-4 flex-1">
                        <div className={`p-3 rounded-2xl ${
                            task.priority === 'HIGH' ? 'bg-red-50 text-red-500' : 
                            task.priority === 'MEDIUM' ? 'bg-yellow-50 text-yellow-500' : 'bg-green-50 text-green-500'
                        }`}>
                            {task.status === 'DONE' ? <CheckCircle size={24}/> : <ListTodo size={24}/>}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 text-lg group-hover:text-[#6dabe4] transition-colors">{task.title}</h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 font-medium">
                                <span className="uppercase border px-1.5 py-0.5 rounded border-gray-200">{task.priority}</span>
                                {task.due_date && (
                                    <span className="flex items-center">
                                        <Clock size={12} className="mr-1"/> Due: {new Date(task.due_date).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div onClick={(e) => e.stopPropagation()} className="relative shrink-0">
                        <select 
                            value={task.status}
                            onChange={(e) => handleStatusChange(e, task._id, e.target.value)}
                            className={`appearance-none cursor-pointer pl-4 pr-10 py-2.5 rounded-xl text-xs font-bold border outline-none focus:ring-2 focus:ring-[#6dabe4] transition-all ${getStatusColor(task.status)}`}
                        >
                            <option value="TODO">TODO</option>
                            <option value="IN_PROGRESS">IN PROGRESS</option>
                            <option value="DONE">DONE</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                            <ArrowUpRight size={14}/>
                        </div>
                    </div>
                </div>
            ))
        ) : (
            <div className="flex flex-col items-center justify-center h-full opacity-50">
                <Filter size={48} className="text-gray-300 mb-4"/>
                <p className="text-gray-400 font-medium">No tasks found matching these filters.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default MyTasksView;