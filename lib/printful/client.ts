import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Printful API types
export interface PrintfulError {
  code: number;
  message: string;
  details?: any;
}

export interface PrintfulResponse<T = any> {
  code: number;
  result: T;
  error?: PrintfulError;
}

export interface PrintfulOrder {
  id: number;
  external_id: string;
  status: string;
  shipping: string;
  created: number;
  updated: number;
  recipient: any;
  items: PrintfulOrderItem[];
  costs: any;
  retail_costs: any;
  shipments: any[];
  gift: any;
  packing_slip: any;
}

export interface PrintfulOrderItem {
  id: number;
  external_id?: string;
  variant_id: number;
  quantity: number;
  price: string;
  retail_price: string;
  name: string;
  product: any;
  files: PrintfulFile[];
  options: any[];
  sku?: string;
  discontinued: boolean;
  out_of_stock: boolean;
}

export interface PrintfulFile {
  id: number;
  type: string;
  hash: string;
  url: string;
  filename: string;
  mime_type: string;
  size: number;
  width: number;
  height: number;
  dpi: number;
  status: string;
  created: number;
  thumbnail_url: string;
  preview_url: string;
  visible: boolean;
}

export interface PrintfulCatalogVariant {
  id: number;
  product_id: number;
  name: string;
  size: string;
  color: string;
  color_code: string;
  image: string;
  price: string;
  in_stock: boolean;
  availability_regions: any;
  availability_info: any;
  sku: string;
  discontinued: boolean;
  is_ignored: boolean;
}

export interface PrintfulCatalogResponse {
  variants: PrintfulCatalogVariant[];
  paging: {
    offset: number;
    limit: number;
    total: number;
  };
}

export interface CreateOrderRequest {
  external_id: string;
  shipping: string;
  recipient: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state_code: string;
    country_code: string;
    zip: string;
    phone?: string;
    email: string;
  };
  items: CreateOrderItemRequest[];
  retail_costs?: any;
  gift?: any;
  packing_slip?: any;
}

export interface CreateOrderItemRequest {
  variant_id: number;
  quantity: number;
  files: Array<{
    type: string;
    url: string;
  }>;
  placements?: Array<{
    placement: string;
    layers: Array<{
      type: string;
      url: string;
      position: {
        area: string;
      };
    }>;
  }>;
  external_id?: string;
}

export interface AddOrderItemRequest {
  variant_id: number;
  quantity: number;
  files: Array<{
    type: string;
    url: string;
  }>;
  placements?: Array<{
    placement: string;
    layers: Array<{
      type: string;
      url: string;
      position: {
        area: string;
      };
    }>;
  }>;
  external_id?: string;
}

class PrintfulClient {
  private api: AxiosInstance;
  private apiKey: string;
  private storeId: string;
  private baseUrl: string = 'https://api.printful.com';

  constructor(apiKey?: string, storeId?: string) {
    this.apiKey = apiKey || process.env.PRINTFUL_API_KEY!;
    this.storeId = storeId || process.env.PRINTFUL_STORE_ID!;
    
    if (!this.apiKey) {
      throw new Error('PRINTFUL_API_KEY is required');
    }
    if (!this.storeId) {
      throw new Error('PRINTFUL_STORE_ID is required');
    }

    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 45000
    });

    // Add request/response logging
    this.api.interceptors.request.use(
      (config) => {
        console.log(`[Printful] ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data ? 'present' : 'none'
        });
        return config;
      },
      (error) => {
        console.error('[Printful] Request error:', error);
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response) => {
        console.log(`[Printful] ${response.status} ${response.config.url}`, {
          result: response.data?.result ? 'present' : 'none',
          error: response.data?.error ? 'present' : 'none'
        });
        return response;
      },
      (error) => {
        console.error('[Printful] Response error:', {
          status: error.response?.status,
          message: error.response?.data?.error?.message || error.message,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a GET request to Printful API
   */
  async get<T = any>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    try {
      const response: AxiosResponse<PrintfulResponse<T>> = await this.api.get(endpoint, { params });
      
      if (response.data.error) {
        throw new Error(`Printful API error: ${response.data.error.message}`);
      }
      
      return response.data.result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Printful GET ${endpoint} failed: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Make a POST request to Printful API
   */
  async post<T = any>(endpoint: string, data: any = {}): Promise<T> {
    try {
      const response: AxiosResponse<PrintfulResponse<T>> = await this.api.post(endpoint, data);
      
      if (response.data.error) {
        throw new Error(`Printful API error: ${response.data.error.message}`);
      }
      
      return response.data.result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Printful POST ${endpoint} failed: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Make a PATCH request to Printful API
   */
  async patch<T = any>(endpoint: string, data: any = {}): Promise<T> {
    try {
      const response: AxiosResponse<PrintfulResponse<T>> = await this.api.patch(endpoint, data);
      
      if (response.data.error) {
        throw new Error(`Printful API error: ${response.data.error.message}`);
      }
      
      return response.data.result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Printful PATCH ${endpoint} failed: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Make a DELETE request to Printful API
   */
  async delete<T = any>(endpoint: string): Promise<T> {
    try {
      const response: AxiosResponse<PrintfulResponse<T>> = await this.api.delete(endpoint);
      
      if (response.data.error) {
        throw new Error(`Printful API error: ${response.data.error.message}`);
      }
      
      return response.data.result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Printful DELETE ${endpoint} failed: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: number): Promise<PrintfulOrder> {
    return this.get<PrintfulOrder>(`/orders/${orderId}`);
  }

  /**
   * Get order by external ID
   */
  async getOrderByExternalId(externalId: string): Promise<PrintfulOrder | null> {
    try {
      return await this.get<PrintfulOrder>(`/orders`, { external_id: externalId });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a new order
   */
  async createOrder(orderData: CreateOrderRequest): Promise<PrintfulOrder> {
    return this.post<PrintfulOrder>('/orders', orderData);
  }

  /**
   * Add item to existing order
   */
  async addOrderItem(orderId: number, itemData: AddOrderItemRequest): Promise<PrintfulOrderItem> {
    return this.post<PrintfulOrderItem>(`/orders/${orderId}/items`, itemData);
  }

  /**
   * Remove item from order
   */
  async removeOrderItem(orderId: number, itemId: number): Promise<void> {
    return this.delete(`/orders/${orderId}/items/${itemId}`);
  }

  /**
   * Confirm order
   */
  async confirmOrder(orderId: number): Promise<PrintfulOrder> {
    return this.post<PrintfulOrder>(`/orders/${orderId}/confirm`);
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: number): Promise<PrintfulOrder> {
    return this.delete<PrintfulOrder>(`/orders/${orderId}`);
  }

  /**
   * Get catalog variants with pagination
   */
  async getCatalogVariants(params: {
    sku?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<PrintfulCatalogResponse> {
    // Enforce limit <= 100
    const limit = Math.min(params.limit || 20, 100);
    
    return this.get<PrintfulCatalogResponse>('/catalog/variants', {
      ...params,
      limit
    });
  }

  /**
   * Get product info
   */
  async getProductInfo(variantId: number): Promise<any> {
    return this.get(`/products/variant/${variantId}`);
  }

  /**
   * Get shipping rates
   */
  async getShippingRates(request: {
    recipient: {
      country_code: string;
      state_code?: string;
      city?: string;
      zip?: string;
    };
    items: Array<{
      variant_id: number;
      quantity: number;
    }>;
  }): Promise<any> {
    return this.post('/shipping/rates', request);
  }
}

// Export singleton instance
export const printfulClient = new PrintfulClient();
export default PrintfulClient;
