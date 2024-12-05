import { PrismaClient } from '@prisma/client';
import { EventLoggerService } from './event-logger.service';

export type TimingStatus = 'ON_TIME' | 'BEHIND' | 'LATE';

interface MilestoneDefinition {
  stage: string;
  targetDay: number;
  criticalPath: boolean;
}

interface TimingMetrics {
  currentDay: number;
  targetDay: number;
  status: TimingStatus;
  daysRemaining: number;
  currentStage: string;
  nextMilestone: MilestoneDefinition;
  isAtRisk: boolean;
}

export class TimingService {
  private readonly CYCLE_LENGTH = 21; // Total days allowed
  private readonly QC_TARGET_DAY = 12; // Day by which QC should be reached

  private readonly MILESTONES: MilestoneDefinition[] = [
    { stage: 'ORDER_RECEIVED', targetDay: 0, criticalPath: true },
    { stage: 'ASSIGNED', targetDay: 2, criticalPath: true },
    { stage: 'WASH_COMPLETED', targetDay: 5, criticalPath: true },
    { stage: 'PATTERN_CREATED', targetDay: 7, criticalPath: true },
    { stage: 'CUTTING_COMPLETED', targetDay: 9, criticalPath: true },
    { stage: 'SEWING_COMPLETED', targetDay: 11, criticalPath: true },
    { stage: 'QC_COMPLETED', targetDay: 12, criticalPath: true },
    { stage: 'FINISHING_COMPLETED', targetDay: 15, criticalPath: true },
    { stage: 'PACKED', targetDay: 17, criticalPath: true },
    { stage: 'SHIPPED', targetDay: 21, criticalPath: true }
  ];

  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService
  ) {}

  async getOrderTiming(orderId: string): Promise<TimingMetrics> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        events: {
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const startDate = order.created_at;
    const currentDate = new Date();
    const currentDay = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const currentStage = this.getCurrentStage(order.events);
    const currentMilestone = this.MILESTONES.find(m => m.stage === currentStage);
    const nextMilestone = this.getNextMilestone(currentStage);

    const status = this.calculateTimingStatus(currentDay, currentMilestone?.targetDay || 0);
    const daysRemaining = this.CYCLE_LENGTH - currentDay;
    const isAtRisk = this.assessRisk(currentDay, currentStage);

    return {
      currentDay,
      targetDay: currentMilestone?.targetDay || 0,
      status,
      daysRemaining,
      currentStage,
      nextMilestone,
      isAtRisk
    };
  }

  private getCurrentStage(events: any[]): string {
    // Map event types to milestone stages
    const stageMapping: Record<string, string> = {
      'ORDER_CREATED': 'ORDER_RECEIVED',
      'ITEM_ASSIGNED': 'ASSIGNED',
      'WASH_REQUEST_COMPLETED': 'WASH_COMPLETED',
      'PATTERN_REQUEST_COMPLETED': 'PATTERN_CREATED',
      'CUTTING_REQUEST_COMPLETED': 'CUTTING_COMPLETED',
      'QC_REQUEST_COMPLETED': 'QC_COMPLETED',
      'FINISHING_REQUEST_COMPLETED': 'FINISHING_COMPLETED',
      'PACKING_REQUEST_COMPLETED': 'PACKED',
      'COURIER_PICKUP_COMPLETED': 'SHIPPED'
    };

    // Find the most recent event that maps to a milestone
    for (const event of events) {
      if (stageMapping[event.type]) {
        return stageMapping[event.type];
      }
    }

    return 'ORDER_RECEIVED';
  }

  private getNextMilestone(currentStage: string): MilestoneDefinition {
    const currentIndex = this.MILESTONES.findIndex(m => m.stage === currentStage);
    return this.MILESTONES[currentIndex + 1] || this.MILESTONES[this.MILESTONES.length - 1];
  }

  private calculateTimingStatus(currentDay: number, targetDay: number): TimingStatus {
    const buffer = 2; // Days of buffer before considering "BEHIND"
    
    if (currentDay <= targetDay) {
      return 'ON_TIME';
    } else if (currentDay <= targetDay + buffer) {
      return 'BEHIND';
    } else {
      return 'LATE';
    }
  }

  private assessRisk(currentDay: number, currentStage: string): boolean {
    // Special check for QC target
    if (currentDay >= this.QC_TARGET_DAY && 
        !['QC_COMPLETED', 'FINISHING_COMPLETED', 'PACKED', 'SHIPPED'].includes(currentStage)) {
      return true;
    }

    const currentMilestone = this.MILESTONES.find(m => m.stage === currentStage);
    if (!currentMilestone) return true;

    // Consider at risk if more than 3 days behind on any critical path milestone
    return currentMilestone.criticalPath && (currentDay - currentMilestone.targetDay > 3);
  }

  async updateTimingStatus(orderId: string): Promise<void> {
    const timing = await this.getOrderTiming(orderId);

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        metadata: {
          timing_status: timing.status,
          current_day: timing.currentDay,
          days_remaining: timing.daysRemaining,
          is_at_risk: timing.isAtRisk,
          last_updated: new Date()
        }
      }
    });

    // Log status changes
    if (timing.status === 'BEHIND' || timing.status === 'LATE') {
      await this.eventLogger.logEvent({
        type: 'ORDER_STATUS_CHANGED',
        orderId,
        actorId: 'SYSTEM',
        metadata: {
          timing_status: timing.status,
          current_stage: timing.currentStage,
          days_elapsed: timing.currentDay,
          days_remaining: timing.daysRemaining,
          is_at_risk: timing.isAtRisk
        }
      });
    }
  }

  async getProductionMetrics(dateRange?: { start: Date; end: Date }) {
    const orders = await this.prisma.order.findMany({
      where: {
        created_at: dateRange ? {
          gte: dateRange.start,
          lte: dateRange.end
        } : undefined
      },
      include: {
        events: true
      }
    });

    const metrics = {
      totalOrders: orders.length,
      onTimeOrders: 0,
      behindOrders: 0,
      lateOrders: 0,
      averageCycleTime: 0,
      ordersAtRisk: 0,
      stageBreakdown: {} as Record<string, number>
    };

    let totalCycleTime = 0;
    let completedOrders = 0;

    for (const order of orders) {
      const timing = await this.getOrderTiming(order.id);
      
      // Count by status
      metrics[`${timing.status.toLowerCase()}Orders`]++;
      if (timing.isAtRisk) metrics.ordersAtRisk++;

      // Track stages
      metrics.stageBreakdown[timing.currentStage] = 
        (metrics.stageBreakdown[timing.currentStage] || 0) + 1;

      // Calculate cycle time for completed orders
      if (timing.currentStage === 'SHIPPED') {
        const cycleTime = timing.currentDay;
        totalCycleTime += cycleTime;
        completedOrders++;
      }
    }

    metrics.averageCycleTime = completedOrders > 0 ? 
      totalCycleTime / completedOrders : 0;

    return metrics;
  }
} 