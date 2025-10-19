import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Skeleton,
} from '@mui/material';
import {
  Search,
  LocationOn,
  People,
  EmojiEvents,
  CalendarToday,
  ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Helmet } from 'react-helmet-async';
import { fetchHunts, setFilters } from '../store/slices/huntSlice';
import { format } from 'date-fns';

const HuntList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { hunts, filters, isLoading } = useSelector((state) => state.hunt);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    dispatch(fetchHunts(filters));
  }, [dispatch, filters]);

  const handleFilterChange = (filterName, value) => {
    dispatch(setFilters({ [filterName]: value }));
  };

  // Mock data for now (until backend is fully integrated)
  const mockHunts = [
    {
      id: 'hunt-001',
      title: 'Amsterdam Food Tour',
      description: 'Discover the best hidden restaurants in Amsterdam!',
      start_time: new Date(2025, 9, 25, 14, 0),
      entry_fee: 25.0,
      max_teams: 10,
      total_prize_pool: 500,
      difficulty_level: 3,
      status: 'scheduled',
      city: 'Amsterdam',
      image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400',
      participating_venues: 6,
    },
    {
      id: 'hunt-002',
      title: 'Den Haag Culinary Challenge',
      description: 'A foodie adventure through The Hague!',
      start_time: new Date(2025, 9, 28, 12, 0),
      entry_fee: 30.0,
      max_teams: 8,
      total_prize_pool: 600,
      difficulty_level: 4,
      status: 'scheduled',
      city: 'Den Haag',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
      participating_venues: 5,
    },
    {
      id: 'hunt-003',
      title: 'Rotterdam Street Food Hunt',
      description: 'Find the best street food in Rotterdam!',
      start_time: new Date(2025, 10, 2, 15, 0),
      entry_fee: 20.0,
      max_teams: 12,
      total_prize_pool: 400,
      difficulty_level: 2,
      status: 'scheduled',
      city: 'Rotterdam',
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
      participating_venues: 4,
    },
  ];

  const displayHunts = hunts.length > 0 ? hunts : mockHunts;

  const filteredHunts = displayHunts.filter((hunt) =>
    hunt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hunt.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDifficultyColor = (level) => {
    if (level <= 2) return 'success';
    if (level <= 3) return 'warning';
    return 'error';
  };

  const getDifficultyLabel = (level) => {
    if (level <= 2) return 'Easy';
    if (level <= 3) return 'Medium';
    return 'Hard';
  };

  return (
    <>
      <Helmet>
        <title>Browse Hunts - Koopjesjacht</title>
      </Helmet>

      <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
              Available Hunts
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Choose your next culinary adventure
            </Typography>
          </Box>

          {/* Filters */}
          <Box sx={{ mb: 4 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="Search hunts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Difficulty</InputLabel>
                  <Select
                    value={filters.difficulty}
                    label="Difficulty"
                    onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                  >
                    <MenuItem value="all">All Levels</MenuItem>
                    <MenuItem value="easy">Easy</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="hard">Hard</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status"
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="scheduled">Upcoming</MenuItem>
                    <MenuItem value="active">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Price</InputLabel>
                  <Select
                    value={filters.priceRange}
                    label="Price"
                    onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                  >
                    <MenuItem value="all">All Prices</MenuItem>
                    <MenuItem value="free">Free</MenuItem>
                    <MenuItem value="0-25">€0 - €25</MenuItem>
                    <MenuItem value="25-50">€25 - €50</MenuItem>
                    <MenuItem value="50+">€50+</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* Hunt Cards */}
          <Grid container spacing={3}>
            {isLoading ? (
              // Loading skeletons
              [1, 2, 3].map((i) => (
                <Grid item xs={12} md={4} key={i}>
                  <Card>
                    <Skeleton variant="rectangular" height={200} />
                    <CardContent>
                      <Skeleton variant="text" height={40} />
                      <Skeleton variant="text" />
                      <Skeleton variant="text" />
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : filteredHunts.length > 0 ? (
              filteredHunts.map((hunt) => (
                <Grid item xs={12} md={4} key={hunt.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.3s, box-shadow 0.3s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6,
                      },
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="200"
                      image={hunt.image}
                      alt={hunt.title}
                    />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                        {hunt.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                      >
                        {hunt.description}
                      </Typography>

                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationOn fontSize="small" color="action" />
                          <Typography variant="body2">{hunt.city}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarToday fontSize="small" color="action" />
                          <Typography variant="body2">
                            {format(hunt.start_time, 'MMM dd, yyyy - HH:mm')}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <People fontSize="small" color="action" />
                          <Typography variant="body2">
                            Max {hunt.max_teams} teams
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmojiEvents fontSize="small" color="action" />
                          <Typography variant="body2">
                            €{hunt.total_prize_pool} prize pool
                          </Typography>
                        </Box>
                      </Stack>

                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Chip
                          label={getDifficultyLabel(hunt.difficulty_level)}
                          color={getDifficultyColor(hunt.difficulty_level)}
                          size="small"
                        />
                        <Chip
                          label={`€${hunt.entry_fee}`}
                          variant="outlined"
                          size="small"
                        />
                        <Chip
                          label={`${hunt.participating_venues} stops`}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        endIcon={<ArrowForward />}
                        onClick={() => navigate(`/hunts/${hunt.id}`)}
                      >
                        View Details
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h6" color="text.secondary">
                    No hunts found matching your criteria
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Container>
      </Box>
    </>
  );
};

export default HuntList;
