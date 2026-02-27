import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Calendar, Paperclip, Send, Edit3, Save, X, Trash2, FileText } from 'lucide-react';

const TaskDetailsView = ({ task, token, onBack, currentUser, isLeader }) => {
  const [details, setDetails] = useState(task);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const fileInputRef = useRef(null);

  const isAssignee = currentUser.username === details.assigned_to;
  const canChangeStatus = isLeader || isAssignee; 

  const fetchTaskData = async () => {
    try {
      const res = await fetch(`http://localhost:8002/api/tasks/${task._id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setDetails(data);
        setComments(data.comments || []);
        setEditForm({ title: data.title, description: data.description, priority: data.priority, assigned_to: data.assigned_to, due_date: data.due_date ? data.due_date.split('T')[0] : '' });
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchTaskData(); }, [task._id]);

  const handleStatusChange = async (newStatus) => {
    if (!canChangeStatus) return; 
    try {
      await fetch(`http://localhost:8002/api/tasks/${task._id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ status: newStatus })
      });
      setDetails(prev => ({ ...prev, status: newStatus }));
    } catch (err) { console.error(err); }
  };

  const handleSaveChanges = async () => {
      try {
          const payload = { ...editForm };
          if (payload.due_date) payload.due_date = new Date(payload.due_date).toISOString();
          const res = await fetch(`http://localhost:8002/api/tasks/${task._id}`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload)
          });
          if (res.ok) { const updated = await res.json(); setDetails(prev => ({...prev, ...updated})); setIsEditing(false); }
      } catch (err) { console.error(err); }
  };

  const handleDeleteTask = async () => {
      if (!window.confirm("Delete this task?")) return;
      try {
          const res = await fetch(`http://localhost:8002/api/tasks/${task._id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) onBack(); 
      } catch (err) { console.error(err); }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && !selectedFile) return;
    const formData = new FormData();
    formData.append('text', newComment);
    if (selectedFile) formData.append('file', selectedFile);
    try {
        const res = await fetch(`http://localhost:8002/api/tasks/${task._id}/comments`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
        if (res.ok) { setNewComment(''); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; fetchTaskData(); }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn bg-white rounded-[30px] shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
        <div className="flex items-center gap-4 flex-1">
            <button onClick={onBack} className="p-2 bg-white rounded-full hover:bg-gray-200 transition shadow-sm"><ChevronLeft size={24} /></button>
            <div className="flex-1">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3 mb-1">
                        {isEditing ? (
                            <select className="px-2 py-1 text-xs border rounded bg-white" value={editForm.priority} onChange={e => setEditForm({...editForm, priority: e.target.value})}>
                                <option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option>
                            </select>
                        ) : (<span className="px-2 py-0.5 text-[10px] font-bold rounded border uppercase">{details.priority}</span>)}
                        
                        {isEditing ? (<input type="date" className="text-xs border rounded px-1" value={editForm.due_date} onChange={e => setEditForm({...editForm, due_date: e.target.value})}/>) : (
                            details.due_date && <span className="flex items-center text-xs text-gray-500 font-medium"><Calendar size={12} className="mr-1"/> {new Date(details.due_date).toLocaleDateString()}</span>
                        )}
                    </div>
                    {isLeader && !isEditing && (
                        <div className="flex gap-2">
                            <button onClick={() => setIsEditing(true)} className="p-2 text-gray-400 hover:text-blue-500"><Edit3 size={18}/></button>
                            <button onClick={handleDeleteTask} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18}/></button>
                        </div>
                    )}
                    {isEditing && (<div className="flex gap-2"><button onClick={() => setIsEditing(false)} className="p-2 text-red-400"><X size={18}/></button><button onClick={handleSaveChanges} className="p-2 text-green-500"><Save size={18}/></button></div>)}
                </div>
                {isEditing ? (<input type="text" className="text-2xl font-bold w-full bg-white border-b-2 border-blue-400 outline-none" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})}/>) : (<h1 className="text-2xl font-extrabold text-gray-800">{details.title}</h1>)}
            </div>
        </div>
        
        <div className="ml-4 relative group">
            <button className={`px-4 py-2 rounded-xl font-bold text-sm shadow-sm ${!canChangeStatus && 'opacity-70 cursor-not-allowed'} bg-gray-100`}>{details.status?.replace('_', ' ')}</button>
            
            {canChangeStatus && (
                <div className="absolute right-0 top-full pt-2 w-40 hidden group-hover:block z-10">
                    <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                        {['TODO', 'IN_PROGRESS', 'DONE'].map(s => (
                            <button 
                                key={s} 
                                onClick={() => handleStatusChange(s)} 
                                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 font-bold text-gray-600 hover:text-[#6dabe4] border-b border-gray-50 last:border-0"
                            >
                                {s.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

      </div>
      <div className="flex-1 flex overflow-hidden">
          <div className="w-2/3 p-8 overflow-y-auto border-r border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Description</h3>
              {isEditing ? (<textarea className="w-full h-40 p-3 bg-[#f8f9fd] rounded-xl outline-none resize-none" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}/>) : (<p className="text-gray-700 whitespace-pre-wrap">{details.description}</p>)}
              <div className="mt-8"><h3 className="text-xs font-bold text-gray-400 uppercase mb-1">Assigned To</h3><span className="font-bold text-gray-700">{details.assigned_to}</span></div>
          </div>
          <div className="w-1/3 bg-[#f8f9fd] flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-white"><h3 className="font-bold text-gray-700 flex items-center gap-2"><FileText size={18}/> Activity</h3></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {comments.map(c => (
                      <div key={c._id} className="bg-white p-3 rounded-[15px] shadow-sm"><div className="flex justify-between text-xs mb-1 font-bold"><span>{c.created_by}</span><span className="text-gray-400">{new Date(c.date_created).toLocaleDateString()}</span></div><p className="text-sm text-gray-600">{c.text}</p>{c.file_url && <a href={`http://localhost:8002${c.file_url}`} target="_blank" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"><Paperclip size={12}/> File</a>}</div>
                  ))}
              </div>
              <form onSubmit={handlePostComment} className="p-4 bg-white border-t border-gray-200 flex gap-2">
                  <input type="text" placeholder="Comment..." className="flex-1 bg-gray-100 rounded-xl px-4 py-2 text-sm outline-none" value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                  <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files[0])} />
                  <button type="button" onClick={() => fileInputRef.current.click()} className="p-2 text-gray-400 hover:text-blue-500"><Paperclip size={20}/></button>
                  <button type="submit" className="p-2 bg-blue-500 text-white rounded-xl"><Send size={18}/></button>
              </form>
          </div>
      </div>
    </div>
  );
};
export default TaskDetailsView;