import { PrismaClient } from '@prisma/client';
import { 
  ServiceResponse,
  UserRole,
  EventType
} from '@app/types';
import { TypeValidator } from '@app/utils';
import { EventLoggerService } from './event-logger.service';

interface UserCreationParams {
  email: string;
  role: UserRole;
  profile?: {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    photoUrl?: string;
  };
}

interface UserUpdateParams {
  userId: string;
  role?: UserRole;
  profile?: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    photoUrl?: string;
  };
  settings?: Record<string, any>;
}

export class UserManagementService {
  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService
  ) {}

  async createUser(params: UserCreationParams): Promise<ServiceResponse<any>> {
    const { email, role, profile } = params;

    return this.prisma.$transaction(async (tx) => {
      // Check if user already exists
      const existingUser = await tx.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return {
          success: false,
          error: 'User already exists'
        };
      }

      // Create user
      const user = await tx.user.create({
        data: {
          email,
          role,
          profile: profile ? {
            create: {
              firstName: profile.firstName,
              lastName: profile.lastName,
              phoneNumber: profile.phoneNumber,
              photoUrl: profile.photoUrl,
              settings: {}
            }
          } : undefined
        },
        include: {
          profile: true
        }
      });

      // Log event
      await this.eventLogger.logEvent({
        type: 'USER_CREATED',
        actorId: 'SYSTEM',
        metadata: {
          user_id: user.id,
          email,
          role
        }
      });

      return {
        success: true,
        data: user
      };
    });
  }

  async updateUser(params: UserUpdateParams): Promise<ServiceResponse<any>> {
    const { userId, role, profile, settings } = params;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { profile: true }
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Update user role if provided
      if (role) {
        await tx.user.update({
          where: { id: userId },
          data: { role }
        });

        await this.eventLogger.logEvent({
          type: 'ROLE_UPDATED',
          actorId: 'SYSTEM',
          metadata: {
            user_id: userId,
            previous_role: user.role,
            new_role: role
          }
        });
      }

      // Update profile if provided
      if (profile) {
        if (user.profile) {
          await tx.userProfile.update({
            where: { userId },
            data: profile
          });
        } else {
          await tx.userProfile.create({
            data: {
              ...profile,
              userId,
              settings: {}
            }
          });
        }

        await this.eventLogger.logEvent({
          type: 'PROFILE_UPDATED',
          actorId: 'SYSTEM',
          metadata: {
            user_id: userId,
            updated_fields: Object.keys(profile)
          }
        });
      }

      // Update settings if provided
      if (settings && user.profile) {
        await tx.userProfile.update({
          where: { userId },
          data: {
            settings: {
              ...user.profile.settings,
              ...settings
            }
          }
        });
      }

      const updatedUser = await tx.user.findUnique({
        where: { id: userId },
        include: { profile: true }
      });

      return {
        success: true,
        data: updatedUser
      };
    });
  }

  async getUsersByRole(role: UserRole): Promise<ServiceResponse<any>> {
    const users = await this.prisma.user.findMany({
      where: { role },
      include: { profile: true }
    });

    return {
      success: true,
      data: users
    };
  }

  async deactivateUser(userId: string): Promise<ServiceResponse<any>> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        profile: {
          update: {
            settings: {
              active: false,
              deactivated_at: new Date()
            }
          }
        }
      }
    });

    await this.eventLogger.logEvent({
      type: 'USER_DEACTIVATED',
      actorId: 'SYSTEM',
      metadata: {
        user_id: userId,
        email: user.email,
        role: user.role
      }
    });

    return {
      success: true,
      data: user
    };
  }

  async getUserNotificationPreferences(userId: string): Promise<ServiceResponse<any>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true
      }
    });

    if (!user || !user.profile) {
      return {
        success: false,
        error: 'User or profile not found'
      };
    }

    return {
      success: true,
      data: user.profile.settings?.notifications || {}
    };
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: Record<string, boolean>
  ): Promise<ServiceResponse<any>> {
    const user = await this.prisma.userProfile.update({
      where: { userId },
      data: {
        settings: {
          notifications: preferences
        }
      }
    });

    await this.eventLogger.logEvent({
      type: 'PREFERENCES_UPDATED',
      actorId: userId,
      metadata: {
        preferences_type: 'notifications',
        updated_settings: Object.keys(preferences)
      }
    });

    return {
      success: true,
      data: user
    };
  }
} 