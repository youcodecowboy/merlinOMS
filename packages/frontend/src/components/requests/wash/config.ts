import { Step } from '../MultiStepRequest';
import { ValidateItem } from './steps/ValidateItem';
import { StartWash } from './steps/StartWash';
import { CompleteWash } from './steps/CompleteWash';

export const washSteps: Step[] = [
  {
    id: 'validate_item',
    title: 'Validate Item',
    description: 'Scan or enter the QR code of the item to be washed',
    component: ValidateItem,
    validation: async (data) => {
      // Add any additional validation logic here
      return true;
    }
  },
  {
    id: 'start_wash',
    title: 'Start Wash',
    description: 'Configure and start the washing process',
    component: StartWash,
    validation: async (data) => {
      // Validate wash parameters
      const { washType, temperature } = data;
      return Boolean(washType && temperature);
    }
  },
  {
    id: 'complete_wash',
    title: 'Complete Wash',
    description: 'Perform quality checks and complete the wash process',
    component: CompleteWash,
    validation: async (data) => {
      // Validate completion requirements
      const { completedChecks, qualityScore, notes } = data;
      return Boolean(
        completedChecks?.length === 4 && // All checks completed
        qualityScore >= 1 && 
        qualityScore <= 10 && 
        notes
      );
    }
  }
]; 