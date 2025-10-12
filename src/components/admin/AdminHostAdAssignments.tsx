import { useEffect, useMemo, useState } from 'react';
import { Calendar, Play, PauseCircle, XCircle, RefreshCw, Search, Edit, Save, X, Trash2 } from 'lucide-react';
import { AdminService } from '../../services/adminService';
import { useNotification } from '../../contexts/NotificationContext';

interface HostKioskAssignment {
  id: string;
  host_id: string;
  kiosk_id: string;
  assigned_at: string;
  status: 'active' | 'inactive' | 'suspended';
  commission_rate: number;
  created_at: string;
  updated_at: string;
  kiosk: {
    id: string;
    name: string;
    location: string;
    city: string;
    state: string;
    status: string;
  };
  host: {
    id: string;
    full_name: string;
    email: string;
    company_name?: string;
    role: string;
  };
}

export default function AdminHostAdAssignments() {
  const { addNotification } = useNotification();
  const [assignments, setAssignments] = useState<HostKioskAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingAssignment, setEditingAssignment] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    status: string;
    commissionRate: number;
  }>({
    status: '',
    commissionRate: 70.00
  });

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const data = await AdminService.getAllHostKioskAssignments();
      setAssignments(data);
    } catch (error) {
      console.error('Error loading host kiosk assignments:', error);
      addNotification('error', 'Error', 'Failed to load host kiosk assignments');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (assignment: HostKioskAssignment) => {
    setEditingAssignment(assignment.id);
    setEditForm({
      status: assignment.status,
      commissionRate: assignment.commission_rate
    });
  };

  const cancelEditing = () => {
    setEditingAssignment(null);
    setEditForm({
      status: '',
      commissionRate: 70.00
    });
  };

  const saveAssignmentChanges = async (assignmentId: string) => {
    try {
      const assignment = assignments.find(a => a.id === assignmentId);
      if (!assignment) return;

      const updates: any = {};
      
      // Update status if changed
      if (editForm.status !== assignment.status) {
        updates.status = editForm.status;
      }

      // Update commission rate if changed
      if (editForm.commissionRate !== assignment.commission_rate) {
        updates.commission_rate = editForm.commissionRate;
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        await AdminService.updateHostKioskAssignment(assignmentId, updates);
      }

      // Reload assignments to reflect changes
      await loadAssignments();
      setEditingAssignment(null);
      addNotification('success', 'Assignment Updated', 'Host kiosk assignment has been updated successfully');
    } catch (error) {
      console.error('Error updating assignment:', error);
      addNotification('error', 'Update Failed', 'Failed to update host kiosk assignment');
    }
  };

  const updateAssignmentStatus = async (assignmentId: string, status: string) => {
    try {
      await AdminService.updateHostKioskAssignment(assignmentId, { status: status as any });
      await loadAssignments();
      addNotification('success', 'Status Updated', `Assignment status changed to ${status}`);
    } catch (error) {
      console.error('Error updating assignment status:', error);
      addNotification('error', 'Update Failed', 'Failed to update assignment status');
    }
  };

  const deleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      return;
    }

    try {
      await AdminService.unassignKioskFromHost(assignmentId);
      await loadAssignments();
      addNotification('success', 'Assignment Deleted', 'Host kiosk assignment has been deleted');
    } catch (error) {
      console.error('Error deleting assignment:', error);
      addNotification('error', 'Delete Failed', 'Failed to delete host kiosk assignment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAssignments = useMemo(() => {
    let filtered = assignments;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    // Filter by search query
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      filtered = filtered.filter(a => 
        a.kiosk.name.toLowerCase().includes(q) ||
        a.kiosk.location.toLowerCase().includes(q) ||
        a.kiosk.city.toLowerCase().includes(q) ||
        a.kiosk.state.toLowerCase().includes(q) ||
        a.host.full_name.toLowerCase().includes(q) ||
        a.host.email.toLowerCase().includes(q) ||
        (a.host.company_name && a.host.company_name.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [assignments, statusFilter, query]);

  const Stat = ({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Host Kiosk Assignments</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage which kiosks are assigned to which hosts</p>
        </div>
        <button
          onClick={loadAssignments}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Stat label="Total" value={assignments.length} icon={Calendar} color="bg-blue-500" />
        <Stat label="Active" value={assignments.filter(a => a.status === 'active').length} icon={Play} color="bg-green-500" />
        <Stat label="Inactive" value={assignments.filter(a => a.status === 'inactive').length} icon={PauseCircle} color="bg-gray-500" />
        <Stat label="Suspended" value={assignments.filter(a => a.status === 'suspended').length} icon={XCircle} color="bg-red-500" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by kiosk name, location, host..."
              className="w-full bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assignments ({filteredAssignments.length})</h3>
        </div>
        {filteredAssignments.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">No assignments found</div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAssignments.map(assignment => (
              <div key={assignment.id} className="p-6">
                {editingAssignment === assignment.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Assignment</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveAssignmentChanges(assignment.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          <Save className="h-4 w-4" />
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commission Rate (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={editForm.commissionRate}
                          onChange={(e) => setEditForm(prev => ({ ...prev, commissionRate: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-full">{assignment.kiosk.name}</h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize flex-shrink-0 ${getStatusColor(assignment.status)}`}>
                          {assignment.status}
                        </span>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 flex-shrink-0">
                          Commission: {assignment.commission_rate}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{assignment.kiosk.location}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Assigned: {new Date(assignment.assigned_at).toISOString().split('T')[0]}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          📺 {assignment.kiosk.name} ({assignment.kiosk.city}, {assignment.kiosk.state})
                        </span>
                        <span className="inline-flex items-center gap-1">
                          👤 Host: {assignment.host.full_name} ({assignment.host.company_name || assignment.host.email})
                        </span>
                        <span className="inline-flex items-center gap-1">
                          🏢 Kiosk Status: {assignment.kiosk.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex flex-col gap-2 w-full md:w-64 md:ml-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditing(assignment)}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                        <select
                          value={assignment.status}
                          onChange={(e) => updateAssignmentStatus(assignment.id, e.target.value)}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="completed">Completed</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      
                      <button
                        onClick={() => deleteAssignment(assignment.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
