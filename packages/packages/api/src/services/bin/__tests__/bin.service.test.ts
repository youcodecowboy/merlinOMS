import { BinService } from '../bin.service';
import { prismaMock } from '../../../../jest.setup';
import { APIError } from '../../../utils/errors';
import { BinType } from '@prisma/client';

describe('BinService', () => {
  let binService: BinService;

  beforeEach(() => {
    binService = new BinService();
    (binService as any).prisma = prismaMock;
    jest.clearAllMocks();
  });

  describe('allocateBin', () => {
    it('should allocate optimal bin based on capacity', async () => {
      // Mock raw query result
      const mockBins = [
        {
          id: 'bin1',
          code: 'BIN-001',
          capacity: 10,
          current_count: 5
        },
        {
          id: 'bin2',
          code: 'BIN-002',
          capacity: 10,
          current_count: 2
        }
      ];

      // Mock the SQL query
      (prismaMock.$queryRaw as jest.Mock).mockResolvedValueOnce(mockBins);

      // Mock bin update with all required fields
      prismaMock.bin.update.mockResolvedValue({
        id: 'bin2',
        code: 'BIN-002',
        sku: 'TEST-SKU',
        type: BinType.STORAGE,
        zone: 'A1',
        capacity: 10,
        current_count: 5,
        is_active: true,
        qr_code: null,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      });

      const result = await binService.allocateBin('TEST-SKU', 3);

      expect(result.id).toBe('bin2');
      expect(result.current_count).toBe(5);
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it('should throw error when no bins available', async () => {
      // Mock empty result
      (prismaMock.$queryRaw as jest.Mock).mockResolvedValueOnce([]);

      await expect(binService.allocateBin('TEST-SKU', 3))
        .rejects
        .toThrow(new APIError(404, 'NO_BINS_AVAILABLE', 'No suitable bins available'));
    });
  });
}); 