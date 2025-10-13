import { supabase } from '../lib/supabaseClient';

export async function testS3Configuration(): Promise<{
  success: boolean;
  message: string;
  config?: any;
  details?: any;
}> {
  try {
    console.log('Testing S3 configuration...');
    
    // First, check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        message: 'User not authenticated',
        details: { authError: authError?.message }
      };
    }
    
    console.log('User authenticated:', user.id);
    
    // Check user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    console.log('User profile:', profile);
    
    const { data, error } = await supabase
      .from('s3_configurations')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching S3 configuration:', error);
      return {
        success: false,
        message: `Database error: ${error.message}`,
        details: { 
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          userRole: profile?.role
        }
      };
    }

    if (!data || data.length === 0) {
      console.log('No S3 configuration found');
      return {
        success: false,
        message: 'No S3 configuration found in database',
        details: { userRole: profile?.role }
      };
    }

    const config = data[0];
    console.log('S3 configuration found:', {
      id: config.id,
      name: config.name,
      bucket_name: config.bucket_name,
      region: config.region,
      is_active: config.is_active
    });

    return {
      success: true,
      message: 'S3 configuration found',
      config,
      details: { userRole: profile?.role }
    };

  } catch (error) {
    console.error('Error testing S3 configuration:', error);
    return {
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}
