export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'client' | 'host' | 'designer' | 'admin';
          company_name?: string;
          avatar_url?: string;
          created_at: string;
          updated_at: string;
          subscription_tier: 'free' | 'basic' | 'premium' | 'enterprise';
          stripe_customer_id?: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: 'client' | 'host' | 'designer' | 'admin';
          company_name?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
          subscription_tier?: 'free' | 'basic' | 'premium' | 'enterprise';
          stripe_customer_id?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'client' | 'host' | 'designer' | 'admin';
          company_name?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
          subscription_tier?: 'free' | 'basic' | 'premium' | 'enterprise';
          stripe_customer_id?: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description?: string;
          status: 'draft' | 'pending' | 'active' | 'paused' | 'completed' | 'rejected';
          start_date: string;
          end_date: string;
          budget: number;
          daily_budget?: number;
          target_locations: string[];
          target_demographics?: Record<string, any>;
          created_at: string;
          updated_at: string;
          total_spent: number;
          total_cost: number;
          total_slots: number;
          impressions: number;
          clicks: number;
          selected_kiosk_ids?: string[];
          volume_discount_applied: number;
          total_discount_amount: number;
          max_video_duration?: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string;
          status?: 'draft' | 'pending' | 'active' | 'paused' | 'completed' | 'rejected';
          start_date: string;
          end_date: string;
          budget: number;
          daily_budget?: number;
          target_locations: string[];
          target_demographics?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
          total_spent?: number;
          total_cost?: number;
          total_slots?: number;
          impressions?: number;
          clicks?: number;
          selected_kiosk_ids?: string[];
          volume_discount_applied?: number;
          total_discount_amount?: number;
          max_video_duration?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string;
          status?: 'draft' | 'pending' | 'active' | 'paused' | 'completed' | 'rejected';
          start_date?: string;
          end_date?: string;
          budget?: number;
          daily_budget?: number;
          target_locations?: string[];
          target_demographics?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
          total_spent?: number;
          total_cost?: number;
          total_slots?: number;
          impressions?: number;
          clicks?: number;
          selected_kiosk_ids?: string[];
          volume_discount_applied?: number;
          total_discount_amount?: number;
          max_video_duration?: number;
        };
      };
      media_assets: {
        Row: {
          id: string;
          user_id: string;
          campaign_id?: string;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: 'image' | 'video';
          mime_type: string;
          dimensions: {
            width: number;
            height: number;
          };
          duration?: number;
          status: 'uploading' | 'processing' | 'approved' | 'rejected' | 'archived' | 'swapped';
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
          validation_errors?: string[];
        };
        Insert: {
          id?: string;
          user_id: string;
          campaign_id?: string;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: 'image' | 'video';
          mime_type: string;
          dimensions: {
            width: number;
            height: number;
          };
          duration?: number;
          status?: 'uploading' | 'processing' | 'approved' | 'rejected' | 'archived' | 'swapped';
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
          validation_errors?: string[];
        };
        Update: {
          id?: string;
          user_id?: string;
          campaign_id?: string;
          file_name?: string;
          file_path?: string;
          file_size?: number;
          file_type?: 'image' | 'video';
          mime_type?: string;
          dimensions?: {
            width: number;
            height: number;
          };
          duration?: number;
          status?: 'uploading' | 'processing' | 'approved' | 'rejected' | 'archived' | 'swapped';
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
          validation_errors?: string[];
        };
      };
      campaign_media: {
        Row: {
          id: string;
          campaign_id: string;
          media_id: string;
          display_order: number;
          weight: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          media_id: string;
          display_order: number;
          weight: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          media_id?: string;
          display_order?: number;
          weight?: number;
          created_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          user_id: string;
          campaign_id?: string;
          amount: number;
          currency: string;
          status: 'pending' | 'paid' | 'overdue' | 'cancelled';
          due_date: string;
          paid_date?: string;
          stripe_invoice_id?: string;
          description: string;
          items: Array<{
            description: string;
            quantity: number;
            unit_price: number;
            total: number;
          }>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          campaign_id?: string;
          amount: number;
          currency?: string;
          status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
          due_date: string;
          paid_date?: string;
          stripe_invoice_id?: string;
          description: string;
          items: Array<{
            description: string;
            quantity: number;
            unit_price: number;
            total: number;
          }>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          campaign_id?: string;
          amount?: number;
          currency?: string;
          status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
          due_date?: string;
          paid_date?: string;
          stripe_invoice_id?: string;
          description?: string;
          items?: Array<{
            description: string;
            quantity: number;
            unit_price: number;
            total: number;
          }>;
          created_at?: string;
          updated_at?: string;
        };
      };
      payment_methods: {
        Row: {
          id: string;
          user_id: string;
          stripe_payment_method_id: string;
          type: 'card' | 'bank_account';
          last4?: string;
          brand?: string;
          expiry_month?: number;
          expiry_year?: number;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_payment_method_id: string;
          type: 'card' | 'bank_account';
          last4?: string;
          brand?: string;
          expiry_month?: number;
          expiry_year?: number;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_payment_method_id?: string;
          type?: 'card' | 'bank_account';
          last4?: string;
          brand?: string;
          expiry_month?: number;
          expiry_year?: number;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      coupon_codes: {
        Row: {
          id: string;
          code: string;
          type: 'percentage' | 'fixed' | 'free';
          value: number;
          max_uses: number;
          current_uses: number;
          min_amount?: number;
          valid_from: string;
          valid_until: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          type: 'percentage' | 'fixed' | 'free';
          value: number;
          max_uses: number;
          current_uses?: number;
          min_amount?: number;
          valid_from: string;
          valid_until: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          type?: 'percentage' | 'fixed' | 'free';
          value?: number;
          max_uses?: number;
          current_uses?: number;
          min_amount?: number;
          valid_from?: string;
          valid_until?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      coupon_usage: {
        Row: {
          id: string;
          coupon_id: string;
          user_id: string;
          campaign_id?: string;
          discount_amount: number;
          used_at: string;
        };
        Insert: {
          id?: string;
          coupon_id: string;
          user_id: string;
          campaign_id?: string;
          discount_amount: number;
          used_at?: string;
        };
        Update: {
          id?: string;
          coupon_id?: string;
          user_id?: string;
          campaign_id?: string;
          discount_amount?: number;
          used_at?: string;
        };
      };
      creative_services: {
        Row: {
          id: string;
          name: string;
          description: string;
          category: 'image' | 'video' | 'design' | 'copywriting';
          price: number;
          currency: string;
          delivery_time: number;
          features: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          category: 'image' | 'video' | 'design' | 'copywriting';
          price: number;
          currency?: string;
          delivery_time: number;
          features: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          category?: 'image' | 'video' | 'design' | 'copywriting';
          price?: number;
          currency?: string;
          delivery_time?: number;
          features?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_orders: {
        Row: {
          id: string;
          user_id: string;
          service_id: string;
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          requirements: Record<string, any>;
          final_delivery?: string;
          total_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          service_id: string;
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          requirements: Record<string, any>;
          final_delivery?: string;
          total_amount: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          service_id?: string;
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          requirements?: Record<string, any>;
          final_delivery?: string;
          total_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      custom_ad_orders: {
        Row: {
          id: string;
          user_id: string;
          service_key: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          address: string;
          details: string;
          files: Array<{ name: string; url: string; size: number; type: string }>;
          total_amount: number;
          payment_status: 'pending' | 'succeeded' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          service_key: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          address: string;
          details: string;
          files?: Array<{ name: string; url: string; size: number; type: string }>;
          total_amount: number;
          payment_status?: 'pending' | 'succeeded' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          service_key?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string;
          address?: string;
          details?: string;
          files?: Array<{ name: string; url: string; size: number; type: string }>;
          total_amount?: number;
          payment_status?: 'pending' | 'succeeded' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
      };
      analytics_events: {
        Row: {
          id: string;
          campaign_id: string;
          media_id: string;
          event_type: 'impression' | 'click' | 'play' | 'complete';
          location: string;
          device_info: Record<string, any>;
          timestamp: string;
          user_agent?: string;
          ip_address?: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          media_id: string;
          event_type: 'impression' | 'click' | 'play' | 'complete';
          location: string;
          device_info: Record<string, any>;
          timestamp?: string;
          user_agent?: string;
          ip_address?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          media_id?: string;
          event_type?: 'impression' | 'click' | 'play' | 'complete';
          location?: string;
          device_info?: Record<string, any>;
          timestamp?: string;
          user_agent?: string;
          ip_address?: string;
        };
      };
      s3_configurations: {
        Row: {
          id: string;
          name: string;
          bucket_name: string;
          region: string;
          access_key_id: string;
          secret_access_key: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          bucket_name: string;
          region: string;
          access_key_id: string;
          secret_access_key: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          bucket_name?: string;
          region?: string;
          access_key_id?: string;
          secret_access_key?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      optisigns_import_jobs: {
        Row: {
          id: string;
          s3_config_id: string;
          file_path: string;
          file_size?: number;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          records_processed: number;
          records_total: number;
          error_message?: string;
          started_at?: string;
          completed_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          s3_config_id: string;
          file_path: string;
          file_size?: number;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          records_processed?: number;
          records_total?: number;
          error_message?: string;
          started_at?: string;
          completed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          s3_config_id?: string;
          file_path?: string;
          file_size?: number;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          records_processed?: number;
          records_total?: number;
          error_message?: string;
          started_at?: string;
          completed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      optisigns_proof_of_play: {
        Row: {
          id: string;
          import_job_id: string;
          kiosk_id: string;
          campaign_id: string;
          media_id: string;
          play_date: string;
          play_duration: number;
          play_count: number;
          device_id?: string;
          location?: string;
          raw_data: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          import_job_id: string;
          kiosk_id: string;
          campaign_id: string;
          media_id: string;
          play_date: string;
          play_duration: number;
          play_count?: number;
          device_id?: string;
          location?: string;
          raw_data?: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          import_job_id?: string;
          kiosk_id?: string;
          campaign_id?: string;
          media_id?: string;
          play_date?: string;
          play_duration?: number;
          play_count?: number;
          device_id?: string;
          location?: string;
          raw_data?: Record<string, any>;
          created_at?: string;
        };
      };
      tracking_tags: {
        Row: {
          id: string;
          name: string;
          platform: 'google_analytics' | 'google_tag_manager' | 'facebook_pixel' | 'bing_ads' | 'custom';
          tag_id: string;
          tag_code: string;
          is_active: boolean;
          placement: 'head' | 'body' | 'footer';
          conditions: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          platform: 'google_analytics' | 'google_tag_manager' | 'facebook_pixel' | 'bing_ads' | 'custom';
          tag_id: string;
          tag_code: string;
          is_active?: boolean;
          placement?: 'head' | 'body' | 'footer';
          conditions?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          platform?: 'google_analytics' | 'google_tag_manager' | 'facebook_pixel' | 'bing_ads' | 'custom';
          tag_id?: string;
          tag_code?: string;
          is_active?: boolean;
          placement?: 'head' | 'body' | 'footer';
          conditions?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      campaign_tracking_tags: {
        Row: {
          id: string;
          campaign_id: string;
          tracking_tag_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          tracking_tag_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          tracking_tag_id?: string;
          created_at?: string;
        };
      };
      volume_discount_settings: {
        Row: {
          id: string;
          name: string;
          description?: string;
          discount_type: 'percentage' | 'fixed_amount';
          discount_value: number;
          min_kiosks: number;
          max_kiosks?: number;
          is_active: boolean;
          valid_from: string;
          valid_until?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          discount_type: 'percentage' | 'fixed_amount';
          discount_value: number;
          min_kiosks?: number;
          max_kiosks?: number;
          is_active?: boolean;
          valid_from?: string;
          valid_until?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          discount_type?: 'percentage' | 'fixed_amount';
          discount_value?: number;
          min_kiosks?: number;
          max_kiosks?: number;
          is_active?: boolean;
          valid_from?: string;
          valid_until?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      campaign_pricing_breakdown: {
        Row: {
          id: string;
          campaign_id: string;
          kiosk_id: string;
          base_price: number;
          discount_amount: number;
          final_price: number;
          discount_reason?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          kiosk_id: string;
          base_price: number;
          discount_amount?: number;
          final_price: number;
          discount_reason?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          kiosk_id?: string;
          base_price?: number;
          discount_amount?: number;
          final_price?: number;
          discount_reason?: string;
          created_at?: string;
        };
      };
      google_drive_configs: {
        Row: {
          id: string;
          name: string;
          client_id: string;
          client_secret: string;
          refresh_token: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          client_id: string;
          client_secret: string;
          refresh_token: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          client_id?: string;
          client_secret?: string;
          refresh_token?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      kiosk_gdrive_folders: {
        Row: {
          id: string;
          kiosk_id: string;
          gdrive_config_id: string;
          active_folder_id: string;
          archive_folder_id: string;
          scheduled_folder_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kiosk_id: string;
          gdrive_config_id: string;
          active_folder_id: string;
          archive_folder_id: string;
          scheduled_folder_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kiosk_id?: string;
          gdrive_config_id?: string;
          active_folder_id?: string;
          archive_folder_id?: string;
          scheduled_folder_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      upload_jobs: {
        Row: {
          id: string;
          gdrive_config_id: string;
          kiosk_id: string;
          campaign_id: string;
          media_asset_id: string;
          scheduled_time: string;
          status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
          upload_type: 'scheduled' | 'immediate' | 'sync';
          folder_type: 'scheduled' | 'active' | 'archive';
          gdrive_file_id?: string;
          error_message?: string;
          started_at?: string;
          completed_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gdrive_config_id: string;
          kiosk_id: string;
          campaign_id: string;
          media_asset_id: string;
          scheduled_time: string;
          status?: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
          upload_type?: 'scheduled' | 'immediate' | 'sync';
          folder_type?: 'scheduled' | 'active' | 'archive';
          gdrive_file_id?: string;
          error_message?: string;
          started_at?: string;
          completed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gdrive_config_id?: string;
          kiosk_id?: string;
          campaign_id?: string;
          media_asset_id?: string;
          scheduled_time?: string;
          status?: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
          upload_type?: 'scheduled' | 'immediate' | 'sync';
          folder_type?: 'scheduled' | 'active' | 'archive';
          gdrive_file_id?: string;
          error_message?: string;
          started_at?: string;
          completed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      sync_jobs: {
        Row: {
          id: string;
          gdrive_config_id: string;
          kiosk_id: string;
          status: 'pending' | 'syncing' | 'completed' | 'failed';
          sync_type: 'hourly' | 'manual' | 'campaign_status';
          files_synced: number;
          files_archived: number;
          files_activated: number;
          error_message?: string;
          started_at?: string;
          completed_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gdrive_config_id: string;
          kiosk_id: string;
          status?: 'pending' | 'syncing' | 'completed' | 'failed';
          sync_type?: 'hourly' | 'manual' | 'campaign_status';
          files_synced?: number;
          files_archived?: number;
          files_activated?: number;
          error_message?: string;
          started_at?: string;
          completed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gdrive_config_id?: string;
          kiosk_id?: string;
          status?: 'pending' | 'syncing' | 'completed' | 'failed';
          sync_type?: 'hourly' | 'manual' | 'campaign_status';
          files_synced?: number;
          files_archived?: number;
          files_activated?: number;
          error_message?: string;
          started_at?: string;
          completed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      custom_ad_creations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description?: string;
          category?: string;
          status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'completed';
          priority: 'low' | 'normal' | 'high' | 'urgent';
          budget_range?: string;
          deadline?: string;
          special_requirements?: string;
          target_audience?: string;
          brand_guidelines?: string;
          created_at: string;
          updated_at: string;
          submitted_at?: string;
          reviewed_at?: string;
          completed_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          category?: string;
          status?: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'completed';
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          budget_range?: string;
          deadline?: string;
          special_requirements?: string;
          target_audience?: string;
          brand_guidelines?: string;
          created_at?: string;
          updated_at?: string;
          submitted_at?: string;
          reviewed_at?: string;
          completed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          category?: string;
          status?: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'completed';
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          budget_range?: string;
          deadline?: string;
          special_requirements?: string;
          target_audience?: string;
          brand_guidelines?: string;
          created_at?: string;
          updated_at?: string;
          submitted_at?: string;
          reviewed_at?: string;
          completed_at?: string;
        };
      };
      custom_ad_media_files: {
        Row: {
          id: string;
          custom_ad_creation_id: string;
          file_name: string;
          original_name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          mime_type: string;
          dimensions?: Record<string, any>;
          duration?: number;
          aspect_ratio?: string;
          file_category: 'image' | 'video' | 'document' | 'other';
          storage_bucket: string;
          public_url?: string;
          metadata: Record<string, any>;
          uploaded_at: string;
          processed_at?: string;
          processing_status: 'pending' | 'processing' | 'completed' | 'failed';
        };
        Insert: {
          id?: string;
          custom_ad_creation_id: string;
          file_name: string;
          original_name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          mime_type: string;
          dimensions?: Record<string, any>;
          duration?: number;
          aspect_ratio?: string;
          file_category: 'image' | 'video' | 'document' | 'other';
          storage_bucket?: string;
          public_url?: string;
          metadata?: Record<string, any>;
          uploaded_at?: string;
          processed_at?: string;
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
        };
        Update: {
          id?: string;
          custom_ad_creation_id?: string;
          file_name?: string;
          original_name?: string;
          file_path?: string;
          file_size?: number;
          file_type?: string;
          mime_type?: string;
          dimensions?: Record<string, any>;
          duration?: number;
          aspect_ratio?: string;
          file_category?: 'image' | 'video' | 'document' | 'other';
          storage_bucket?: string;
          public_url?: string;
          metadata?: Record<string, any>;
          uploaded_at?: string;
          processed_at?: string;
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
        };
      };
      custom_ad_creation_notes: {
        Row: {
          id: string;
          custom_ad_creation_id: string;
          author_id: string;
          note_type: 'comment' | 'requirement' | 'feedback' | 'approval' | 'rejection';
          content: string;
          is_internal: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          custom_ad_creation_id: string;
          author_id: string;
          note_type?: 'comment' | 'requirement' | 'feedback' | 'approval' | 'rejection';
          content: string;
          is_internal?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          custom_ad_creation_id?: string;
          author_id?: string;
          note_type?: 'comment' | 'requirement' | 'feedback' | 'approval' | 'rejection';
          content?: string;
          is_internal?: boolean;
          created_at?: string;
        };
      };
      custom_ad_creation_assignments: {
        Row: {
          id: string;
          custom_ad_creation_id: string;
          assigned_to_id: string;
          role: string;
          assigned_at: string;
          assigned_by_id: string;
          status: 'active' | 'completed' | 'transferred';
        };
        Insert: {
          id?: string;
          custom_ad_creation_id: string;
          assigned_to_id: string;
          role: string;
          assigned_at?: string;
          assigned_by_id: string;
          status?: 'active' | 'completed' | 'transferred';
        };
        Update: {
          id?: string;
          custom_ad_creation_id?: string;
          assigned_to_id?: string;
          role?: string;
          assigned_at?: string;
          assigned_by_id?: string;
          status?: 'active' | 'completed' | 'transferred';
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Type helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Common types
export type Profile = Tables<'profiles'>;
export type Campaign = Tables<'campaigns'>;
export type MediaAsset = Tables<'media_assets'>;
export type CampaignMedia = Tables<'campaign_media'>;
export type Invoice = Tables<'invoices'>;
export type PaymentMethod = Tables<'payment_methods'>;
export type CouponCode = Tables<'coupon_codes'>;
export type CouponUsage = Tables<'coupon_usage'>;
export type CreativeService = Tables<'creative_services'>;
export type ServiceOrder = Tables<'service_orders'>;
export type AnalyticsEvent = Tables<'analytics_events'>;
export type S3Configuration = Tables<'s3_configurations'>;
export type OptiSignsImportJob = Tables<'optisigns_import_jobs'>;
export type OptiSignsProofOfPlay = Tables<'optisigns_proof_of_play'>;
export type TrackingTag = Tables<'tracking_tags'>;
export type CampaignTrackingTag = Tables<'campaign_tracking_tags'>;
export type VolumeDiscountSetting = Tables<'volume_discount_settings'>;
export type CampaignPricingBreakdown = Tables<'campaign_pricing_breakdown'>;
export type GoogleDriveConfig = Tables<'google_drive_configs'>;
export type KioskGDriveFolder = Tables<'kiosk_gdrive_folders'>;
export type UploadJob = Tables<'upload_jobs'>;
export type SyncJob = Tables<'sync_jobs'>;
