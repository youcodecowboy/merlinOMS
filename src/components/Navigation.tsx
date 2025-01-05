import React from 'react';
import { Link } from 'react-router-dom';
import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import DeveloperModeIcon from '@mui/icons-material/DeveloperMode';

// ... existing imports ...

export const Navigation = () => {
  return (
    <List>
      {/* ... existing navigation items ... */}
      
      <ListItem component={Link} to="/dev">
        <ListItemIcon>
          <DeveloperModeIcon />
        </ListItemIcon>
        <ListItemText primary="Dev Tools" />
      </ListItem>
    </List>
  );
}; 