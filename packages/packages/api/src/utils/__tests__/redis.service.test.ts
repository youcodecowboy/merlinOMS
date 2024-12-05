import Redis from 'ioredis-mock';
import { redisService } from '../redis.service';

jest.mock('ioredis', () => require('ioredis-mock'));

describe('RedisService', () => {
  // ... rest of tests
}); 