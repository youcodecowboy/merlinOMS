// Test data factories for generating test entities
import { faker } from '@faker-js/faker';
import { SKUService } from '../../services/sku.service';

export class TestFactories {
  private skuService: SKUService;

  constructor() {
    this.skuService = new SKUService();
  }

  createRandomSKU(): string {
    const styles = ['ST', 'CT', 'RT'];
    const waists = Array.from({length: 26}, (_, i) => (i + 23).toString().padStart(2, '0'));
    const shapes = ['X', 'Y'];
    const lengths = Array.from({length: 13}, (_, i) => (i + 24).toString().padStart(2, '0'));
    const washes = ['RAW', 'IND', 'STA', 'ONX', 'BRW', 'JAG'];

    return [
      faker.helpers.arrayElement(styles),
      faker.helpers.arrayElement(waists),
      faker.helpers.arrayElement(shapes),
      faker.helpers.arrayElement(lengths),
      faker.helpers.arrayElement(washes)
    ].join('-');
  }

  createRandomOrder() {
    return {
      shopify_id: faker.string.uuid(),
      customer: {
        shopify_id: faker.string.uuid(),
        email: faker.internet.email()
      },
      order_items: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
        target_sku: this.createRandomSKU()
      }))
    };
  }

  createRandomInventoryItem() {
    return {
      sku: this.createRandomSKU(),
      status1: 'STOCK',
      status2: 'UNCOMMITTED'
    };
  }
} 