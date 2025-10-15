const axios = require('axios');

class PrintfulClient {
  constructor(apiKey, storeId) {
    this.apiKey = apiKey || process.env.PRINTFUL_API_KEY;
    this.storeId = storeId || process.env.PRINTFUL_STORE_ID;
    this.baseUrl = 'https://api.printful.com';
    
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
        // console.log(`[Printful] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[Printful] Request error:', error);
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response) => {
        // console.log(`[Printful] ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('[Printful] ❌ Response error:', {
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
  async get(endpoint, params = {}) {
    try {
      const response = await this.api.get(endpoint, { params });
      
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
  async post(endpoint, data = {}) {
    try {
      const response = await this.api.post(endpoint, data);
      
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
  async patch(endpoint, data = {}) {
    try {
      const response = await this.api.patch(endpoint, data);
      
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
  async delete(endpoint) {
    try {
      const response = await this.api.delete(endpoint);
      
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
  async getOrder(orderId) {
    return this.get(`/orders/${orderId}`);
  }

  /**
   * Get order by external ID
   */
  async getOrderByExternalId(externalId) {
    try {
      return await this.get(`/orders`, { external_id: externalId });
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
  async createOrder(orderData) {
    return this.post('/orders', orderData);
  }

  /**
   * Add item to existing order
   */
  async addOrderItem(orderId, itemData) {
    return this.post(`/orders/${orderId}/items`, itemData);
  }

  /**
   * Remove item from order
   */
  async removeOrderItem(orderId, itemId) {
    return this.delete(`/orders/${orderId}/items/${itemId}`);
  }

  /**
   * Confirm order
   */
  async confirmOrder(orderId) {
    return this.post(`/orders/${orderId}/confirm`);
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId) {
    return this.delete(`/orders/${orderId}`);
  }

  /**
   * Get catalog variants with pagination
   */
  async getCatalogVariants(params = {}) {
    // Enforce limit <= 100
    const limit = Math.min(params.limit || 20, 100);
    
    return this.get('/catalog/variants', {
      ...params,
      limit
    });
  }

  /**
   * Get product info
   */
  async getProductInfo(variantId) {
    return this.get(`/products/variant/${variantId}`);
  }

  /**
   * Get shipping rates
   */
  async getShippingRates(request) {
    return this.post('/shipping/rates', request);
  }
}

// Export singleton instance (lazy initialization)
let printfulClient = null;

function getPrintfulClient() {
  if (!printfulClient) {
    printfulClient = new PrintfulClient();
  }
  return printfulClient;
}

module.exports = {
  get printfulClient() {
    return getPrintfulClient();
  },
  PrintfulClient
};
