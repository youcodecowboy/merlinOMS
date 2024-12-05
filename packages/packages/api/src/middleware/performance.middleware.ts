import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { metrics } from '../utils/metrics';

export const trackPerformance = (req: Request, res: Response, next: NextFunction) => {
  const startTime = performance.now();
  const path = req.path;

  res.on('finish', () => {
    metrics.trackDuration(`http_request_duration_${path}`, startTime);
    metrics.record({
      name: `http_status_${res.statusCode}`,
      value: 1,
      tags: {
        path,
        method: req.method
      }
    });
  });

  next();
}; 