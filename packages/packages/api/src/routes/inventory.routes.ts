import { BaseRoute } from './base.route';
import { PrismaClient } from '@prisma/client';
import { InventoryAssignmentService } from '@app/core/services/inventory-assignment.service';
import { LocationManagementService } from '@app/core/services/location-management.service';
import { z } from 'zod';

export class InventoryRoutes extends BaseRoute {
  private inventoryService: InventoryAssignmentService;
  private locationService: LocationManagementService;

  constructor() {
    super();
    const prisma = new PrismaClient();
    this.inventoryService = new InventoryAssignmentService(prisma);
    this.locationService = new LocationManagementService(prisma);
  }

  protected initializeRoutes(): void {
    // Get inventory item
    this.createRoute({
      path: '/:id',
      method: 'get',
      handler: this.getItem.bind(this),
      schema: z.object({
        params: z.object({
          id: z.string()
        })
      })
    });

    // Move inventory item
    this.createRoute({
      path: '/move',
      method: 'post',
      handler: this.moveItem.bind(this),
      schema: z.object({
        body: z.object({
          itemId: z.string(),
          targetBinId: z.string(),
          reason: z.string()
        })
      })
    });

    // Update inventory status
    this.createRoute({
      path: '/status',
      method: 'post',
      handler: this.updateStatus.bind(this),
      schema: z.object({
        body: z.object({
          itemId: z.string(),
          status1: z.string(),
          status2: z.string().optional(),
          reason: z.string()
        })
      })
    });

    // Search inventory
    this.createRoute({
      path: '/search',
      method: 'get',
      handler: this.searchInventory.bind(this),
      schema: z.object({
        query: z.object({
          sku: z.string().optional(),
          status1: z.string().optional(),
          status2: z.string().optional(),
          binId: z.string().optional(),
          limit: z.string().optional(),
          offset: z.string().optional()
        })
      })
    });
  }

  // Handler implementations...
} 