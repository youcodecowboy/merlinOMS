import { SKUService } from '../sku.service';
import { prismaMock } from '../../../../jest.setup';
import { APIError } from '../../../utils/errors';
import { Prisma } from '@prisma/client';
import { createMockInventoryItem } from '../../../utils/__tests__/test-helpers';
import { redisService } from '../../../utils/redis.service';

// Mock redis service
jest.mock('../../../utils/redis.service', () => ({
  redisService: {
    get: jest.fn(),
    set: jest.fn(),
    generateKey: jest.fn()
  }
}));

type JsonValue = Prisma.JsonValue;

describe('SKUService', () => {
  let service: SKUService;

  beforeEach(() => {
    service = new SKUService();
    (service as any).prisma = prismaMock;
    jest.clearAllMocks();

    // Setup default transaction mock
    prismaMock.$transaction.mockImplementation(callback => {
      if (typeof callback === 'function') {
        return callback(prismaMock);
      }
      return Promise.resolve(callback);
    });

    // Mock redis responses
    (redisService.get as jest.Mock).mockResolvedValue(null);
    (redisService.set as jest.Mock).mockResolvedValue(true);
  });

  describe('findMatchingSKU', () => {
    it('should find universal SKU for light wash when no exact match', async () => {
      const targetSKU = 'ST-32-X-32-IND';
      const universalSKU = 'ST-32-X-36-RAW';
      const mockUniversalItem = createMockInventoryItem({
        sku: universalSKU,
        status1: 'AVAILABLE',
        status2: 'NEW'
      });

      // Mock validateAndParseSKU
      jest.spyOn(service as any, 'validateAndParseSKU').mockResolvedValue({
        isValid: true,
        components: {
          style: 'ST',
          waist: '32',
          shape: 'X',
          length: '32',
          wash: 'IND'
        }
      });

      // Mock findExactSKU
      jest.spyOn(service as any, 'findExactSKU')
        .mockImplementation(async () => null);

      // Mock findUniversalSKU
      jest.spyOn(service as any, 'findUniversalSKU')
        .mockImplementation(async () => mockUniversalItem);

      // Mock findPotentialMatches
      jest.spyOn(service as any, 'findPotentialMatches')
        .mockImplementation(async () => [mockUniversalItem]);

      const result = await service.findMatchingSKU(targetSKU);
      expect(result.sku).toBe(universalSKU);
    });

    // ... rest of tests stay the same ...
  });
}); 