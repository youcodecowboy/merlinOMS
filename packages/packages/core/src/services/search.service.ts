import { PrismaClient } from '@prisma/client';
import { ServiceResponse } from '@app/types';
import { TypeValidator } from '@app/utils';

export type SearchEntityType = 
  | 'ORDER'
  | 'INVENTORY'
  | 'CUSTOMER'
  | 'REQUEST'
  | 'BIN';

interface SearchParams {
  query: string;
  type?: SearchEntityType;
  filters?: Record<string, any>;
  userId: string;
  limit?: number;
  offset?: number;
}

export class SearchService {
  constructor(private prisma: PrismaClient) {}

  async search(params: SearchParams): Promise<ServiceResponse<any>> {
    const { query, type, filters, userId, limit = 20, offset = 0 } = params;

    // Log search query
    await this.prisma.searchHistory.create({
      data: {
        user_id: userId,
        query,
        type
      }
    });

    // Perform search based on type
    switch (type) {
      case 'ORDER':
        return this.searchOrders(query, filters, limit, offset);
      case 'INVENTORY':
        return this.searchInventory(query, filters, limit, offset);
      case 'CUSTOMER':
        return this.searchCustomers(query, filters, limit, offset);
      case 'REQUEST':
        return this.searchRequests(query, filters, limit, offset);
      case 'BIN':
        return this.searchBins(query, filters, limit, offset);
      default:
        return this.searchAll(query, limit, offset);
    }
  }

  private async searchOrders(
    query: string,
    filters?: Record<string, any>,
    limit = 20,
    offset = 0
  ): Promise<ServiceResponse<any>> {
    const orders = await this.prisma.order.findMany({
      where: {
        OR: [
          { shopify_id: { contains: query } },
          { customer: { email: { contains: query } } }
        ],
        ...filters
      },
      include: {
        customer: true,
        order_items: true
      },
      take: limit,
      skip: offset
    });

    return {
      success: true,
      data: orders
    };
  }

  // ... similar methods for other entity types
} 