import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    console.log('Starting test data cleanup...');

    // Delete test data in the correct order to handle dependencies
    const result = await prisma.$transaction(async (tx) => {
      // Delete waitlist entries first (they reference order items and production requests)
      const deletedWaitlist = await tx.productionWaitlist.deleteMany({});
      console.log(`Deleted ${deletedWaitlist.count} waitlist entries`);

      // Delete production requests
      const deletedProductionRequests = await tx.productionRequest.deleteMany({});
      console.log(`Deleted ${deletedProductionRequests.count} production requests`);

      // Delete notifications (they reference requests)
      const deletedNotifications = await tx.notification.deleteMany({});
      console.log(`Deleted ${deletedNotifications.count} notifications`);

      // Delete requests
      const deletedRequests = await tx.request.deleteMany({});
      console.log(`Deleted ${deletedRequests.count} requests`);

      // Delete order items
      const deletedOrderItems = await tx.orderItem.deleteMany({});
      console.log(`Deleted ${deletedOrderItems.count} order items`);

      // Delete orders
      const deletedOrders = await tx.order.deleteMany({});
      console.log(`Deleted ${deletedOrders.count} orders`);

      // Delete customer profiles
      const deletedProfiles = await tx.customerProfile.deleteMany({});
      console.log(`Deleted ${deletedProfiles.count} customer profiles`);

      // Delete customers
      const deletedCustomers = await tx.customer.deleteMany({});
      console.log(`Deleted ${deletedCustomers.count} customers`);

      // Delete inventory items (except bins)
      const deletedInventoryItems = await tx.inventoryItem.deleteMany({
        where: {
          NOT: {
            location: 'BIN'
          }
        }
      });
      console.log(`Deleted ${deletedInventoryItems.count} inventory items`);

      // Create a test customer
      const testCustomer = await tx.customer.create({
        data: {
          email: 'test@example.com',
          profile: {
            create: {
              metadata: {
                firstName: 'Test',
                lastName: 'Customer',
                phone: '555-0123',
                address: '123 Test St'
              }
            }
          }
        }
      });
      console.log('Created test customer:', testCustomer);

      return {
        waitlist: deletedWaitlist.count,
        productionRequests: deletedProductionRequests.count,
        notifications: deletedNotifications.count,
        requests: deletedRequests.count,
        orderItems: deletedOrderItems.count,
        orders: deletedOrders.count,
        profiles: deletedProfiles.count,
        customers: deletedCustomers.count,
        inventoryItems: deletedInventoryItems.count,
        testCustomer: testCustomer.id
      };
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Test data cleared successfully',
      details: result
    });
  } catch (error) {
    console.error('Error clearing test data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to clear test data' 
      }, 
      { status: 500 }
    );
  }
} 