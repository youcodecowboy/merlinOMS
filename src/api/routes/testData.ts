import { Router } from 'express';
import { Order } from '../models/Order';
import { Item } from '../models/Item';
import { Request } from '../models/Request';

const router = Router();

// Middleware to ensure we're in dev/test environment
const ensureDevEnvironment = (req, res, next) => {
  const allowedEnvs = ['development', 'test'];
  if (!allowedEnvs.includes(process.env.NODE_ENV)) {
    return res.status(403).json({ 
      error: 'This endpoint is only available in development/test environments' 
    });
  }
  next();
};

// Apply the middleware to all routes in this router
router.use(ensureDevEnvironment);

// Endpoint to clear orders
router.delete('/orders/clear-test-data', async (req, res) => {
  try {
    await Order.deleteMany({});
    res.status(200).json({ message: 'Orders cleared successfully' });
  } catch (error) {
    console.error('Error clearing orders:', error);
    res.status(500).json({ error: 'Failed to clear orders' });
  }
});

// Endpoint to clear items
router.delete('/items/clear-test-data', async (req, res) => {
  try {
    await Item.deleteMany({});
    res.status(200).json({ message: 'Items cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear items' });
  }
});

// Endpoint to clear requests
router.delete('/requests/clear-test-data', async (req, res) => {
  try {
    await Request.deleteMany({});
    res.status(200).json({ message: 'Requests cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear requests' });
  }
});

export default router; 