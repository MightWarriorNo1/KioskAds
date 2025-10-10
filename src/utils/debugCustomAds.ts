import { supabase } from '../lib/supabaseClient';

export async function debugCustomAds(userId: string) {
  console.log('=== DEBUGGING CUSTOM ADS ===');
  console.log('User ID:', userId);
  
  try {
    // Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Current auth user:', user?.id, userError);
    
    // Check if user has any orders
    const { data: orders, error: ordersError } = await supabase
      .from('custom_ad_orders')
      .select('*')
      .eq('user_id', userId);
    
    console.log('Orders query result:', { orders, ordersError });
    
    if (orders && orders.length > 0) {
      const orderIds = orders.map(order => order.id);
      console.log('Order IDs:', orderIds);
      
      // Check all proofs for these orders
      const { data: proofs, error: proofsError } = await supabase
        .from('custom_ad_proofs')
        .select('*')
        .in('order_id', orderIds);
      
      console.log('Proofs query result:', { proofs, proofsError });
      
      if (proofs && proofs.length > 0) {
        proofs.forEach(proof => {
          console.log(`Proof ${proof.id}:`, {
            status: proof.status,
            files: proof.files,
            hasFiles: proof.files && Array.isArray(proof.files) && proof.files.length > 0,
            orderId: proof.order_id
          });
        });
        
        // Check specifically for approved proofs
        const approvedProofs = proofs.filter(proof => proof.status === 'approved');
        console.log('Approved proofs:', approvedProofs.length, approvedProofs);
        
        // Check for proofs with files
        const proofsWithFiles = proofs.filter(proof => 
          proof.files && Array.isArray(proof.files) && proof.files.length > 0
        );
        console.log('Proofs with files:', proofsWithFiles.length, proofsWithFiles);
      } else {
        console.log('No proofs found for orders');
      }
    } else {
      console.log('No orders found for user');
    }
  } catch (error) {
    console.error('Debug error:', error);
  }
  
  console.log('=== END DEBUG ===');
}
