import { supabase } from '../lib/supabaseClient';
import { CreativeService, ServiceOrder, Inserts, Updates } from '../types/database';

export class CreativeService {
  // Get all active creative services
  static async getActiveServices(): Promise<CreativeService[]> {
    try {
      const { data, error } = await supabase
        .from('creative_services')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('price', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch creative services: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching creative services:', error);
      throw error;
    }
  }

  // Get services by category
  static async getServicesByCategory(category: CreativeService['category']): Promise<CreativeService[]> {
    try {
      const { data, error } = await supabase
        .from('creative_services')
        .select('*')
        .eq('is_active', true)
        .eq('category', category)
        .order('price', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch services by category: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching services by category:', error);
      throw error;
    }
  }

  // Get service by ID
  static async getServiceById(serviceId: string): Promise<CreativeService | null> {
    try {
      const { data, error } = await supabase
        .from('creative_services')
        .select('*')
        .eq('id', serviceId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch service: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error fetching service by ID:', error);
      throw error;
    }
  }

  // Search services
  static async searchServices(query: string): Promise<CreativeService[]> {
    try {
      const { data, error } = await supabase
        .from('creative_services')
        .select('*')
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('price', { ascending: true });

      if (error) {
        throw new Error(`Failed to search services: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error searching services:', error);
      throw error;
    }
  }

  // Get services by price range
  static async getServicesByPriceRange(
    minPrice: number,
    maxPrice: number
  ): Promise<CreativeService[]> {
    try {
      const { data, error } = await supabase
        .from('creative_services')
        .select('*')
        .eq('is_active', true)
        .gte('price', minPrice)
        .lte('price', maxPrice)
        .order('price', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch services by price range: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching services by price range:', error);
      throw error;
    }
  }

  // Create service order
  static async createServiceOrder(orderData: Inserts<'service_orders'>): Promise<ServiceOrder> {
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .insert(orderData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create service order: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error creating service order:', error);
      throw error;
    }
  }

  // Get user's service orders
  static async getUserServiceOrders(userId: string): Promise<ServiceOrder[]> {
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          creative_services (
            name,
            description,
            category,
            price,
            currency,
            delivery_time
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch user service orders: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user service orders:', error);
      throw error;
    }
  }

  // Get service order by ID
  static async getServiceOrderById(orderId: string): Promise<ServiceOrder | null> {
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          creative_services (
            name,
            description,
            category,
            price,
            currency,
            delivery_time,
            features
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch service order: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error fetching service order by ID:', error);
      throw error;
    }
  }

  // Update service order status
  static async updateServiceOrderStatus(
    orderId: string,
    status: ServiceOrder['status'],
    finalDelivery?: string
  ): Promise<ServiceOrder> {
    try {
      const updateData: Updates<'service_orders'> = {
        status,
        updated_at: new Date().toISOString()
      };

      if (finalDelivery) {
        updateData.final_delivery = finalDelivery;
      }

      const { data, error } = await supabase
        .from('service_orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update service order: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error updating service order status:', error);
      throw error;
    }
  }

  // Cancel service order
  static async cancelServiceOrder(orderId: string): Promise<ServiceOrder> {
    return this.updateServiceOrderStatus(orderId, 'cancelled');
  }

  // Get service order timeline
  static async getServiceOrderTimeline(orderId: string): Promise<{
    orderDate: string;
    estimatedDelivery: string;
    status: ServiceOrder['status'];
    milestones: Array<{
      date: string;
      status: string;
      description: string;
    }>;
  }> {
    try {
      const order = await this.getServiceOrderById(orderId);
      if (!order) {
        throw new Error('Service order not found');
      }

      const service = order.creative_services as CreativeService;
      const orderDate = new Date(order.created_at);
      const estimatedDelivery = new Date(orderDate);
      estimatedDelivery.setDate(orderDate.getDate() + service.delivery_time);

      // Generate milestones based on service category and delivery time
      const milestones = this.generateMilestones(service.category, service.delivery_time);

      return {
        orderDate: order.created_at,
        estimatedDelivery: estimatedDelivery.toISOString(),
        status: order.status,
        milestones
      };
    } catch (error) {
      console.error('Error getting service order timeline:', error);
      throw error;
    }
  }

  // Generate milestones for service delivery
  private static generateMilestones(
    category: CreativeService['category'],
    deliveryTime: number
  ): Array<{ date: string; status: string; description: string }> {
    const milestones: Array<{ date: string; status: string; description: string }> = [];
    const orderDate = new Date();
    
    switch (category) {
      case 'image':
        if (deliveryTime >= 3) {
          milestones.push({
            date: new Date(orderDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'in_progress',
            description: 'Initial design concepts'
          });
          milestones.push({
            date: new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'in_progress',
            description: 'Client feedback and revisions'
          });
        }
        break;
      
      case 'video':
        if (deliveryTime >= 7) {
          milestones.push({
            date: new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'in_progress',
            description: 'Script approval and pre-production'
          });
          milestones.push({
            date: new Date(orderDate.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'in_progress',
            description: 'Production and editing'
          });
          milestones.push({
            date: new Date(orderDate.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'in_progress',
            description: 'Final review and delivery'
          });
        }
        break;
      
      case 'design':
        if (deliveryTime >= 5) {
          milestones.push({
            date: new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'in_progress',
            description: 'Research and concept development'
          });
          milestones.push({
            date: new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'in_progress',
            description: 'Design creation and iterations'
          });
        }
        break;
      
      case 'copywriting':
        if (deliveryTime >= 2) {
          milestones.push({
            date: new Date(orderDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'in_progress',
            description: 'Content research and writing'
          });
        }
        break;
    }

    return milestones;
  }

  // Get service recommendations
  static async getServiceRecommendations(
    userId: string,
    limit: number = 5
  ): Promise<CreativeService[]> {
    try {
      // Get user's previous orders to understand preferences
      const userOrders = await this.getUserServiceOrders(userId);
      const preferredCategories = userOrders
        .map(order => (order.creative_services as CreativeService).category)
        .filter((category, index, arr) => arr.indexOf(category) === index);

      let query = supabase
        .from('creative_services')
        .select('*')
        .eq('is_active', true);

      // If user has preferences, prioritize those categories
      if (preferredCategories.length > 0) {
        query = query.in('category', preferredCategories);
      }

      const { data, error } = await query
        .order('price', { ascending: true })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch service recommendations: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching service recommendations:', error);
      throw error;
    }
  }

  // Get service statistics
  static async getServiceStatistics(): Promise<{
    totalServices: number;
    servicesByCategory: Record<string, number>;
    averagePrice: number;
    priceRange: { min: number; max: number };
  }> {
    try {
      const services = await this.getActiveServices();
      
      const totalServices = services.length;
      const servicesByCategory = services.reduce((acc, service) => {
        acc[service.category] = (acc[service.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const prices = services.map(s => s.price);
      const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const priceRange = {
        min: Math.min(...prices),
        max: Math.max(...prices)
      };

      return {
        totalServices,
        servicesByCategory,
        averagePrice,
        priceRange
      };
    } catch (error) {
      console.error('Error getting service statistics:', error);
      throw error;
    }
  }

  // Calculate service cost with customizations
  static calculateServiceCost(
    basePrice: number,
    customizations: Record<string, any> = {}
  ): {
    basePrice: number;
    customizations: Array<{ name: string; cost: number }>;
    totalCost: number;
  } {
    const customizationsList: Array<{ name: string; cost: number }> = [];
    let totalCost = basePrice;

    // Add costs for common customizations
    if (customizations.rushDelivery) {
      const rushCost = basePrice * 0.5; // 50% rush fee
      customizationsList.push({ name: 'Rush Delivery', cost: rushCost });
      totalCost += rushCost;
    }

    if (customizations.additionalRevisions) {
      const revisionCost = basePrice * 0.2; // 20% per additional revision
      customizationsList.push({ 
        name: `Additional Revisions (${customizations.additionalRevisions})`, 
        cost: revisionCost 
      });
      totalCost += revisionCost;
    }

    if (customizations.sourceFiles) {
      const sourceCost = basePrice * 0.1; // 10% for source files
      customizationsList.push({ name: 'Source Files', cost: sourceCost });
      totalCost += sourceCost;
    }

    if (customizations.commercialLicense) {
      const licenseCost = basePrice * 0.3; // 30% for commercial license
      customizationsList.push({ name: 'Commercial License', cost: licenseCost });
      totalCost += licenseCost;
    }

    return {
      basePrice,
      customizations: customizationsList,
      totalCost
    };
  }
}

