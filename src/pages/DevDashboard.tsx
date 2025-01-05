import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { ClearTestDataButton } from '../components/ClearTestDataButton';

export const DevDashboard = () => {
  const handleDataCleared = () => {
    // Refresh any necessary dashboard data after clearing
    window.location.reload();
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Developer Dashboard
      </Typography>
      
      <Box my={3}>
        <Typography variant="h6" gutterBottom>
          Test Data Management
        </Typography>
        <Box mt={2}>
          <ClearTestDataButton onClearComplete={handleDataCleared} />
        </Box>
      </Box>
      
      <Divider />
      {/* Other dashboard content */}
    </Box>
  );
}; 