import { Router } from 'express';
import { OrderRoutes } from './order.routes';
import { CustomerRoutes } from './customer.routes';
import { ProductionRoutes } from './production.routes';
import { SewingRoutes } from './sewing.routes';
import { QCRoutes } from './qc.routes';
import { WashRoutes } from './wash.routes';
import { BinRoutes } from './bin.routes';
import { PackingRoutes } from './packing.routes';
import { ShippingRoutes } from './shipping.routes';
import { CoreRoutes } from './core.routes';
import { AnalyticsRoutes } from './analytics.routes';
import { TimelineRoutes } from './timeline.routes';
import { RecoveryRoutes } from './recovery.routes';
import { InventoryRoutes } from './inventory.routes';

const router = Router();

// Order Management
router.use('/orders', new OrderRoutes().router);
router.use('/customers', new CustomerRoutes().router);

// Production Flow
router.use('/production', new ProductionRoutes().router);
router.use('/sewing', new SewingRoutes().router);
router.use('/qc', new QCRoutes().router);
router.use('/wash', new WashRoutes().router);

// Inventory & Location Management
router.use('/inventory', new InventoryRoutes().router);
router.use('/bins', new BinRoutes().router);

// Shipping & Packing
router.use('/packing', new PackingRoutes().router);
router.use('/shipping', new ShippingRoutes().router);

// Support & Analytics
router.use('/core', new CoreRoutes().router);
router.use('/analytics', new AnalyticsRoutes().router);
router.use('/timeline', new TimelineRoutes().router);
router.use('/recovery', new RecoveryRoutes().router);

export default router; 