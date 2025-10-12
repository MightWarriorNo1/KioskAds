import { supabase } from '../lib/supabaseClient';
import { getCurrentCaliforniaTime } from '../utils/dateUtils';
import type { Inserts } from '../types/database';
import { CustomAdEmailService } from './customAdEmailService';
import { AdminNotificationService } from './adminNotificationService';

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
  user?: {
    id: string;
    full_name: string;
    email: string;
    company_name?: string;
  };
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
  comments?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
  }>;
  proofs?: CustomAdProof[];
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
  // Generate a hash for file uniqueness
  private static async generateFileHash(file: File): Promise<string> {
    try {
      // Check if file is a valid File object
      if (!file || typeof file.arrayBuffer !== 'function') {
        console.error('Invalid file object:', file);
        // Fallback to using file name and size for uniqueness
        return `${file?.name || 'unknown'}-${file?.size || 0}`.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
      }

      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8);
    } catch (error) {
      console.error('Error generating file hash:', error);
      // Fallback to using file name and size for uniqueness
      return `${file?.name || 'unknown'}-${file?.size || 0}`.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
    }
  }

  // Validate file before upload
  private static validateFile(file: File): boolean {
    // Check file size (minimum 1KB, maximum 100MB)
    if (file.size < 1024) {
      console.error(`File too small: ${file.name} (${file.size} bytes)`);
      return false;
    }
    if (file.size > 100 * 1024 * 1024) {
      console.error(`File too large: ${file.name} (${file.size} bytes)`);
      return false;
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      console.error(`Invalid file type: ${file.name} (${file.type})`);
      return false;
    }

    // Check file name
    if (!file.name || file.name.trim().length === 0) {
      console.error(`Invalid file name: ${file.name}`);
      return false;
    }

    return true;
  }

  static async uploadFiles(userId: string, files: File[]): Promise<UploadedFileSummary[]> {
    if (!files || files.length === 0) return [];
    
    const uploaded: UploadedFileSummary[] = [];
    const processedFiles = new Set<string>(); // Track processed files in this session
    
    for (const file of files) {
      // Validate that file is a proper File object
      if (!file || !(file instanceof File)) {
        console.error('Invalid file object:', file);
        continue;
      }

      // Create a unique key for this file in this session
      const fileKey = `${file.name}-${file.size}-${file.type}`;
      
      // Skip if we've already processed this file in this session
      if (processedFiles.has(fileKey)) {
        console.log(`File already processed in this session: ${file.name}, skipping`);
        continue;
      }
      processedFiles.add(fileKey);

      // Validate file before upload
      if (!this.validateFile(file)) {
        console.error(`Invalid file: ${file.name}, skipping`);
        continue;
      }

      try {
        // Generate unique filename with better uniqueness
        const fileExt = file.name.split('.').pop();
        const timestamp = getCurrentCaliforniaTime().getTime();
        const randomId = Math.random().toString(36).slice(2, 9);
        const fileHash = await this.generateFileHash(file);
        const path = `${userId}/${timestamp}-${randomId}-${fileHash}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('custom-ad-uploads')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          console.error(`Storage upload error for file: ${file.name}`, uploadError);
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }

        // Get public URL
        const { data: pubUrl } = supabase.storage
          .from('custom-ad-uploads')
          .getPublicUrl(path);

        // Verify the uploaded file is accessible
        try {
          const response = await fetch(pubUrl.publicUrl, { method: 'HEAD' });
          if (!response.ok) {
            throw new Error(`Uploaded file is not accessible: ${response.status}`);
          }
        } catch (urlError) {
          console.error(`URL verification failed for ${file.name}:`, urlError);
          // Clean up the uploaded file
          await supabase.storage.from('custom-ad-uploads').remove([path]);
          throw new Error(`Uploaded file is not accessible: ${urlError}`);
        }

        uploaded.push({ 
          name: file.name, 
          url: pubUrl.publicUrl, 
          size: file.size, 
          type: file.type 
        });
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to upload ${file.name}: ${errorMessage}`);
      }
    }
    return uploaded;
  }

  static async createOrder(input: CustomAdOrderInput): Promise<string> {
    try {
      // Validate input files
      if (!input.files || !Array.isArray(input.files) || input.files.length === 0) {
        throw new Error('No files provided for upload');
      }

      // Validate that all files are proper File objects
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        if (!file || !(file instanceof File)) {
          throw new Error(`Invalid file at index ${i}: not a proper File object`);
        }
      }

      // Upload files with validation
      const uploaded = await this.uploadFiles(input.userId, input.files);
      
      // Validate that all files were uploaded successfully
      if (uploaded.length !== input.files.length) {
        throw new Error(`Only ${uploaded.length} out of ${input.files.length} files were uploaded successfully`);
      }

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

      if (error) {
        // If database insert fails, clean up uploaded files
        for (const file of uploaded) {
          try {
            const fileName = file.url.split('/').pop();
            if (fileName) {
              await supabase.storage.from('custom-ad-uploads').remove([`${input.userId}/${fileName}`]);
            }
          } catch (cleanupError) {
            console.error('Error cleaning up file:', cleanupError);
          }
        }
        throw error;
      }

      // Create payment record in payment_history table for recent sales display
      try {
        const { BillingService } = await import('./billingService');
        await BillingService.createPaymentRecord({
          user_id: input.userId,
          custom_ad_order_id: data.id as string,
          payment_type: 'custom_ad',
          amount: input.totalAmount,
          status: 'succeeded',
          description: `Custom Ad Order: ${input.serviceKey}`
        });
      } catch (paymentRecordError) {
        console.error('Error creating payment record:', paymentRecordError);
        // Don't throw error - order creation should succeed even if payment record fails
      }

      // Send email notifications for order submitted and purchased
      try {
        const order = await this.getOrder(data.id as string);
        if (order) {
          // Send order submitted notification (internal workflow)
          await CustomAdEmailService.sendOrderSubmittedNotification(order);
          // Send order purchased notification (client confirmation)
          await CustomAdEmailService.sendOrderPurchasedNotification(order);

          // Send admin notification
          const { data: user } = await supabase
            .from('profiles')
            .select('email, full_name, role')
            .eq('id', input.userId)
            .single();

          if (user) {
            // Get service name for admin notification
            const { data: service } = await supabase
              .from('custom_ad_services')
              .select('name')
              .eq('service_key', input.serviceKey)
              .single();

            await AdminNotificationService.sendCustomAdPurchasedNotification({
              type: 'custom_ad_purchased',
              user_id: input.userId,
              user_name: user.full_name,
              user_email: user.email,
              user_role: user.role as 'client' | 'host',
              order_id: data.id as string,
              service_name: service?.name || input.serviceKey,
              total_amount: input.totalAmount,
              created_at: new Date().toISOString()
            });
          }
        }
      } catch (emailError) {
        console.error('Error sending order notifications:', emailError);
        // Don't throw error - order creation should succeed even if email fails
      }

      return data.id as string;
    } catch (error) {
      console.error('Error creating custom ad order:', error);
      throw error;
    }
  }

  // Get orders for a user (client view)
  static async getUserOrders(userId: string): Promise<CustomAdOrder[]> {
    const { data, error } = await supabase
      .from('custom_ad_orders')
      .select(`
        *,
        user:profiles!custom_ad_orders_user_id_fkey(id, full_name, email, company_name),
        designer:profiles!custom_ad_orders_assigned_designer_id_fkey(id, full_name, email)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    console.log('Raw data from database:', data);
    
    // Get comments and proofs for each order
    const ordersWithDetails = await Promise.all(
      (data || []).map(async (order) => {
        console.log('Processing order:', order.id, 'files:', order.files);
        const [commentsRes, proofsRes] = await Promise.all([
          supabase
            .from('custom_ad_order_comments')
            .select('*')
            .eq('order_id', order.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('custom_ad_proofs')
            .select(`
              *,
              designer:profiles!custom_ad_proofs_designer_id_fkey(id, full_name, email)
            `)
            .eq('order_id', order.id)
            .order('version_number', { ascending: false })
        ]);
        
        return {
          ...order,
          comments: commentsRes.data || [],
          proofs: proofsRes.data || [],
          files: order.files || []
        };
      })
    );

    console.log('Final orders with comments and proofs:', ordersWithDetails);
    return ordersWithDetails;
  }

  // Get order details
  static async getOrder(orderId: string): Promise<CustomAdOrder | null> {
    const { data, error } = await supabase
      .from('custom_ad_orders')
      .select(`
        *,
        user:profiles!custom_ad_orders_user_id_fkey(id, full_name, email, company_name),
        designer:profiles!custom_ad_orders_assigned_designer_id_fkey(id, full_name, email)
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;
    
    // Get comments for the order
    const { data: comments } = await supabase
      .from('custom_ad_order_comments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    
    return {
      ...data,
      comments: comments || [],
      files: data.files || []
    };
  }

  // Add comment to custom ad order (for clients/hosts)
  static async addComment(
    orderId: string, 
    content: string, 
    userId: string, 
    commentType?: string,
    attachedFiles?: Array<{ name: string; url: string; size: number; type: string }>
  ): Promise<void> {
    try {
      // Get user profile for author name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      const { error } = await supabase
        .from('custom_ad_order_comments')
        .insert({
          order_id: orderId,
          content,
          author: profile?.full_name || 'Client',
          created_at: getCurrentCaliforniaTime().toISOString(),
          comment_type: commentType,
          attached_files: attachedFiles || null
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
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

  // Get approved custom ad media files for a user
  static async getUserApprovedCustomAdMedia(userId: string): Promise<any[]> {
    try {
      // Get all custom ad orders for the user
      const { data: orders, error: ordersError } = await supabase
        .from('custom_ad_orders')
        .select('id, workflow_status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        return [];
      }

      // Get all proofs for these orders
      const orderIds = orders.map(order => order.id);
      const { data: allProofs, error: allProofsError } = await supabase
        .from('custom_ad_proofs')
        .select('id, order_id, files, title, created_at, version_number, status')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false });

      if (allProofsError) throw allProofsError;

      if (!allProofs || allProofs.length === 0) {
        return [];
      }

      // Filter for approved proofs first, then fallback to any proofs with files
      let proofs = allProofs.filter(proof => proof.status === 'approved');
      
      // If no approved proofs, get any proofs with files
      if (proofs.length === 0) {
        proofs = allProofs.filter(proof => 
          proof.files && Array.isArray(proof.files) && proof.files.length > 0
        );
      }

      if (proofs.length === 0) {
        return [];
      }

      // Flatten and format the media files
      const mediaFiles: any[] = [];
      
      proofs.forEach(proof => {
        if (proof.files && Array.isArray(proof.files)) {
          proof.files.forEach((file: any, index: number) => {
            mediaFiles.push({
              id: `${proof.id}_${index}`,
              orderId: proof.order_id,
              proofId: proof.id,
              title: proof.title || `Custom Ad - Version ${proof.version_number}`,
              fileName: file.name || file.url?.split('/').pop() || 'Unknown',
              url: file.url,
              size: file.size || 0,
              type: file.type || 'image',
              createdAt: proof.created_at,
              versionNumber: proof.version_number
            });
          });
        }
      });

      return mediaFiles;
    } catch (error) {
      console.error('Error fetching approved custom ad media:', error);
      throw error;
    }
  }

  // Update order payment status
  static async updateOrderPaymentStatus(orderId: string, paymentStatus: 'pending' | 'succeeded' | 'failed'): Promise<void> {
    const { error } = await supabase
      .from('custom_ad_orders')
      .update({ 
        payment_status: paymentStatus,
        updated_at: getCurrentCaliforniaTime().toISOString()
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
        submitted_at: getCurrentCaliforniaTime().toISOString(),
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

      // Send email notifications for proof submitted and proofs ready
      try {
        const order = await this.getOrder(proof.order_id);
        const fullProof = await this.getProof(proofId);
        if (order && fullProof) {
          // Send proof submitted notification (designer to client)
          await CustomAdEmailService.sendProofSubmittedNotification(order, fullProof);
          // Send proofs ready notification (client review)
          await CustomAdEmailService.sendProofsReadyNotification(order, fullProof);
        }
      } catch (emailError) {
        console.error('Error sending proof notifications:', emailError);
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
        reviewed_at: getCurrentCaliforniaTime().toISOString(),
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
        reviewed_at: getCurrentCaliforniaTime().toISOString(),
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
        read_at: getCurrentCaliforniaTime().toISOString(),
      })
      .eq('id', notificationId);

    if (error) throw error;
  }

  // Approve order (client function)
  static async approveOrder(orderId: string, clientFeedback?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('custom_ad_orders')
        .update({
          workflow_status: 'approved',
          client_notes: clientFeedback,
          updated_at: getCurrentCaliforniaTime().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Add comment if feedback provided
      if (clientFeedback) {
        await this.addComment(orderId, clientFeedback, 'system', 'approval');
      }

      // Send email notification for order approved
      try {
        const order = await this.getOrder(orderId);
        if (order) {
          await CustomAdEmailService.sendOrderApprovedNotification(order);
        }
      } catch (emailError) {
        console.error('Error sending order approved email:', emailError);
        // Don't throw error - order approval should succeed even if email fails
      }
    } catch (error) {
      console.error('Error approving order:', error);
      throw error;
    }
  }

  // Request changes for order (client function)
  static async requestChanges(orderId: string, changeRequest: string, attachedFiles?: File[]): Promise<void> {
    try {
      const uploadedFiles: Array<{ name: string; url: string; size: number; type: string }> = [];

      // Upload attached files if provided
      if (attachedFiles && attachedFiles.length > 0) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          for (const file of attachedFiles) {
            const path = `${user.id}/${orderId}/change-request/${getCurrentCaliforniaTime().getTime()}-${Math.random().toString(36).slice(2)}-${file.name}`;
            const { error: uploadError } = await supabase.storage
              .from('custom-ad-uploads')
              .upload(path, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type,
              });
            if (uploadError) throw uploadError;
            const { data: pubUrl } = supabase.storage
              .from('custom-ad-uploads')
              .getPublicUrl(path);
            uploadedFiles.push({ name: file.name, url: pubUrl.publicUrl, size: file.size, type: file.type });
          }
        } catch (uploadError) {
          console.error('Error uploading change request files:', uploadError);
          throw new Error('Failed to upload attached files');
        }
      }

      const { error } = await supabase
        .from('custom_ad_orders')
        .update({
          workflow_status: 'designer_assigned', // Move back to designer for changes
          client_notes: changeRequest,
          updated_at: getCurrentCaliforniaTime().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Add comment for change request with file attachments
      const commentContent = uploadedFiles.length > 0 
        ? `${changeRequest}\n\nAttached files: ${uploadedFiles.map(f => f.name).join(', ')}`
        : changeRequest;
      
      await this.addComment(orderId, commentContent, 'system', 'revision_requested', uploadedFiles);

      // Send email notification for change request
      try {
        const order = await this.getOrder(orderId);
        if (order) {
          await CustomAdEmailService.sendRevisionRequestedNotification(order);
        }
      } catch (emailError) {
        console.error('Error sending revision requested email:', emailError);
        // Don't throw error - change request should succeed even if email fails
      }
    } catch (error) {
      console.error('Error requesting changes:', error);
      throw error;
    }
  }

  // Clean up corrupted files from custom ad orders (admin function)
  static async cleanupCorruptedFiles(): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    try {
      const errors: string[] = [];
      let cleaned = 0;

      // Get all custom ad orders with files
      const { data: orders, error: ordersError } = await supabase
        .from('custom_ad_orders')
        .select('id, files')
        .not('files', 'is', null);

      if (ordersError) {
        throw new Error(`Failed to get custom ad orders: ${ordersError.message}`);
      }

      if (!orders || orders.length === 0) {
        return { cleaned: 0, errors: [] };
      }

      for (const order of orders) {
        if (!order.files || !Array.isArray(order.files)) continue;

        const validFiles = [];
        const filesToRemove = [];

        for (const file of order.files) {
          try {
            // Check if file is accessible and valid
            const response = await fetch(file.url, { method: 'HEAD' });
            if (response.ok) {
              // Check content type and size
              const contentType = response.headers.get('content-type');
              const contentLength = response.headers.get('content-length');
              
              // Skip files that are too small (likely corrupted)
              if (contentLength && parseInt(contentLength) < 1024) {
                console.log(`Skipping corrupted file: ${file.name} (${contentLength} bytes)`);
                filesToRemove.push(file);
                continue;
              }

              // Skip files with invalid content types
              if (contentType && contentType.includes('application/json')) {
                console.log(`Skipping JSON file: ${file.name} (${contentType})`);
                filesToRemove.push(file);
                continue;
              }

              validFiles.push(file);
            } else {
              console.log(`Skipping inaccessible file: ${file.name}`);
              filesToRemove.push(file);
            }
          } catch (error) {
            console.log(`Skipping file with error: ${file.name}`, error);
            filesToRemove.push(file);
          }
        }

        // Update order if files were removed
        if (filesToRemove.length > 0) {
          try {
            await supabase
              .from('custom_ad_orders')
              .update({ files: validFiles })
              .eq('id', order.id);

            // Remove files from storage
            for (const file of filesToRemove) {
              try {
                const fileName = file.url.split('/').pop();
                if (fileName) {
                  await supabase.storage.from('custom-ad-uploads').remove([fileName]);
                }
              } catch (removeError) {
                console.error(`Error removing file ${file.name}:`, removeError);
              }
            }

            cleaned += filesToRemove.length;
          } catch (updateError) {
            errors.push(`Failed to update order ${order.id}: ${updateError}`);
          }
        }
      }

      return { cleaned, errors };
    } catch (error) {
      console.error('Error cleaning up corrupted files:', error);
      throw error;
    }
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
    const updateData: Record<string, string> = { workflow_status: status };
    
    if (notes) {
      updateData.designer_notes = notes;
    }

    if (status === 'completed') {
      updateData.actual_completion_date = getCurrentCaliforniaTime().toISOString();
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


