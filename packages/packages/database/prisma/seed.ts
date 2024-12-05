import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create test admin user if doesn't exist
  const adminEmail = 'admin@example.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  let adminUser;
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: UserRole.ADMIN
      }
    });
  } else {
    adminUser = existingAdmin;
  }

  // Create test customer if doesn't exist
  const customerEmail = 'customer@example.com';
  const existingCustomer = await prisma.customer.findUnique({
    where: { email: customerEmail }
  });

  let customer;
  if (!existingCustomer) {
    customer = await prisma.customer.create({
      data: {
        email: customerEmail,
        profile: {
          create: {
            metadata: {
              company: 'Test Company',
              address: '123 Test St'
            }
          }
        }
      }
    });
  } else {
    customer = existingCustomer;
  }

  // Create test order if doesn't exist
  const orderId = 'TEST_ORDER_001';
  const existingOrder = await prisma.order.findUnique({
    where: { shopify_id: orderId }
  });

  let order;
  if (!existingOrder) {
    order = await prisma.order.create({
      data: {
        shopify_id: orderId,
        status: 'NEW',
        customer_id: customer.id,
        metadata: {
          source: 'test_seed'
        }
      }
    });
  } else {
    order = existingOrder;
  }

  console.log({
    adminUser,
    customer,
    order
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 