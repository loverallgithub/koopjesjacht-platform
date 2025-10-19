import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  Chip,
  Avatar,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import {
  LocationOn,
  CalendarToday,
  People,
  EuroSymbol,
  Star,
  Timer,
  Restaurant,
  QrCode,
  Share,
  Favorite,
  FavoriteBorder,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import huntService from '../services/huntService';

const HuntDetail = () => {
  const { huntId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [hunt, setHunt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamSize, setTeamSize] = useState(2);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchHuntDetails();
  }, [huntId]);

  const fetchHuntDetails = async () => {
    try {
      setLoading(true);
      const data = await huntService.getHuntById(huntId);
      setHunt(data);

      // Check if user has favorited this hunt
      if (isAuthenticated) {
        const favorites = await huntService.getUserFavorites();
        setIsFavorite(favorites.some(fav => fav.id === huntId));
      }
    } catch (error) {
      toast.error('Failed to load hunt details');
      console.error('Error fetching hunt:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinHunt = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to join a hunt');
      navigate('/login', { state: { returnTo: `/hunts/${huntId}` } });
      return;
    }

    try {
      setJoining(true);
      const result = await huntService.joinHunt(huntId, {
        team_name: teamName,
        team_size: teamSize,
      });

      toast.success(`Successfully joined "${hunt.title}"!`);
      setJoinDialogOpen(false);
      navigate(`/team/${result.team_id}`);
    } catch (error) {
      toast.error(error.message || 'Failed to join hunt');
    } finally {
      setJoining(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to save favorites');
      navigate('/login');
      return;
    }

    try {
      if (isFavorite) {
        await huntService.removeFavorite(huntId);
        setIsFavorite(false);
        toast.success('Removed from favorites');
      } else {
        await huntService.addFavorite(huntId);
        setIsFavorite(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `Check out this scavenger hunt: ${hunt.title}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: hunt.title,
          text: shareText,
          url: shareUrl,
        });
        toast.success('Shared successfully!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard!');
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 1:
      case 2:
        return 'success';
      case 3:
        return 'warning';
      case 4:
      case 5:
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'info';
      case 'active':
        return 'success';
      case 'completed':
        return 'default';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>
          Loading hunt details...
        </Typography>
      </Container>
    );
  }

  if (!hunt) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Hunt not found</Alert>
        <Button onClick={() => navigate('/hunts')} sx={{ mt: 2 }}>
          Back to Hunts
        </Button>
      </Container>
    );
  }

  const spotsAvailable = hunt.max_teams - hunt.teams_registered;
  const spotsPercentage = (hunt.teams_registered / hunt.max_teams) * 100;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Grid container spacing={4}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Hero Image */}
          <Card elevation={3}>
            <CardMedia
              component="img"
              height="400"
              image={hunt.image_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800'}
              alt={hunt.title}
            />
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h4" gutterBottom>
                    {hunt.title}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip
                      label={hunt.status}
                      color={getStatusColor(hunt.status)}
                      size="small"
                    />
                    <Chip
                      icon={<Star />}
                      label={`Difficulty ${hunt.difficulty}/5`}
                      color={getDifficultyColor(hunt.difficulty)}
                      size="small"
                    />
                    <Chip
                      icon={<Restaurant />}
                      label={`${hunt.venues_count || 5} Venues`}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={isFavorite ? <Favorite /> : <FavoriteBorder />}
                    onClick={handleToggleFavorite}
                    color={isFavorite ? 'error' : 'inherit'}
                  >
                    {isFavorite ? 'Saved' : 'Save'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Share />}
                    onClick={handleShare}
                  >
                    Share
                  </Button>
                </Box>
              </Box>

              <Typography variant="body1" color="text.secondary" paragraph>
                {hunt.description}
              </Typography>

              <Divider sx={{ my: 3 }} />

              {/* Key Information */}
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <LocationOn color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Location"
                        secondary={hunt.city || 'Amsterdam'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CalendarToday color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Date & Time"
                        secondary={hunt.start_date ? format(new Date(hunt.start_date), 'PPP p') : 'December 31, 2025'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Timer color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Duration"
                        secondary={`${hunt.duration_hours || 3} hours`}
                      />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <People color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Team Size"
                        secondary={`${hunt.min_team_size || 2}-${hunt.max_team_size || 6} people`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <EuroSymbol color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Entry Fee"
                        secondary={`€${hunt.entry_fee || 25} per team`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Star color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Prize Pool"
                        secondary={`€${hunt.prize_pool || 500}`}
                      />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Venue Route */}
              <Typography variant="h6" gutterBottom>
                <Restaurant sx={{ verticalAlign: 'middle', mr: 1 }} />
                Restaurant Route
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Visit these amazing restaurants and complete challenges at each location:
              </Typography>
              <List>
                {(hunt.venues || [
                  { name: 'De Gouden Draak', cuisine: 'Chinese', address: 'Zeedijk 72' },
                  { name: 'Pasta e Basta', cuisine: 'Italian', address: 'Nieuwe Spiegelstraat 8' },
                  { name: 'Le Petit Restaurant', cuisine: 'French', address: 'Runstraat 16' },
                  { name: 'Tokyo Sushi Bar', cuisine: 'Japanese', address: 'Reguliersdwarsstraat 34' },
                  { name: 'The Butcher', cuisine: 'American', address: 'Albert Cuypstraat 129' },
                ]).map((venue, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>{index + 1}</Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={venue.name}
                      secondary={`${venue.cuisine} • ${venue.address}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Registration Card */}
          <Card elevation={3} sx={{ position: 'sticky', top: 80 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                €{hunt.entry_fee || 25}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                per team
              </Typography>

              <Box sx={{ my: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Teams Registered
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {hunt.teams_registered || 0} / {hunt.max_teams || 50}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={spotsPercentage}
                  sx={{ height: 8, borderRadius: 4 }}
                  color={spotsPercentage > 80 ? 'error' : 'primary'}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {spotsAvailable} spots remaining
                </Typography>
              </Box>

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={() => setJoinDialogOpen(true)}
                disabled={hunt.status === 'completed' || spotsAvailable <= 0}
                sx={{ mb: 2 }}
              >
                {hunt.status === 'completed' ? 'Hunt Completed' :
                 spotsAvailable <= 0 ? 'Fully Booked' : 'Join This Hunt'}
              </Button>

              {hunt.status === 'active' && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  This hunt is currently active! Join now and start playing.
                </Alert>
              )}

              <Divider sx={{ my: 2 }} />

              {/* What's Included */}
              <Typography variant="subtitle2" gutterBottom>
                What's Included
              </Typography>
              <List dense>
                <ListItem disablePadding>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <QrCode fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="QR Code challenges at each venue"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem disablePadding>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Restaurant fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Exclusive discounts at restaurants"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem disablePadding>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Star fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Prizes for top teams"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              {/* Organizer Info */}
              <Typography variant="subtitle2" gutterBottom>
                Organized By
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar src={hunt.organizer?.avatar_url}>
                  {hunt.organizer?.name?.charAt(0) || 'K'}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight="bold">
                    {hunt.organizer?.name || 'Koopjesjacht'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {hunt.organizer?.hunts_created || 12} hunts organized
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Join Hunt Dialog */}
      <Dialog open={joinDialogOpen} onClose={() => setJoinDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Join "{hunt.title}"</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Create your team to join this scavenger hunt adventure!
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Team Name"
            type="text"
            fullWidth
            variant="outlined"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g., The Hungry Explorers"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Team Size"
            type="number"
            fullWidth
            variant="outlined"
            value={teamSize}
            onChange={(e) => setTeamSize(parseInt(e.target.value))}
            inputProps={{
              min: hunt.min_team_size || 2,
              max: hunt.max_team_size || 6,
            }}
            helperText={`Team size must be between ${hunt.min_team_size || 2} and ${hunt.max_team_size || 6} people`}
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            Entry fee of €{hunt.entry_fee || 25} will be charged after team creation.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleJoinHunt}
            variant="contained"
            disabled={!teamName || teamSize < (hunt.min_team_size || 2) || joining}
          >
            {joining ? 'Joining...' : 'Continue to Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HuntDetail;
