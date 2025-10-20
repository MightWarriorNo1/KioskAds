// Test utility for proof email notifications
// This can be used to test if the email notification system is working correctly

import { CustomAdsService } from '../services/customAdsService';
import { CustomAdEmailService } from '../services/customAdEmailService';

export class ProofEmailTestUtil {
  // Test the email notification system by simulating a proof submission
  static async testProofEmailNotifications(orderId: string, proofId: string): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log('🧪 Testing proof email notifications...');
      console.log('🧪 Order ID:', orderId);
      console.log('🧪 Proof ID:', proofId);

      // Get the order and proof data
      const order = await CustomAdsService.getOrder(orderId);
      const proof = await CustomAdsService.getProof(proofId);

      if (!order) {
        return {
          success: false,
          message: 'Order not found',
          details: { orderId }
        };
      }

      if (!proof) {
        return {
          success: false,
          message: 'Proof not found',
          details: { proofId }
        };
      }

      console.log('🧪 Order data:', {
        id: order.id,
        user_id: order.user_id,
        assigned_designer_id: order.assigned_designer_id,
        service_key: order.service_key
      });

      console.log('🧪 Proof data:', {
        id: proof.id,
        designer_id: proof.designer_id,
        version_number: proof.version_number
      });

      // Test sending proof submitted notification
      console.log('🧪 Testing proof submitted notification...');
      await CustomAdEmailService.sendProofSubmittedNotification(order, proof);
      console.log('✅ Proof submitted notification test completed');

      // Test sending proofs ready notification
      console.log('🧪 Testing proofs ready notification...');
      await CustomAdEmailService.sendProofsReadyNotification(order, proof);
      console.log('✅ Proofs ready notification test completed');

      return {
        success: true,
        message: 'Email notification tests completed successfully',
        details: {
          orderId,
          proofId,
          clientEmail: order.user?.email,
          designerEmail: order.designer?.email
        }
      };

    } catch (error) {
      console.error('❌ Error testing proof email notifications:', error);
      return {
        success: false,
        message: 'Error testing email notifications',
        details: { error: error.message }
      };
    }
  }

  // Test the email queue processor
  static async testEmailQueueProcessor(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log('🧪 Testing email queue processor...');
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      const { data: queueResult, error: processError } = await supabase.functions.invoke('email-queue-processor');
      
      if (processError) {
        return {
          success: false,
          message: 'Error invoking email queue processor',
          details: { error: processError }
        };
      }

      return {
        success: true,
        message: 'Email queue processor test completed',
        details: queueResult
      };

    } catch (error) {
      console.error('❌ Error testing email queue processor:', error);
      return {
        success: false,
        message: 'Error testing email queue processor',
        details: { error: error.message }
      };
    }
  }
}
