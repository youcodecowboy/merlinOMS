import { lazy } from 'react';

// Add this near your other lazy imports
const QualityCheckPage = lazy(() => import('./pages/quality-check'));

// In your routes configuration:
export const routes = [
  // ... existing routes ...
  {
    path: '/quality-check',
    element: <QualityCheckPage />,
    permission: 'quality_check.view' // adjust permission as needed
  },
  // ... other routes ...
]; 