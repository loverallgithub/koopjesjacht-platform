import React from 'react';
import { Box, Container, Grid, Typography, Link, IconButton } from '@mui/material';
import { Facebook, Twitter, Instagram, LinkedIn } from '@mui/icons-material';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'grey.900',
        color: 'white',
        py: 6,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* About Section */}
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
              Koopjesjacht
            </Typography>
            <Typography variant="body2" sx={{ color: 'grey.400' }}>
              The ultimate meal scavenger hunt experience. Discover hidden gems,
              compete with friends, and win amazing prizes!
            </Typography>
          </Grid>

          {/* Quick Links */}
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="/hunts" color="inherit" underline="hover">
                Browse Hunts
              </Link>
              <Link href="/how-it-works" color="inherit" underline="hover">
                How It Works
              </Link>
              <Link href="/venues" color="inherit" underline="hover">
                For Venues
              </Link>
              <Link href="/organizers" color="inherit" underline="hover">
                For Organizers
              </Link>
            </Box>
          </Grid>

          {/* Contact & Social */}
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
              Connect With Us
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <IconButton
                color="inherit"
                aria-label="Facebook"
                size="small"
                sx={{ color: 'grey.400' }}
              >
                <Facebook />
              </IconButton>
              <IconButton
                color="inherit"
                aria-label="Twitter"
                size="small"
                sx={{ color: 'grey.400' }}
              >
                <Twitter />
              </IconButton>
              <IconButton
                color="inherit"
                aria-label="Instagram"
                size="small"
                sx={{ color: 'grey.400' }}
              >
                <Instagram />
              </IconButton>
              <IconButton
                color="inherit"
                aria-label="LinkedIn"
                size="small"
                sx={{ color: 'grey.400' }}
              >
                <LinkedIn />
              </IconButton>
            </Box>
            <Typography variant="body2" sx={{ color: 'grey.400' }}>
              Email: support@koopjesjacht.nl
            </Typography>
          </Grid>
        </Grid>

        {/* Copyright */}
        <Box sx={{ borderTop: '1px solid', borderColor: 'grey.800', mt: 4, pt: 3 }}>
          <Typography variant="body2" align="center" sx={{ color: 'grey.500' }}>
            © {new Date().getFullYear()} Koopjesjacht B.V. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
