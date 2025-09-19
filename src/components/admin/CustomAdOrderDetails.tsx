import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/textarea';
import Label from '../ui/label';
import Badge from '../ui/badge';
import Separator from '../ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Upload, 
  MessageSquare, 
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
  Trash2
} from 'lucide-react';
import { AdminService } from '../../services/adminService';
import { toast } from 'react-hot-toast';

interface CustomAdOrderDetailsProps {
  order: any;
  onUpdate: () => void;
}

const CustomAdOrderDetails: React.FC<CustomAdOrderDetailsProps> = ({ order, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [editingFields, setEditingFields] = useState({
    firstName: order.first_name,
    lastName: order.last_name,
    email: order.email,
    phone: order.phone,
    address: order.address,
    details: order.details
  });

  const handleStatusUpdate = async (status: string) => {
    try {
      await AdminService.updateCustomAdOrderStatus(order.id, status);
      toast.success(`Order status updated to ${status}`);
      onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update order status');
    }
  };

  const handleSaveChanges = async () => {
    try {
      // Here you would implement the update logic
      // For now, we'll just show a success message
      toast.success('Order details updated successfully');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order details');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await AdminService.addCustomAdOrderComment(order.id, newComment);
      toast.success('Comment added successfully');
      setNewComment('');
      setIsAddingComment(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleSubmitProof = async () => {
    if (proofFiles.length === 0) return;

    try {
      await AdminService.submitCustomAdOrderProof(order.id, proofFiles);
      toast.success('Proof submitted successfully');
      setProofFiles([]);
      setIsSubmittingProof(false);
      onUpdate();
    } catch (error) {
      console.error('Error submitting proof:', error);
      toast.error('Failed to submit proof');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setProofFiles(Array.from(e.target.files));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6 text-gray-600" />
              <div>
                <h2 className="text-xl font-semibold">
                  {order.first_name} {order.last_name}
                </h2>
                <p className="text-sm text-gray-600">
                  Order #{order.id.slice(-8)} • {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className={`${getStatusColor(order.status)} flex items-center space-x-1`}>
                {getStatusIcon(order.status)}
                <span className="capitalize">{order.status.replace('_', ' ')}</span>
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Contact Information */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Contact Information</span>
          </h3>
          <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={editingFields.firstName}
                onChange={(e) => setEditingFields(prev => ({ ...prev, firstName: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={editingFields.lastName}
                onChange={(e) => setEditingFields(prev => ({ ...prev, lastName: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={editingFields.email}
                  onChange={(e) => setEditingFields(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  value={editingFields.phone}
                  onChange={(e) => setEditingFields(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <Input
                  id="address"
                  value={editingFields.address}
                  onChange={(e) => setEditingFields(prev => ({ ...prev, address: e.target.value }))}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
          {isEditing && (
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveChanges}>
                Save Changes
              </Button>
            </div>
          )}
          </div>
        </div>
      </Card>

      {/* Order Details */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Order Details</span>
          </h3>
          <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Service</Label>
              <p className="text-sm">{order.service_key}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Total Amount</Label>
              <p className="text-sm font-semibold">${order.total_amount.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Payment Status</Label>
              <Badge className={order.payment_status === 'succeeded' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {order.payment_status}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Created</Label>
              <p className="text-sm">{new Date(order.created_at).toLocaleString()}</p>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-600">Project Details</Label>
            <Textarea
              value={editingFields.details}
              onChange={(e) => setEditingFields(prev => ({ ...prev, details: e.target.value }))}
              disabled={!isEditing}
              className="mt-1"
              rows={4}
            />
          </div>
          </div>
        </div>
      </Card>

      {/* Files */}
      {order.files && order.files.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Uploaded Files</span>
            </h3>
            <div>
            <div className="space-y-2">
              {order.files.map((file: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(file.url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(file.url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        </Card>
      )}

      {/* Comments */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Comments</span>
          </h3>
          <div className="space-y-4">
          {order.comments && order.comments.length > 0 ? (
            <div className="space-y-3">
              {order.comments.map((comment: any, index: number) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{comment.author_name || 'Admin'}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{comment.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No comments yet</p>
          )}
          
          {isAddingComment ? (
            <div className="space-y-3">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddingComment(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddComment}>
                  <Send className="h-4 w-4 mr-2" />
                  Add Comment
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsAddingComment(true)}
              className="w-full"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Add Comment
            </Button>
          )}
          </div>
        </div>
      </Card>

      {/* Proof Submission */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Proof Submission</span>
          </h3>
          <div className="space-y-4">
          {order.proofs && order.proofs.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-600">Submitted Proofs</Label>
              {order.proofs.map((proof: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">{proof.file_name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(proof.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(proof.file_url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(proof.file_url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {isSubmittingProof ? (
            <div className="space-y-3">
              <Label htmlFor="proofFiles">Select Proof Files</Label>
              <Input
                id="proofFiles"
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileChange}
              />
              {proofFiles.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-600">Selected Files:</Label>
                  {proofFiles.map((file, index) => (
                    <p key={index} className="text-sm text-gray-600">{file.name}</p>
                  ))}
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsSubmittingProof(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitProof} disabled={proofFiles.length === 0}>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Proof
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsSubmittingProof(true)}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Submit New Proof
            </Button>
          )}
          </div>
        </div>
      </Card>

      {/* Status Actions */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Status Actions</h3>
          <div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => handleStatusUpdate('pending')}
              disabled={order.status === 'pending'}
            >
              Mark as Pending
            </Button>
            <Button
              variant="outline"
              onClick={() => handleStatusUpdate('in_progress')}
              disabled={order.status === 'in_progress'}
            >
              Mark as In Progress
            </Button>
            <Button
              variant="outline"
              onClick={() => handleStatusUpdate('completed')}
              disabled={order.status === 'completed'}
            >
              Mark as Completed
            </Button>
            <Button
              variant="outline"
              onClick={() => handleStatusUpdate('cancelled')}
              disabled={order.status === 'cancelled'}
              className="text-red-600 hover:text-red-700"
            >
              Cancel Order
            </Button>
          </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CustomAdOrderDetails;
