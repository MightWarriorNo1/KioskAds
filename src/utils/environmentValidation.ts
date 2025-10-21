/**
 * Environment Variable Validation Utility
 * Helps debug missing environment variables in production
 */

export interface EnvironmentConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsS3BucketName: string;
  awsS3Prefix: string;
}

export function validateEnvironmentVariables(): {
  isValid: boolean;
  missing: string[];
  config: Partial<EnvironmentConfig>;
} {
  const missing: string[] = [];
  const config: Partial<EnvironmentConfig> = {};

  // Check Supabase configuration
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  else config.supabaseUrl = supabaseUrl;
  
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
  else config.supabaseAnonKey = supabaseAnonKey;

  // Check AWS configuration
  const awsRegion = import.meta.env.VITE_AWS_REGION;
  const awsAccessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
  const awsS3BucketName = import.meta.env.VITE_AWS_S3_BUCKET_NAME;
  const awsS3Prefix = import.meta.env.VITE_AWS_S3_PREFIX;

  if (!awsRegion) missing.push('VITE_AWS_REGION');
  else config.awsRegion = awsRegion;
  
  if (!awsAccessKeyId) missing.push('VITE_AWS_ACCESS_KEY_ID');
  else config.awsAccessKeyId = awsAccessKeyId;
  
  if (!awsSecretAccessKey) missing.push('VITE_AWS_SECRET_ACCESS_KEY');
  else config.awsSecretAccessKey = awsSecretAccessKey;
  
  if (!awsS3BucketName) missing.push('VITE_AWS_S3_BUCKET_NAME');
  else config.awsS3BucketName = awsS3BucketName;
  
  if (!awsS3Prefix) missing.push('VITE_AWS_S3_PREFIX');
  else config.awsS3Prefix = awsS3Prefix;

  return {
    isValid: missing.length === 0,
    missing,
    config
  };
}

export function logEnvironmentStatus(): void {
  const validation = validateEnvironmentVariables();
  
  console.group('🔧 Environment Variables Status');
  console.log('Valid:', validation.isValid);
  
  if (validation.missing.length > 0) {
    console.warn('❌ Missing variables:', validation.missing);
    console.warn('Please set these environment variables in Vercel dashboard');
  } else {
    console.log('✅ All required environment variables are set');
  }
  
  console.log('Current config:', validation.config);
  console.groupEnd();
}

export function getEnvironmentConfig(): EnvironmentConfig {
  const validation = validateEnvironmentVariables();
  
  if (!validation.isValid) {
    throw new Error(`Missing environment variables: ${validation.missing.join(', ')}`);
  }
  
  return validation.config as EnvironmentConfig;
}
