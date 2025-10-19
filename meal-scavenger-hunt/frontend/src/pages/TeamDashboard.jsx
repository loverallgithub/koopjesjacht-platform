import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Avatar,
  AvatarGroup,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Paper,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  QrCodeScanner,
  CheckCircle,
  RadioButtonUnchecked,
  LocationOn,
  Timer,
  EmojiEvents,
  People,
  Share,
  Camera,
  Navigation,
  Info,
  Refresh,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';
import huntService from '../services/huntService';
import qrService from '../services/qrService';
import { useSocket } from '../contexts/SocketContext';

const TeamDashboard = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { socket } = useSocket();

  const [team, setTeam] = useState(null);
  const [hunt, setHunt] = useState(null);
  const [progress, setProgress] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [venueDialogOpen, setVenueDialogOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTeamData();
    setupSocketListeners();

    return () => {
      if (socket) {
        socket.off('scan_completed');
        socket.off('leaderboard_updated');
        socket.off('hunt_completed');
      }
    };
  }, [teamId]);

  const setupSocketListeners = () => {
    if (!socket) return;

    // Join team room for real-time updates
    socket.emit('join_team', { team_id: teamId });

    // Listen for scan completions
    socket.on('scan_completed', (data) => {
      if (data.team_id === teamId) {
        toast.success(`QR code scanned! +${data.points} points`);
        fetchProgress();
        fetchLeaderboard();
      }
    });

    // Listen for leaderboard updates
    socket.on('leaderboard_updated', (data) => {
      setLeaderboard(data.leaderboard);
    });

    // Listen for hunt completion
    socket.on('hunt_completed', (data) => {
      if (data.team_id === teamId) {
        setShowConfetti(true);
        toast.success('Congratulations! You completed the hunt!');
        fetchTeamData();
      }
    });
  };

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const [teamData, progressData, leaderboardData] = await Promise.all([
        huntService.getTeamById(teamId),
        huntService.getTeamProgress(teamId),
        huntService.getLeaderboard(teamId),
      ]);

      setTeam(teamData);
      setHunt(teamData.hunt);
      setProgress(progressData);
      setLeaderboard(leaderboardData);

      // Check if hunt is completed
      if (progressData.completion_percentage === 100 && !showConfetti) {
        setShowConfetti(true);
      }
    } catch (error) {
      toast.error('Failed to load team data');
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const progressData = await huntService.getTeamProgress(teamId);
      setProgress(progressData);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const leaderboardData = await huntService.getLeaderboard(teamId);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTeamData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const handleScanQR = () => {
    navigate(`/team/${teamId}/scan`);
  };

  const handleUploadPhoto = () => {
    navigate(`/team/${teamId}/photo`);
  };

  const handleVenueClick = (venue) => {
    setSelectedVenue(venue);
    setVenueDialogOpen(true);
  };

  const openInMaps = (venue) => {
    const address = encodeURIComponent(`${venue.address}, ${venue.city}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
  };

  const getTeamRank = () => {
    const rank = leaderboard.findIndex(t => t.id === teamId) + 1;
    return rank > 0 ? rank : '-';
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>
          Loading team dashboard...
        </Typography>
      </Container>
    );
  }

  if (!team || !hunt) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Team not found</Alert>
        <Button onClick={() => navigate('/hunts')} sx={{ mt: 2 }}>
          Back to Hunts
        </Button>
      </Container>
    );
  }

  const completedVenues = progress?.venues_completed || 0;
  const totalVenues = hunt.venues_count || 5;
  const currentRank = getTeamRank();

  return (
    <>
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}

      <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {team.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {hunt.title}
            </Typography>
          </Box>
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <Refresh />
          </IconButton>
        </Box>

        {/* Status Alert */}
        {hunt.status === 'active' && progress?.completion_percentage < 100 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Hunt is active! Scan QR codes at restaurants to earn points and complete the hunt.
          </Alert>
        )}

        {progress?.completion_percentage === 100 && (
          <Alert severity="success" icon={<EmojiEvents />} sx={{ mb: 3 }}>
            Congratulations! You completed the hunt and earned your discount code: <strong>{progress.discount_code}</strong>
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Left Column - Progress & Actions */}
          <Grid item xs={12} md={8}>
            {/* Progress Card */}
            <Card elevation={3} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Hunt Progress
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Venues Visited
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {completedVenues} / {totalVenues}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progress?.completion_percentage || 0}
                  sx={{ height: 12, borderRadius: 6, mb: 2 }}
                  color={progress?.completion_percentage === 100 ? 'success' : 'primary'}
                />
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50' }}>
                      <Typography variant="h5" color="primary">
                        {progress?.total_points || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Points
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50' }}>
                      <Typography variant="h5" color="success.main">
                        {progress?.scans_completed || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        QR Codes Scanned
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50' }}>
                      <Typography variant="h5" color="warning.main">
                        {currentRank}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Current Rank
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<QrCodeScanner />}
                  onClick={handleScanQR}
                  disabled={progress?.completion_percentage === 100}
                >
                  Scan QR Code
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  size="large"
                  fullWidth
                  startIcon={<Camera />}
                  onClick={handleUploadPhoto}
                >
                  Upload Photo
                </Button>
              </Grid>
            </Grid>

            {/* Venue Checklist */}
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Restaurant Checklist
                </Typography>
                <List>
                  {(progress?.venues || hunt.venues || [
                    { id: 1, name: 'De Gouden Draak', address: 'Zeedijk 72', completed: true, points: 100 },
                    { id: 2, name: 'Pasta e Basta', address: 'Nieuwe Spiegelstraat 8', completed: true, points: 100 },
                    { id: 3, name: 'Le Petit Restaurant', address: 'Runstraat 16', completed: false, points: 100 },
                    { id: 4, name: 'Tokyo Sushi Bar', address: 'Reguliersdwarsstraat 34', completed: false, points: 100 },
                    { id: 5, name: 'The Butcher', address: 'Albert Cuypstraat 129', completed: false, points: 100 },
                  ]).map((venue, index) => (
                    <React.Fragment key={venue.id}>
                      <ListItemButton onClick={() => handleVenueClick(venue)}>
                        <ListItemIcon>
                          {venue.completed ? (
                            <CheckCircle color="success" />
                          ) : (
                            <RadioButtonUnchecked color="disabled" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={venue.name}
                          secondary={venue.address}
                          primaryTypographyProps={{
                            fontWeight: venue.completed ? 'bold' : 'normal',
                            color: venue.completed ? 'success.main' : 'text.primary',
                          }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {venue.completed && (
                            <Chip
                              label={`+${venue.points} pts`}
                              size="small"
                              color="success"
                            />
                          )}
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              openInMaps(venue);
                            }}
                          >
                            <Navigation fontSize="small" />
                          </IconButton>
                        </Box>
                      </ListItemButton>
                      {index < (progress?.venues?.length || 5) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Team Info & Leaderboard */}
          <Grid item xs={12} md={4}>
            {/* Team Info Card */}
            <Card elevation={3} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Team Members
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AvatarGroup max={4} sx={{ mr: 2 }}>
                    {team.members?.map((member) => (
                      <Avatar key={member.id} alt={member.name} src={member.avatar_url}>
                        {member.name?.charAt(0)}
                      </Avatar>
                    )) || [1, 2, 3].map((i) => (
                      <Avatar key={i}>U{i}</Avatar>
                    ))}
                  </AvatarGroup>
                  <Typography variant="body2">
                    {team.size || team.members?.length || 3} members
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <List dense>
                  <ListItem disablePadding>
                    <ListItemText
                      primary="Hunt Start"
                      secondary={hunt.start_date ? format(new Date(hunt.start_date), 'PPp') : 'Dec 31, 2025'}
                    />
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemText
                      primary="Time Remaining"
                      secondary={hunt.end_date ? formatDistanceToNow(new Date(hunt.end_date)) : '2 hours'}
                    />
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemText
                      primary="Prize Pool"
                      secondary={`€${hunt.prize_pool || 500}`}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {/* Leaderboard Card */}
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Live Leaderboard
                </Typography>
                <List>
                  {leaderboard.slice(0, 10).map((leaderTeam, index) => {
                    const isCurrentTeam = leaderTeam.id === teamId;
                    const rank = index + 1;

                    return (
                      <ListItem
                        key={leaderTeam.id}
                        sx={{
                          bgcolor: isCurrentTeam ? 'primary.50' : 'transparent',
                          borderRadius: 1,
                          mb: 0.5,
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography
                                variant="body2"
                                fontWeight={isCurrentTeam ? 'bold' : 'normal'}
                              >
                                {getRankIcon(rank)}
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight={isCurrentTeam ? 'bold' : 'normal'}
                                sx={{ flex: 1 }}
                              >
                                {leaderTeam.name}
                              </Typography>
                              <Chip
                                label={`${leaderTeam.points} pts`}
                                size="small"
                                color={isCurrentTeam ? 'primary' : 'default'}
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
                {leaderboard.length === 0 && (
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    No teams yet
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Venue Detail Dialog */}
        <Dialog
          open={venueDialogOpen}
          onClose={() => setVenueDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          {selectedVenue && (
            <>
              <DialogTitle>
                {selectedVenue.name}
                {selectedVenue.completed && (
                  <Chip
                    label="Completed"
                    color="success"
                    size="small"
                    sx={{ ml: 2 }}
                  />
                )}
              </DialogTitle>
              <DialogContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Address
                  </Typography>
                  <Typography variant="body1">
                    {selectedVenue.address}
                  </Typography>
                </Box>
                {selectedVenue.clue && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Clue
                    </Typography>
                    <Typography variant="body1">
                      {selectedVenue.clue}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Points Available
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {selectedVenue.points} points
                  </Typography>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setVenueDialogOpen(false)}>Close</Button>
                <Button
                  variant="contained"
                  startIcon={<Navigation />}
                  onClick={() => openInMaps(selectedVenue)}
                >
                  Get Directions
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Container>
    </>
  );
};

export default TeamDashboard;
