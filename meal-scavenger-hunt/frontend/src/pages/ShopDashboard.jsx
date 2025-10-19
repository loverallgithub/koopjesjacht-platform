import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const ShopDashboard = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Venue Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Venue management dashboard coming soon...
        </Typography>
      </Box>
    </Container>
  );
};

export default ShopDashboard;
