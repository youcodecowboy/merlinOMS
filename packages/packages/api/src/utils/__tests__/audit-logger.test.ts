import { auditLogger } from '../audit-logger';
import { prismaMock } from '../../../jest.setup';
import logger from '../logger';

jest.mock('../logger');

describe('AuditLogger', () => {
  const mockAuditData = {
    action: 'TEST_ACTION',
    userId: 'user123',
    resourceType: 'test',
    resourceId: 'resource123',
    details: { test: true },
    ip: '127.0.0.1'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully create an audit log', async () => {
    await auditLogger.log(mockAuditData);

    expect(prismaMock.event.create).toHaveBeenCalledWith({
      data: {
        type: mockAuditData.action,
        actor_id: mockAuditData.userId,
        metadata: {
          resourceType: mockAuditData.resourceType,
          resourceId: mockAuditData.resourceId,
          details: mockAuditData.details,
          ip: mockAuditData.ip
        }
      }
    });

    expect(logger.info).toHaveBeenCalledWith('Audit log created', mockAuditData);
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Database error');
    (prismaMock.event.create as jest.Mock).mockRejectedValueOnce(error);

    await auditLogger.log(mockAuditData);

    expect(logger.error).toHaveBeenCalledWith('Failed to create audit log', {
      error,
      data: mockAuditData
    });
  });
}); 