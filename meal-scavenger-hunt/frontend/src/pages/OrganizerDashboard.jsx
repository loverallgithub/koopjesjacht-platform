import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const OrganizerDashboard = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Organizer Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Organizer management dashboard coming soon...
        </Typography>
      </Box>
    </Container>
  );
};

export default OrganizerDashboard;
