import React, { useState } from 'react';
import { X, Calendar, User, AlertCircle } from 'lucide-react';

const CreateTaskModal = ({ isOpen, onClose, teamMembers, onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    assigned_to: '', 
    due_date: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.assigned_to) {
        alert("Please assign the task to a member.");
        return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-[25px] shadow-2xl w-full max-w-lg p-8 relative animate-scaleIn">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-extrabold text-gray-800">New Task</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Task Title</label>
                <input type="text" required className="w-full p-3 bg-[#f8f9fd] rounded-xl outline-none focus:ring-2 focus:ring-[#6dabe4] font-bold text-gray-700"
                    value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                <textarea required className="w-full p-3 bg-[#f8f9fd] rounded-xl outline-none focus:ring-2 focus:ring-[#6dabe4] h-24 resize-none text-sm text-gray-600"
                    value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priority</label>
                    <select className="w-full p-3 bg-[#f8f9fd] rounded-xl outline-none focus:ring-2 focus:ring-[#6dabe4] text-sm font-bold text-gray-700"
                        value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})}>
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Due Date</label>
                    <input type="date" className="w-full p-3 bg-[#f8f9fd] rounded-xl outline-none focus:ring-2 focus:ring-[#6dabe4] text-sm font-bold text-gray-700"
                        value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign To</label>
                <select required className="w-full p-3 bg-[#f8f9fd] rounded-xl outline-none focus:ring-2 focus:ring-[#6dabe4] text-sm font-bold text-gray-700"
                    value={formData.assigned_to} onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}>
                    <option value="" disabled>Select a member</option>
                    {teamMembers.map(member => (<option key={member} value={member}>{member}</option>))}
                </select>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-[#6dabe4] hover:bg-[#5a9bd4] text-white py-4 rounded-xl font-bold shadow-md mt-4">
                {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
        </form>
      </div>
    </div>
  );
};
export default CreateTaskModal;