import { PrismaClient } from '@prisma/client';
import { EventLoggerService } from './event-logger.service';
import { NotificationService } from './notification.service';
import { LocationManagementService } from './location-management.service';

export type ProblemSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ProblemCategory = 
  | 'MEASUREMENT'
  | 'STITCHING'
  | 'FABRIC'
  | 'WASH'
  | 'HARDWARE'
  | 'PATTERN'
  | 'OTHER';

interface ProblemReport {
  itemId: string;
  category: ProblemCategory;
  severity: ProblemSeverity;
  description: string;
  images?: string[];
  discoveredDuring: string; // e.g., 'QC', 'WASH', 'FINISHING'
  discoveredBy: string;
  location: string;
}

export class RecoveryService {
  private readonly DEFECT_BIN_ID = process.env.DEFECT_BIN_ID;

  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService,
    private notificationService: NotificationService,
    private locationService: LocationManagementService
  ) {}

  async reportProblem(params: {
    problem: ProblemReport;
    actorId: string;
  }) {
    const { problem, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      // Create problem record
      const problemRecord = await tx.problem.create({
        data: {
          category: problem.category,
          severity: problem.severity,
          description: problem.description,
          images: problem.images || [],
          discovered_during: problem.discoveredDuring,
          discovered_by: problem.discoveredBy,
          discovery_location: problem.location,
          status: 'PENDING_REVIEW',
          item: {
            connect: { id: problem.itemId }
          },
          metadata: {
            reported_at: new Date(),
            reported_by: actorId
          }
        }
      });

      // Update item status
      await tx.inventoryItem.update({
        where: { id: problem.itemId },
        data: {
          status1: 'PROBLEM',
          metadata: {
            problem_id: problemRecord.id,
            previous_status: problem.discoveredDuring
          }
        }
      });

      // Create move request to defect bin
      const moveRequest = await tx.request.create({
        data: {
          type: 'MOVE',
          status: 'PENDING',
          item_id: problem.itemId,
          metadata: {
            target_bin_id: this.DEFECT_BIN_ID,
            reason: 'Problem reported - moving to defect review',
            priority: problem.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
            problem_id: problemRecord.id
          }
        }
      });

      // Create notifications
      await this.notificationService.createNotification({
        type: 'PROBLEM_REPORTED',
        requestId: moveRequest.id,
        metadata: {
          itemId: problem.itemId,
          problemId: problemRecord.id,
          severity: problem.severity,
          category: problem.category,
          requiresImmediate: problem.severity === 'CRITICAL'
        },
        actorId
      });

      // Log events
      await this.eventLogger.logEvent({
        type: 'PROBLEM_REPORTED',
        actorId,
        itemId: problem.itemId,
        metadata: {
          problem_id: problemRecord.id,
          category: problem.category,
          severity: problem.severity,
          move_request_id: moveRequest.id
        }
      });

      return {
        problemId: problemRecord.id,
        moveRequestId: moveRequest.id
      };
    });
  }

  async reviewProblem(params: {
    problemId: string;
    resolution: {
      action: 'REPAIR' | 'SCRAP' | 'DOWNGRADE';
      notes: string;
      estimatedCost?: number;
      targetDate?: Date;
    };
    actorId: string;
  }) {
    const { problemId, resolution, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      const problem = await tx.problem.findUnique({
        where: { id: problemId },
        include: { item: true }
      });

      if (!problem) throw new Error('Problem not found');

      // Update problem status
      await tx.problem.update({
        where: { id: problemId },
        data: {
          status: 'REVIEWED',
          resolution: resolution,
          metadata: {
            ...problem.metadata,
            reviewed_at: new Date(),
            reviewed_by: actorId
          }
        }
      });

      // Create recovery request if repairable
      if (resolution.action === 'REPAIR') {
        const recoveryRequest = await tx.request.create({
          data: {
            type: 'RECOVERY',
            status: 'PENDING',
            item_id: problem.item_id,
            metadata: {
              problem_id: problemId,
              target_date: resolution.targetDate,
              estimated_cost: resolution.estimatedCost,
              notes: resolution.notes
            }
          }
        });

        await this.notificationService.createNotification({
          type: 'RECOVERY_REQUEST_CREATED',
          requestId: recoveryRequest.id,
          metadata: {
            itemId: problem.item_id,
            problemId,
            targetDate: resolution.targetDate
          },
          actorId
        });
      }

      // Update item status based on resolution
      const newStatus = resolution.action === 'SCRAP' ? 'SCRAPPED' : 
                       resolution.action === 'DOWNGRADE' ? 'DOWNGRADED' : 
                       'PENDING_REPAIR';

      await tx.inventoryItem.update({
        where: { id: problem.item_id },
        data: {
          status1: newStatus,
          metadata: {
            ...problem.item.metadata,
            resolution_action: resolution.action,
            resolution_date: new Date()
          }
        }
      });

      // Log events
      await this.eventLogger.logEvent({
        type: 'PROBLEM_REVIEWED',
        actorId,
        itemId: problem.item_id,
        metadata: {
          problem_id: problemId,
          resolution_action: resolution.action,
          new_status: newStatus
        }
      });
    });
  }

  async getProblemSummary(itemId: string) {
    const problems = await this.prisma.problem.findMany({
      where: { item_id: itemId },
      orderBy: { created_at: 'desc' },
      include: {
        item: true
      }
    });

    return {
      totalProblems: problems.length,
      openProblems: problems.filter(p => p.status === 'PENDING_REVIEW').length,
      problemHistory: problems.map(p => ({
        id: p.id,
        category: p.category,
        severity: p.severity,
        status: p.status,
        discoveredDuring: p.discovered_during,
        discoveredAt: p.created_at,
        resolution: p.resolution
      }))
    };
  }
} 