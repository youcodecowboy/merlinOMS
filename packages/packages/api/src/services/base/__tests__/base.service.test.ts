import { BaseService } from '../base.service';
import { PrismaClient, Prisma } from '@prisma/client';
import { APIError } from '../../../utils/errors';
import { z } from 'zod';
import { prismaMock } from '../../../../jest.setup';

class TestService extends BaseService {
  constructor() {
    super('TestService');
    // Override prisma with mock for testing
    this.prisma = prismaMock;
  }

  async testTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.withTransaction(operation);
  }

  async testValidation<T>(schema: z.ZodSchema<T>, data: unknown) {
    return this.validateInput(schema, data);
  }

  protected async findExactSKU(sku: string, uncommittedOnly: boolean): Promise<any> {
    return null;
  }
  
  protected async findUniversalSKU(sku: string, uncommittedOnly: boolean): Promise<any> {
    return null;
  }
}

describe('BaseService', () => {
  let service: TestService;

  beforeEach(() => {
    service = new TestService();
    jest.clearAllMocks();
  });

  describe('withTransaction', () => {
    it('should handle successful transactions', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(prismaMock);
      });

      const result = await service.testTransaction(async () => 'success');
      expect(result).toBe('success');
    });

    it('should handle transaction errors', async () => {
      prismaMock.$transaction.mockImplementation(async () => {
        throw new Error('Transaction failed');
      });

      await expect(
        service.testTransaction(async () => {
          throw new Error('Transaction failed');
        })
      ).rejects.toThrow(APIError);
    });
  });

  describe('validateInput', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number()
    });

    it('should validate correct input', async () => {
      const data = { name: 'Test', age: 25 };
      const result = await service.testValidation(schema, data);
      expect(result).toEqual(data);
    });

    it('should throw error for invalid input', async () => {
      const data = { name: 'Test', age: 'invalid' };
      await expect(
        service.testValidation(schema, data)
      ).rejects.toThrow(APIError);
    });
  });
}); 