import { Request, Response } from 'express';
import { trackPerformance } from '../performance.middleware';
import { metrics } from '../../utils/metrics';

jest.mock('../../utils/metrics');

describe('Performance Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      path: '/test',
      method: 'GET'
    };
    mockRes = {
      on: jest.fn(),
      statusCode: 200
    };
    mockNext = jest.fn();
  });

  it('should track request duration', () => {
    trackPerformance(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    expect(mockNext).toHaveBeenCalled();

    // Simulate request finish
    const finishCallback = (mockRes.on as jest.Mock).mock.calls[0][1];
    finishCallback();

    expect(metrics.trackDuration).toHaveBeenCalledWith(
      'http_request_duration_/test',
      expect.any(Number)
    );
    expect(metrics.record).toHaveBeenCalledWith({
      name: 'http_status_200',
      value: 1,
      tags: {
        path: '/test',
        method: 'GET'
      }
    });
  });
}); 