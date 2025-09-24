import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Users, Monitor, CheckSquare, DollarSign, AlertTriangle, TrendingUp, Upload, Mail, Send, Settings } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface CustomQuickAction {
  id: string;
  title: string;
  description: string;
  href?: string;
  onClick?: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  enabled: boolean;
}

interface QuickActionsSetupProps {
  customActions: CustomQuickAction[];
  onSave: (actions: CustomQuickAction[]) => void;
  onClose: () => void;
}

const availableIcons = [
  { name: 'Users', component: Users },
  { name: 'Monitor', component: Monitor },
  { name: 'CheckSquare', component: CheckSquare },
  { name: 'DollarSign', component: DollarSign },
  { name: 'AlertTriangle', component: AlertTriangle },
  { name: 'TrendingUp', component: TrendingUp },
  { name: 'Upload', component: Upload },
  { name: 'Mail', component: Mail },
  { name: 'Send', component: Send },
  { name: 'Settings', component: Settings }
];

const availableColors = [
  { name: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { name: 'green', label: 'Green', class: 'bg-green-500' },
  { name: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { name: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { name: 'red', label: 'Red', class: 'bg-red-500' }
];

const availableActions = [
  { value: 'navigate', label: 'Navigate to Page' },
  { value: 'triggerDailyEmail', label: 'Send Daily Email' },
  { value: 'showNotificationManager', label: 'Open Notification Manager' }
];

export default function QuickActionsSetup({ customActions, onSave, onClose }: QuickActionsSetupProps) {
  const [actions, setActions] = useState<CustomQuickAction[]>(customActions);
  const [editingAction, setEditingAction] = useState<CustomQuickAction | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddAction = () => {
    const newAction: CustomQuickAction = {
      id: Date.now().toString(),
      title: '',
      description: '',
      href: '',
      onClick: '',
      icon: 'Settings',
      color: 'blue',
      enabled: true
    };
    setEditingAction(newAction);
    setShowAddForm(true);
  };

  const handleEditAction = (action: CustomQuickAction) => {
    setEditingAction(action);
    setShowAddForm(true);
  };

  const handleDeleteAction = (id: string) => {
    setActions(actions.filter(action => action.id !== id));
  };

  const handleSaveAction = (action: CustomQuickAction) => {
    if (editingAction) {
      if (editingAction.id === action.id) {
        // Update existing
        setActions(actions.map(a => a.id === action.id ? action : a));
      } else {
        // Add new
        setActions([...actions, action]);
      }
    }
    setEditingAction(null);
    setShowAddForm(false);
  };

  const handleSaveAll = () => {
    onSave(actions);
    onClose();
  };

  const toggleActionEnabled = (id: string) => {
    setActions(actions.map(action => 
      action.id === id ? { ...action, enabled: !action.enabled } : action
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Custom Quick Actions</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create and manage custom quick actions for the admin dashboard
          </p>
        </div>
        <Button onClick={handleAddAction} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Action
        </Button>
      </div>

      {/* Actions List */}
      <div className="space-y-3">
        {actions.map((action) => {
          const IconComponent = availableIcons.find(i => i.name === action.icon)?.component || Settings;
          const colorClass = availableColors.find(c => c.name === action.color)?.class || 'bg-blue-500';
          
          return (
            <Card key={action.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium">{action.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{action.description}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-gray-400">
                        {action.href ? `Navigate to: ${action.href}` : `Action: ${action.onClick}`}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${action.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {action.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => toggleActionEnabled(action.id)}
                  >
                    {action.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEditAction(action)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteAction(action.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
        
        {actions.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No custom quick actions yet</p>
            <p className="text-sm">Click "Add Action" to create your first custom quick action</p>
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && editingAction && (
        <ActionForm
          action={editingAction}
          onSave={handleSaveAction}
          onCancel={() => {
            setEditingAction(null);
            setShowAddForm(false);
          }}
        />
      )}

      {/* Save Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSaveAll} className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}

interface ActionFormProps {
  action: CustomQuickAction;
  onSave: (action: CustomQuickAction) => void;
  onCancel: () => void;
}

function ActionForm({ action, onSave, onCancel }: ActionFormProps) {
  const [formData, setFormData] = useState<CustomQuickAction>(action);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title && formData.description) {
      onSave(formData);
    }
  };

  return (
    <Card className="p-6">
      <h4 className="text-lg font-semibold mb-4">
        {action.id === action.id ? 'Edit Action' : 'Add New Action'}
      </h4>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Action title"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Action description"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Action Type
            </label>
            <select
              value={formData.href ? 'navigate' : 'onClick'}
              onChange={(e) => {
                if (e.target.value === 'navigate') {
                  setFormData({ ...formData, href: '', onClick: '' });
                } else {
                  setFormData({ ...formData, href: '', onClick: 'triggerDailyEmail' });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="navigate">Navigate to Page</option>
              <option value="onClick">Execute Action</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {formData.href ? 'Page URL' : 'Action'}
            </label>
            {formData.href !== undefined ? (
              <input
                type="text"
                value={formData.href}
                onChange={(e) => setFormData({ ...formData, href: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="/admin/users"
              />
            ) : (
              <select
                value={formData.onClick}
                onChange={(e) => setFormData({ ...formData, onClick: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {availableActions.map(action => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Icon
            </label>
            <div className="grid grid-cols-5 gap-2">
              {availableIcons.map(icon => {
                const IconComponent = icon.component;
                return (
                  <button
                    key={icon.name}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: icon.name })}
                    className={`p-2 rounded-lg border-2 ${
                      formData.icon === icon.name 
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <IconComponent className="w-5 h-5 mx-auto" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Color
            </label>
            <div className="flex gap-2">
              {availableColors.map(color => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.name as any })}
                  className={`w-8 h-8 rounded-lg border-2 ${
                    formData.color === color.name 
                      ? 'border-gray-900 dark:border-white' 
                      : 'border-gray-200 dark:border-gray-600'
                  } ${color.class}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Save Action
          </Button>
        </div>
      </form>
    </Card>
  );
}
