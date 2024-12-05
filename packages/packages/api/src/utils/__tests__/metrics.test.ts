import { metrics } from '../metrics';
import logger from '../logger';

jest.mock('../logger');

describe('MetricsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset metrics between tests
    (metrics as any).metrics = new Map();
  });

  describe('record', () => {
    it('should record a metric value', () => {
      const metricData = {
        name: 'test_metric',
        value: 100,
        tags: { env: 'test' }
      };

      metrics.record(metricData);

      expect(logger.info).toHaveBeenCalledWith('Metric recorded', {
        metric: metricData.name,
        value: metricData.value,
        tags: metricData.tags
      });
    });
  });

  describe('getMetrics', () => {
    it('should return null for non-existent metrics', () => {
      expect(metrics.getMetrics('non_existent')).toBeNull();
    });

    it('should calculate correct statistics', () => {
      const metricName = 'test_metric';
      const values = [1, 2, 3, 4, 5];

      values.forEach(value => {
        metrics.record({ name: metricName, value });
      });

      const result = metrics.getMetrics(metricName);

      expect(result).toEqual({
        name: metricName,
        count: 5,
        avg: 3,
        min: 1,
        max: 5
      });
    });
  });

  describe('trackDuration', () => {
    it('should track duration correctly', () => {
      const startTime = performance.now() - 1000; // 1 second ago
      metrics.trackDuration('test_duration', startTime);

      const result = metrics.getMetrics('test_duration');
      expect(result).toBeTruthy();
      expect(result?.count).toBe(1);
      expect(result?.value).toBeGreaterThan(0);
    });
  });
}); 