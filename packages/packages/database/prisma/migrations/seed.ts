import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test operator
  const testOperator = await prisma.user.upsert({
    where: { email: 'test-operator@oms.dev' },
    update: {},
    create: {
      id: 'test-operator-id',
      email: 'test-operator@oms.dev',
      password: 'test-password-hash', // In production, this would be hashed
      role: 'WAREHOUSE',
      profile: {
        create: {
          firstName: 'Test',
          lastName: 'Operator',
        }
      }
    }
  });

  console.log('Created test operator:', testOperator);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 