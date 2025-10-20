import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/database';

export type CustomAdOrder = Database['public']['Tables']['custom_ad_orders']['Row'] & {
  user?: { id: string; full_name: string; email: string; company_name?: string } | null;
  designer?: { id: string; full_name: string; email: string } | null;
  service?: { id: string; name: string; description: string; base_price: number; turnaround_days: number } | null;
};

export class DesignerService {
  static async getMyOrders(designerId: string): Promise<CustomAdOrder[]> {
    const { data, error } = await supabase
      .from('custom_ad_orders')
      .select(`*`)
      .eq('assigned_designer_id', designerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as any) || [];
  }

  static async getUnassignedOrders(): Promise<CustomAdOrder[]> {
    const { data, error } = await supabase
      .from('custom_ad_orders')
      .select(`*`)
      .is('assigned_designer_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as any) || [];
  }

  static async takeOrder(orderId: string, designerId: string): Promise<void> {
    const { error } = await supabase
      .from('custom_ad_orders')
      .update({ assigned_designer_id: designerId, workflow_status: 'designer_assigned', updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) throw error;
  }

  static async getOrderWithDetails(orderId: string): Promise<{
    order: CustomAdOrder | null;
    comments: Array<{ id: string; order_id: string; user_id: string; content: string; created_at: string }>;
    proofs: Array<{ id: string; order_id: string; files: Array<{ name: string; url: string; size: number; type: string }>; status: string; created_at: string; version_number: number; title: string }>;
  }> {
    const [orderRes, commentsRes, proofsRes] = await Promise.all([
      supabase
        .from('custom_ad_orders')
        .select(`
          *,
          user:profiles!custom_ad_orders_user_id_fkey(id, full_name, email, company_name)
        `)
        .eq('id', orderId)
        .single(),
      supabase
        .from('custom_ad_order_comments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true }),
      supabase
        .from('custom_ad_proofs')
        .select('id, order_id, files, status, created_at, version_number, title')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
    ]);

    if (orderRes.error) throw orderRes.error;
    if (commentsRes.error) throw commentsRes.error;
    if (proofsRes.error) throw proofsRes.error;

    return {
      order: (orderRes.data as any) || null,
      comments: commentsRes.data || [],
      proofs: proofsRes.data || []
    };
  }

  static async getDashboardStats(designerId: string): Promise<{
    totalAssigned: number;
    pendingReviews: number;
    approvedThisMonth: number;
    revisionRequests: number;
  }> {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [assignedRes, pendingOrdersRes, approvedOrdersRes, revisionProofsRes] = await Promise.all([
      supabase
        .from('custom_ad_orders')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_designer_id', designerId),
      supabase
        .from('custom_ad_orders')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_designer_id', designerId)
        .in('workflow_status', ['proofs_ready', 'client_review']),
      supabase
        .from('custom_ad_orders')
        .select('id, updated_at')
        .eq('assigned_designer_id', designerId)
        .eq('workflow_status', 'approved')
        .gte('updated_at', startOfMonth),
      supabase
        .from('custom_ad_proofs')
        .select('id', { count: 'exact', head: true })
        .eq('designer_id', designerId)
        .eq('status', 'revision_requested')
    ] as any);

    const totalAssigned = assignedRes?.count || 0;
    const pendingReviews = pendingOrdersRes?.count || 0;
    const approvedThisMonth = Array.isArray(approvedOrdersRes?.data) ? approvedOrdersRes.data.length : 0;
    const revisionRequests = revisionProofsRes?.count || 0;

    return { totalAssigned, pendingReviews, approvedThisMonth, revisionRequests };
  }

  static async getRecentActivity(designerId: string): Promise<{
    recentOrders: CustomAdOrder[];
    recentProofs: Array<{ id: string; order_id: string; status: string; created_at: string; version_number: number; title: string; }>;
  }> {
    const [ordersRes, proofsRes] = await Promise.all([
      supabase
        .from('custom_ad_orders')
        .select(`*`)
        .eq('assigned_designer_id', designerId)
        .order('updated_at', { ascending: false })
        .limit(5),
      supabase
        .from('custom_ad_proofs')
        .select('id, order_id, status, created_at, version_number, title')
        .eq('designer_id', designerId)
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    if (ordersRes.error) throw ordersRes.error;
    if (proofsRes.error) throw proofsRes.error;

    return {
      recentOrders: (ordersRes.data as any) || [],
      recentProofs: proofsRes.data || []
    };
  }

  // Add comment to custom ad order
  static async addComment(orderId: string, content: string, designerId: string): Promise<void> {
    try {
      // Get designer profile for author name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', designerId)
        .single();

      const { error } = await supabase
        .from('custom_ad_order_comments')
        .insert({
          order_id: orderId,
          content,
          author: profile?.full_name || 'Designer',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Send email notification to client/host
      try {
        console.log('📧 Attempting to send client notification...');
        console.log('📧 Designer name:', profile?.full_name);
        
        const { CustomAdEmailService } = await import('./customAdEmailService');
        
        console.log('📧 Calling sendClientMessageNotification with:', {
          orderId,
          content: content.substring(0, 50) + '...',
          designerName: profile?.full_name || 'Designer'
        });
        
        await CustomAdEmailService.sendClientMessageNotification(
          orderId, 
          content, 
          profile?.full_name || 'Designer'
        );
        
        console.log('📧 Client notification call completed');
        
        // Process email queue immediately to ensure emails are sent
        console.log('📧 Processing email queue immediately...');
        try {
          const { data: queueResult, error: processError } = await supabase.functions.invoke('email-queue-processor');
          if (processError) {
            console.error('❌ Error processing email queue:', processError);
          } else {
            console.log('✅ Email queue processed successfully:', queueResult);
          }
        } catch (queueError) {
          console.error('❌ Error invoking email queue processor:', queueError);
        }
      } catch (emailError) {
        console.error('❌ Error sending client notification:', emailError);
        // Don't throw error - comment should succeed even if email fails
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }
}


