import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Avatar,
  Stack,
  Chip,
} from '@mui/material';
import {
  RestaurantMenu,
  QrCode2,
  EmojiEvents,
  ArrowForward,
  PersonAdd,
  Explore,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Explore sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Discover Hidden Gems',
      description:
        'Explore amazing restaurants and venues you never knew existed in your city.',
    },
    {
      icon: <QrCode2 sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Scan QR Codes',
      description:
        'Visit each venue, scan QR codes, and unlock the next clue in your culinary adventure.',
    },
    {
      icon: <EmojiEvents sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Win Prizes',
      description:
        'Compete with other teams and win amazing prizes, discounts, and bragging rights!',
    },
  ];

  const steps = [
    {
      number: '1',
      title: 'Choose Your Hunt',
      description: 'Browse available hunts and pick one that excites you.',
    },
    {
      number: '2',
      title: 'Form a Team',
      description: 'Gather your friends or join an existing team.',
    },
    {
      number: '3',
      title: 'Hunt & Win',
      description: 'Follow clues, visit venues, and race to the finish!',
    },
  ];

  const testimonials = [
    {
      name: 'Emma van der Berg',
      role: 'Hunter',
      avatar: 'E',
      quote:
        'Best weekend activity ever! We discovered 5 new restaurants and had a blast competing.',
      rating: 5,
    },
    {
      name: 'Lars Janssen',
      role: 'Organizer',
      avatar: 'L',
      quote:
        'Organizing a hunt was super easy. The AI clue generator is brilliant!',
      rating: 5,
    },
    {
      name: 'Sophie Bakker',
      role: 'Venue Owner',
      avatar: 'S',
      quote:
        'Great way to attract new customers. We see 20+ new faces every hunt!',
      rating: 5,
    },
  ];

  const stats = [
    { value: '40,000+', label: 'Happy Hunters' },
    { value: '5,000+', label: 'Hunts Completed' },
    { value: '500+', label: 'Partner Venues' },
    { value: '€156K', label: 'Monthly Prizes' },
  ];

  return (
    <>
      <Helmet>
        <title>Koopjesjacht - The Ultimate Meal Scavenger Hunt</title>
        <meta
          name="description"
          content="Join the ultimate meal scavenger hunt experience. Discover hidden restaurants, compete with friends, and win amazing prizes!"
        />
      </Helmet>

      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #FF6B35 0%, #004E89 100%)',
          color: 'white',
          py: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  fontWeight: 800,
                  mb: 2,
                }}
              >
                The Ultimate Meal Scavenger Hunt
              </Typography>
              <Typography
                variant="h5"
                sx={{ mb: 4, opacity: 0.95, fontWeight: 400 }}
              >
                Discover amazing restaurants, solve clever clues, and compete
                for prizes in the most delicious adventure in your city!
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PersonAdd />}
                  onClick={() => navigate('/register')}
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    '&:hover': {
                      bgcolor: 'grey.100',
                    },
                  }}
                >
                  Start Your Adventure
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/hunts')}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  Browse Hunts
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  position: 'relative',
                  display: { xs: 'none', md: 'block' },
                }}
              >
                <RestaurantMenu
                  sx={{
                    fontSize: 400,
                    opacity: 0.2,
                    position: 'absolute',
                    right: -50,
                    top: -50,
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box sx={{ py: 6, bgcolor: 'grey.50' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {stats.map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* How It Works Section */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Typography
          variant="h2"
          align="center"
          sx={{ mb: 2, fontWeight: 700 }}
        >
          How It Works
        </Typography>
        <Typography
          variant="h6"
          align="center"
          color="text.secondary"
          sx={{ mb: 6 }}
        >
          Get started in 3 simple steps
        </Typography>

        <Grid container spacing={4}>
          {steps.map((step, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card
                sx={{
                  height: '100%',
                  textAlign: 'center',
                  boxShadow: 3,
                  transition: 'transform 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Avatar
                    sx={{
                      width: 60,
                      height: 60,
                      bgcolor: 'primary.main',
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    {step.number}
                  </Avatar>
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                    {step.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {step.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Features Section */}
      <Box sx={{ bgcolor: 'grey.50', py: 10 }}>
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            align="center"
            sx={{ mb: 2, fontWeight: 700 }}
          >
            Why Choose Koopjesjacht?
          </Typography>
          <Typography
            variant="h6"
            align="center"
            color="text.secondary"
            sx={{ mb: 6 }}
          >
            The most exciting way to explore your city
          </Typography>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    textAlign: 'center',
                    p: 3,
                  }}
                >
                  <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Typography
          variant="h2"
          align="center"
          sx={{ mb: 2, fontWeight: 700 }}
        >
          What People Say
        </Typography>
        <Typography
          variant="h6"
          align="center"
          color="text.secondary"
          sx={{ mb: 6 }}
        >
          Join thousands of satisfied users
        </Typography>

        <Grid container spacing={4}>
          {testimonials.map((testimonial, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card sx={{ height: '100%', p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: 'secondary.main',
                      mr: 2,
                      width: 50,
                      height: 50,
                    }}
                  >
                    {testimonial.avatar}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {testimonial.name}
                    </Typography>
                    <Chip
                      label={testimonial.role}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </Box>
                <Typography
                  variant="body1"
                  sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                >
                  "{testimonial.quote}"
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} style={{ color: '#FFD700', fontSize: 20 }}>
                      ★
                    </span>
                  ))}
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 8,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h3" sx={{ mb: 2, fontWeight: 700 }}>
            Ready to Start Your Adventure?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Join thousands of hunters and discover your city like never before
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<PersonAdd />}
            onClick={() => navigate('/register')}
            sx={{
              bgcolor: 'white',
              color: 'primary.main',
              px: 5,
              py: 2,
              fontSize: '1.2rem',
              fontWeight: 600,
              '&:hover': {
                bgcolor: 'grey.100',
              },
            }}
          >
            Sign Up Now - It's Free!
          </Button>
        </Container>
      </Box>
    </>
  );
};

export default Home;
