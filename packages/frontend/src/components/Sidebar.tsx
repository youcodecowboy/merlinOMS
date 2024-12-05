import { Dashboard, LocalLaundryService, CheckCircleOutline } from '@mui/icons-material';

export const navItems = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: <Dashboard />
  },
  {
    key: 'wash',
    label: 'Wash',
    path: '/wash',
    icon: <LocalLaundryService />
  },
  {
    key: 'quality-check',
    label: 'Quality Check',
    path: '/quality-check',
    icon: <CheckCircleOutline />
  }
] as const; 