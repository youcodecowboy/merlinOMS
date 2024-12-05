import { PrismaClient, RequestStatus } from '@prisma/client';
import { APIError } from '../../utils/errors';

export interface TimelineEntry {
  step: string;
  status: RequestStatus;
  operatorId: string;
  metadata?: Record<string, any>;
}

export class TimelineService {
  constructor(private prisma: PrismaClient) {}

  async addEntry(requestId: string, entry: TimelineEntry): Promise<void> {
    await this.prisma.requestTimeline.create({
      data: {
        request_id: requestId,
        step: entry.step,
        status: entry.status,
        operator_id: entry.operatorId,
        metadata: entry.metadata
      }
    });
  }

  async getTimeline(requestId: string): Promise<TimelineEntry[]> {
    const entries = await this.prisma.requestTimeline.findMany({
      where: { request_id: requestId },
      orderBy: { created_at: 'asc' }
    });

    return entries.map(entry => ({
      step: entry.step,
      status: entry.status as RequestStatus,
      operatorId: entry.operator_id,
      metadata: entry.metadata as Record<string, any>
    }));
  }

  async validateTransition(
    requestId: string,
    fromStep: string,
    toStep: string,
    allowedTransitions: Record<string, string[]>
  ): Promise<boolean> {
    const lastEntry = await this.prisma.requestTimeline.findFirst({
      where: { request_id: requestId },
      orderBy: { created_at: 'desc' }
    });

    if (!lastEntry) {
      return fromStep === 'CREATED';
    }

    const allowed = allowedTransitions[lastEntry.step];
    return allowed?.includes(toStep) ?? false;
  }
} 