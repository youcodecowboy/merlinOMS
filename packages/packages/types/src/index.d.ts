import type { PrismaClient, User, Order, Customer, InventoryItem, Request, Event, Bin, BinHistory, UserRole, BinType, RequestType, RequestStatus, Notification, UserProfile, CustomerProfile } from '@prisma/client';
export type { User, Order, Customer, InventoryItem, Request, Event, Bin, BinHistory, UserRole, BinType, RequestType, RequestStatus, Notification, UserProfile, CustomerProfile };
export interface ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}
export type PrismaTransaction = Omit<ReturnType<typeof PrismaClient['prototype']['$transaction']>, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>;
export type EventType = 'ORDER_CREATED' | 'ORDER_UPDATED' | 'ORDER_CANCELLED' | 'ITEM_CREATED' | 'ITEM_UPDATED' | 'ITEM_MOVED' | 'REQUEST_CREATED' | 'REQUEST_UPDATED' | 'REQUEST_COMPLETED';
export interface EventMetadata {
    [key: string]: any;
}
