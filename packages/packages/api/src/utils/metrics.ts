import { performance } from 'perf_hooks';
import logger from './logger';

interface MetricData {
  name: string;
  value: number;
  tags?: Record<string, string>;
}

export interface MetricsService {
  incrementCounter(name: string): void;
  recordMetric(name: string, value: number): void;
  record(data: MetricData): void;
  getMetrics(name: string): any;
  trackDuration(name: string, startTime: number): void;
}

class MetricsImplementation implements MetricsService {
  private metrics: Map<string, any> = new Map();

  incrementCounter(name: string): void {
    const current = this.metrics.get(name) || 0;
    this.metrics.set(name, current + 1);
  }

  recordMetric(name: string, value: number): void {
    this.record({ name, value });
  }

  record(data: MetricData): void {
    this.metrics.set(data.name, data);
  }

  getMetrics(name: string): any {
    return this.metrics.get(name) || null;
  }

  trackDuration(name: string, startTime: number): void {
    const duration = Date.now() - startTime;
    this.recordMetric(name, duration);
  }
}

export const metrics: MetricsService = new MetricsImplementation(); 