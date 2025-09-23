import { supabase } from '../lib/supabaseClient';
import type { Inserts } from '../types/database';
import { CustomAdEmailService } from './customAdEmailService';

export interface CustomAdOrderInput {
  userId: string;
  serviceKey: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  details: string;
  files: File[];
  totalAmount: number; // in USD dollars
}

export interface UploadedFileSummary {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface CustomAdOrder {
  id: string;
  user_id: string;
  service_key: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  details: string;
  files: UploadedFileSummary[];
  total_amount: number;
  payment_status: 'pending' | 'succeeded' | 'failed';
  workflow_status: 'submitted' | 'in_review' | 'designer_assigned' | 'proofs_ready' | 'client_review' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  assigned_designer_id?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimated_completion_date?: string;
  actual_completion_date?: string;
  rejection_reason?: string;
  client_notes?: string;
  designer_notes?: string;
  created_at: string;
  updated_at: string;
  designer?: {
    id: string;
    full_name: string;
    email: string;
  };
  service?: {
    id: string;
    name: string;
    description: string;
    base_price: number;
    turnaround_days: number;
  };
}

export interface CustomAdProof {
  id: string;
  order_id: string;
  designer_id: string;
  version_number: number;
  title: string;
  description?: string;
  files: UploadedFileSummary[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'revision_requested';
  client_feedback?: string;
  designer_notes?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  reviewed_at?: string;
  designer?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface CustomAdNotification {
  id: string;
  order_id: string;
  recipient_id: string;
  notification_type: 'order_submitted' | 'designer_assigned' | 'proofs_ready' | 'proof_approved' | 'proof_rejected' | 'revision_requested' | 'order_completed' | 'order_cancelled';
  title: string;
  message: string;
  is_read: boolean;
  email_sent: boolean;
  created_at: string;
  read_at?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'current' | 'completed' | 'skipped';
  completed_at?: string;
}

export class CustomAdsService {
  static async uploadFiles(userId: string, files: File[]): Promise<UploadedFileSummary[]> {
    if (!files || files.length === 0) return [];
    const uploaded: UploadedFileSummary[] = [];
    for (const file of files) {
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
      const { error } = await supabase.storage.from('custom-ad-uploads').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data: pubUrl } = supabase.storage.from('custom-ad-uploads').getPublicUrl(path);
      uploaded.push({ name: file.name, url: pubUrl.publicUrl, size: file.size, type: file.type });
    }
    return uploaded;
  }

  static async createOrder(input: CustomAdOrderInput): Promise<string> {
    const uploaded = await this.uploadFiles(input.userId, input.files);
    const payload: Inserts<'custom_ad_orders'> = {
      user_id: input.userId,
      service_key: input.serviceKey,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone,
      address: input.address,
      details: input.details,
      files: uploaded,
      total_amount: Number(input.totalAmount.toFixed(2)),
      payment_status: 'succeeded',
    };

    const { data, error } = await supabase
      .from('custom_ad_orders')
      .insert(payload)
      .select('id')
      .single();

    if (error) throw error;

    // Send email notification for order submitted
    try {
      const order = await this.getOrder(data.id as string);
      if (order) {
        await CustomAdEmailService.sendOrderSubmittedNotification(order);
      }
    } catch (emailError) {
      console.error('Error sending order submitted email:', emailError);
      // Don't throw error - order creation should succeed even if email fails
    }

    return data.id as string;
  }

  // Get orders for a user (client view)
  static async getUserOrders(userId: string): Promise<CustomAdOrder[]> {
    const { data, error } = await supabase
      .from('custom_ad_orders')
      .select(`
        *,
        designer:profiles!custom_ad_orders_assigned_designer_id_fkey(id, full_name, email)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get order details
  static async getOrder(orderId: string): Promise<CustomAdOrder | null> {
    const { data, error } = await supabase
      .from('custom_ad_orders')
      .select(`
        *,
        designer:profiles!custom_ad_orders_assigned_designer_id_fkey(id, full_name, email)
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  }

  // Get proofs for an order
  static async getOrderProofs(orderId: string): Promise<CustomAdProof[]> {
    const { data, error } = await supabase
      .from('custom_ad_proofs')
      .select(`
        *,
        designer:profiles!custom_ad_proofs_designer_id_fkey(id, full_name, email)
      `)
      .eq('order_id', orderId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get single proof by ID
  static async getProof(proofId: string): Promise<CustomAdProof | null> {
    const { data, error } = await supabase
      .from('custom_ad_proofs')
      .select(`
        *,
        designer:profiles!custom_ad_proofs_designer_id_fkey(id, full_name, email)
      `)
      .eq('id', proofId)
      .single();

    if (error) throw error;
    return data;
  }

  // Update order payment status
  static async updateOrderPaymentStatus(orderId: string, paymentStatus: 'pending' | 'succeeded' | 'failed'): Promise<void> {
    const { error } = await supabase
      .from('custom_ad_orders')
      .update({ 
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) throw error;
  }

  // Submit proof for review
  static async submitProof(proofId: string, designerNotes?: string): Promise<void> {
    const { error } = await supabase
      .from('custom_ad_proofs')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        designer_notes: designerNotes,
      })
      .eq('id', proofId);

    if (error) throw error;

    // Update order status to proofs_ready
    const { data: proof } = await supabase
      .from('custom_ad_proofs')
      .select('order_id')
      .eq('id', proofId)
      .single();

    if (proof) {
      await supabase
        .from('custom_ad_orders')
        .update({ workflow_status: 'proofs_ready' })
        .eq('id', proof.order_id);

      // Send email notification for proofs ready
      try {
        const order = await this.getOrder(proof.order_id);
        const fullProof = await this.getProof(proofId);
        if (order && fullProof) {
          await CustomAdEmailService.sendProofsReadyNotification(order, fullProof);
        }
      } catch (emailError) {
        console.error('Error sending proofs ready email:', emailError);
        // Don't throw error - proof submission should succeed even if email fails
      }
    }
  }

  // Approve proof
  static async approveProof(proofId: string, clientFeedback?: string): Promise<void> {
    const { error } = await supabase
      .from('custom_ad_proofs')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        client_feedback: clientFeedback,
      })
      .eq('id', proofId);

    if (error) throw error;

    // Update order status to approved
    const { data: proof } = await supabase
      .from('custom_ad_proofs')
      .select('order_id')
      .eq('id', proofId)
      .single();

    if (proof) {
      await supabase
        .from('custom_ad_orders')
        .update({ workflow_status: 'approved' })
        .eq('id', proof.order_id);

      // Send email notification for proof approved
      try {
        const order = await this.getOrder(proof.order_id);
        const fullProof = await this.getProof(proofId);
        if (order && fullProof) {
          await CustomAdEmailService.sendProofApprovedNotification(order, fullProof);
        }
      } catch (emailError) {
        console.error('Error sending proof approved email:', emailError);
        // Don't throw error - proof approval should succeed even if email fails
      }
    }
  }

  // Reject proof
  static async rejectProof(proofId: string, clientFeedback: string): Promise<void> {
    const { error } = await supabase
      .from('custom_ad_proofs')
      .update({
        status: 'revision_requested',
        reviewed_at: new Date().toISOString(),
        client_feedback: clientFeedback,
      })
      .eq('id', proofId);

    if (error) throw error;

    // Update order status to client_review
    const { data: proof } = await supabase
      .from('custom_ad_proofs')
      .select('order_id')
      .eq('id', proofId)
      .single();

    if (proof) {
      await supabase
        .from('custom_ad_orders')
        .update({ 
          workflow_status: 'client_review',
          rejection_reason: clientFeedback 
        })
        .eq('id', proof.order_id);

      // Send email notification for proof rejected
      try {
        const order = await this.getOrder(proof.order_id);
        const fullProof = await this.getProof(proofId);
        if (order && fullProof) {
          await CustomAdEmailService.sendProofRejectedNotification(order, fullProof);
        }
      } catch (emailError) {
        console.error('Error sending proof rejected email:', emailError);
        // Don't throw error - proof rejection should succeed even if email fails
      }
    }
  }

  // Create new proof version
  static async createProof(
    orderId: string,
    designerId: string,
    title: string,
    description: string,
    files: UploadedFileSummary[]
  ): Promise<string> {
    // Get next version number
    const { data: existingProofs } = await supabase
      .from('custom_ad_proofs')
      .select('version_number')
      .eq('order_id', orderId)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = existingProofs && existingProofs.length > 0 
      ? existingProofs[0].version_number + 1 
      : 1;

    const { data, error } = await supabase
      .from('custom_ad_proofs')
      .insert({
        order_id: orderId,
        designer_id: designerId,
        version_number: nextVersion,
        title,
        description,
        files,
        status: 'draft',
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  // Get user notifications
  static async getUserNotifications(userId: string): Promise<CustomAdNotification[]> {
    const { data, error } = await supabase
      .from('custom_ad_notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Mark notification as read
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('custom_ad_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) throw error;
  }

  // Get workflow steps for an order
  static getWorkflowSteps(order: CustomAdOrder): WorkflowStep[] {
    const steps: WorkflowStep[] = [
      {
        id: 'submitted',
        name: 'Order Submitted',
        description: 'Your order has been received and is being reviewed',
        status: order.workflow_status === 'submitted' ? 'current' : 
                ['in_review', 'designer_assigned', 'proofs_ready', 'client_review', 'approved', 'rejected', 'completed'].includes(order.workflow_status) ? 'completed' : 'pending',
        completed_at: order.workflow_status === 'submitted' ? order.created_at : undefined,
      },
      {
        id: 'in_review',
        name: 'In Review',
        description: 'Your order is being reviewed by our team',
        status: order.workflow_status === 'in_review' ? 'current' :
                ['designer_assigned', 'proofs_ready', 'client_review', 'approved', 'rejected', 'completed'].includes(order.workflow_status) ? 'completed' : 'pending',
      },
      {
        id: 'designer_assigned',
        name: 'Designer Assigned',
        description: order.assigned_designer_id ? `Designer assigned: ${order.designer?.full_name || 'TBD'}` : 'Waiting for designer assignment',
        status: order.workflow_status === 'designer_assigned' ? 'current' :
                ['proofs_ready', 'client_review', 'approved', 'rejected', 'completed'].includes(order.workflow_status) ? 'completed' : 'pending',
      },
      {
        id: 'proofs_ready',
        name: 'Design Proofs Ready',
        description: 'Design proofs are ready for your review',
        status: order.workflow_status === 'proofs_ready' ? 'current' :
                ['client_review', 'approved', 'rejected', 'completed'].includes(order.workflow_status) ? 'completed' : 'pending',
      },
      {
        id: 'client_review',
        name: 'Under Review',
        description: 'Please review the design proofs and provide feedback',
        status: order.workflow_status === 'client_review' ? 'current' :
                ['approved', 'rejected', 'completed'].includes(order.workflow_status) ? 'completed' : 'pending',
      },
      {
        id: 'approved',
        name: 'Approved',
        description: 'Your design has been approved and is being finalized',
        status: order.workflow_status === 'approved' ? 'current' :
                order.workflow_status === 'completed' ? 'completed' : 'pending',
      },
      {
        id: 'completed',
        name: 'Completed',
        description: 'Your custom ad is ready for use',
        status: order.workflow_status === 'completed' ? 'completed' : 'pending',
        completed_at: order.actual_completion_date,
      },
    ];

    return steps;
  }

  // Admin functions
  static async getAllOrders(): Promise<CustomAdOrder[]> {
    const { data, error } = await supabase
      .from('custom_ad_orders')
      .select(`
        *,
        designer:profiles!custom_ad_orders_assigned_designer_id_fkey(id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async assignDesigner(orderId: string, designerId: string): Promise<void> {
    const { error } = await supabase
      .from('custom_ad_orders')
      .update({
        assigned_designer_id: designerId,
        workflow_status: 'designer_assigned',
      })
      .eq('id', orderId);

    if (error) throw error;

    // Send email notification for designer assigned
    try {
      const order = await this.getOrder(orderId);
      if (order) {
        await CustomAdEmailService.sendDesignerAssignedNotification(order);
      }
    } catch (emailError) {
      console.error('Error sending designer assigned email:', emailError);
      // Don't throw error - designer assignment should succeed even if email fails
    }
  }

  static async updateOrderStatus(orderId: string, status: CustomAdOrder['workflow_status'], notes?: string): Promise<void> {
    const updateData: any = { workflow_status: status };
    
    if (notes) {
      updateData.designer_notes = notes;
    }

    if (status === 'completed') {
      updateData.actual_completion_date = new Date().toISOString();
    }

    const { error } = await supabase
      .from('custom_ad_orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) throw error;

    // Send email notifications based on status change
    try {
      const order = await this.getOrder(orderId);
      if (order) {
        switch (status) {
          case 'approved':
            await CustomAdEmailService.sendOrderApprovedNotification(order);
            break;
          case 'rejected':
            await CustomAdEmailService.sendOrderRejectedNotification(order);
            break;
          case 'completed':
            await CustomAdEmailService.sendOrderCompletedNotification(order);
            break;
        }
      }
    } catch (emailError) {
      console.error('Error sending status change email:', emailError);
      // Don't throw error - status update should succeed even if email fails
    }
  }
}


