import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  AvatarGroup,
  Chip,
  Tabs,
  Tab,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
} from '@mui/material';
import {
  EmojiEvents,
  TrendingUp,
  TrendingDown,
  Remove,
  Refresh,
  Timer,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import huntService from '../services/huntService';
import { useSocket } from '../contexts/SocketContext';

const Leaderboard = () => {
  const { huntId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState(0);
  const [timeFilter, setTimeFilter] = useState('all');
  const [hunt, setHunt] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchLeaderboardData();
    setupSocketListeners();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchLeaderboardData(false);
    }, 30000);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('leaderboard_updated');
        socket.off('scan_completed');
      }
    };
  }, [huntId, timeFilter]);

  const setupSocketListeners = () => {
    if (!socket) return;

    socket.emit('join_hunt', { hunt_id: huntId });

    socket.on('leaderboard_updated', (data) => {
      if (data.hunt_id === huntId) {
        setLeaderboard(data.leaderboard);
        setLastUpdated(new Date());
      }
    });

    socket.on('scan_completed', () => {
      fetchLeaderboardData(false);
    });
  };

  const fetchLeaderboardData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const [huntData, leaderboardData, topPlayersData] = await Promise.all([
        huntService.getHuntById(huntId),
        huntService.getLeaderboard(huntId, timeFilter),
        huntService.getTopPlayers(huntId, 10),
      ]);

      setHunt(huntData);
      setLeaderboard(leaderboardData);
      setTopPlayers(topPlayersData);
      setLastUpdated(new Date());
    } catch (error) {
      toast.error('Failed to load leaderboard');
      console.error('Error fetching leaderboard:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchLeaderboardData(false);
    toast.success('Leaderboard refreshed');
  };

  const getTrophyIcon = (rank) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return null;
    }
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return <TrendingUp color="success" fontSize="small" />;
    if (trend < 0) return <TrendingDown color="error" fontSize="small" />;
    return <Remove color="disabled" fontSize="small" />;
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)';
      case 2:
        return 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)';
      case 3:
        return 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)';
      default:
        return 'transparent';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>
          Loading leaderboard...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            <EmojiEvents sx={{ verticalAlign: 'middle', mr: 1, color: 'primary.main' }} />
            Leaderboard
          </Typography>
          {hunt && (
            <Typography variant="body2" color="text.secondary">
              {hunt.title}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
          </Typography>
          <IconButton onClick={handleRefresh} size="small">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {/* 2nd Place */}
          <Grid item xs={12} sm={4} sx={{ order: { xs: 2, sm: 1 } }}>
            <Card
              elevation={3}
              sx={{
                background: getRankColor(2),
                color: 'white',
                mt: { xs: 0, sm: 4 },
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h2" sx={{ mb: 1 }}>
                  🥈
                </Typography>
                <AvatarGroup max={3} sx={{ justifyContent: 'center', mb: 1 }}>
                  {leaderboard[1].members?.map((member, idx) => (
                    <Avatar key={idx} alt={member.name} src={member.avatar_url} />
                  ))}
                </AvatarGroup>
                <Typography variant="h6" fontWeight="bold">
                  {leaderboard[1].name}
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  {leaderboard[1].points} pts
                </Typography>
                <Chip
                  label={`${leaderboard[1].venues_completed}/${hunt?.venues_count || 5} venues`}
                  size="small"
                  sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.3)' }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* 1st Place */}
          <Grid item xs={12} sm={4} sx={{ order: { xs: 1, sm: 2 } }}>
            <Card
              elevation={6}
              sx={{
                background: getRankColor(1),
                color: 'white',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h1" sx={{ mb: 1 }}>
                  🥇
                </Typography>
                <AvatarGroup max={3} sx={{ justifyContent: 'center', mb: 1 }}>
                  {leaderboard[0].members?.map((member, idx) => (
                    <Avatar key={idx} alt={member.name} src={member.avatar_url} />
                  ))}
                </AvatarGroup>
                <Typography variant="h5" fontWeight="bold">
                  {leaderboard[0].name}
                </Typography>
                <Typography variant="h4" sx={{ mt: 1 }}>
                  {leaderboard[0].points} pts
                </Typography>
                <Chip
                  label={`${leaderboard[0].venues_completed}/${hunt?.venues_count || 5} venues`}
                  size="small"
                  sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.3)' }}
                />
                {leaderboard[0].completed_at && (
                  <Chip
                    icon={<Timer />}
                    label="Completed"
                    size="small"
                    color="success"
                    sx={{ mt: 1, ml: 1 }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* 3rd Place */}
          <Grid item xs={12} sm={4} sx={{ order: { xs: 3, sm: 3 } }}>
            <Card
              elevation={3}
              sx={{
                background: getRankColor(3),
                color: 'white',
                mt: { xs: 0, sm: 6 },
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ mb: 1 }}>
                  🥉
                </Typography>
                <AvatarGroup max={3} sx={{ justifyContent: 'center', mb: 1 }}>
                  {leaderboard[2].members?.map((member, idx) => (
                    <Avatar key={idx} alt={member.name} src={member.avatar_url} />
                  ))}
                </AvatarGroup>
                <Typography variant="h6" fontWeight="bold">
                  {leaderboard[2].name}
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  {leaderboard[2].points} pts
                </Typography>
                <Chip
                  label={`${leaderboard[2].venues_completed}/${hunt?.venues_count || 5} venues`}
                  size="small"
                  sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.3)' }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs and Filters */}
      <Paper elevation={3} sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Teams" />
            <Tab label="Top Players" />
          </Tabs>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Time Period</InputLabel>
            <Select
              value={timeFilter}
              label="Time Period"
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Teams Leaderboard */}
      {activeTab === 0 && (
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.50' }}>
                <TableCell width={80}><strong>Rank</strong></TableCell>
                <TableCell><strong>Team</strong></TableCell>
                <TableCell align="center"><strong>Progress</strong></TableCell>
                <TableCell align="center"><strong>Points</strong></TableCell>
                <TableCell align="center"><strong>Trend</strong></TableCell>
                <TableCell align="center"><strong>Status</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaderboard.map((team, index) => {
                const rank = index + 1;
                const isTopThree = rank <= 3;

                return (
                  <TableRow
                    key={team.id}
                    hover
                    onClick={() => navigate(`/team/${team.id}`)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isTopThree ? `rgba(255, 215, 0, ${0.1 - rank * 0.03})` : 'transparent',
                      '&:hover': {
                        bgcolor: isTopThree ? `rgba(255, 215, 0, ${0.15 - rank * 0.03})` : 'action.hover',
                      },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getTrophyIcon(rank) ? (
                          <Typography variant="h6">{getTrophyIcon(rank)}</Typography>
                        ) : (
                          <Typography variant="body1" fontWeight="bold">
                            #{rank}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <AvatarGroup max={3}>
                          {team.members?.map((member, idx) => (
                            <Avatar
                              key={idx}
                              alt={member.name}
                              src={member.avatar_url}
                              sx={{ width: 32, height: 32 }}
                            >
                              {member.name?.charAt(0)}
                            </Avatar>
                          )) || [1, 2].map((i) => (
                            <Avatar key={i} sx={{ width: 32, height: 32 }}>U</Avatar>
                          ))}
                        </AvatarGroup>
                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            {team.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {team.members?.length || team.size || 2} members
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={(team.venues_completed / (hunt?.venues_count || 5)) * 100}
                          sx={{ flex: 1, height: 8, borderRadius: 4 }}
                          color={team.venues_completed === hunt?.venues_count ? 'success' : 'primary'}
                        />
                        <Typography variant="caption" sx={{ minWidth: 60 }}>
                          {team.venues_completed}/{hunt?.venues_count || 5}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${team.points} pts`}
                        color={isTopThree ? 'primary' : 'default'}
                        variant={isTopThree ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {getTrendIcon(team.trend || 0)}
                    </TableCell>
                    <TableCell align="center">
                      {team.completed_at ? (
                        <Chip label="Completed" color="success" size="small" />
                      ) : (
                        <Chip label="In Progress" color="warning" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {leaderboard.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No teams yet. Be the first to join!
              </Typography>
            </Box>
          )}
        </TableContainer>
      )}

      {/* Top Players Leaderboard */}
      {activeTab === 1 && (
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.50' }}>
                <TableCell width={80}><strong>Rank</strong></TableCell>
                <TableCell><strong>Player</strong></TableCell>
                <TableCell align="center"><strong>Hunts Completed</strong></TableCell>
                <TableCell align="center"><strong>Total Points</strong></TableCell>
                <TableCell align="center"><strong>Win Rate</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topPlayers.map((player, index) => {
                const rank = index + 1;
                const isTopThree = rank <= 3;

                return (
                  <TableRow
                    key={player.id}
                    hover
                    sx={{
                      bgcolor: isTopThree ? `rgba(255, 215, 0, ${0.1 - rank * 0.03})` : 'transparent',
                    }}
                  >
                    <TableCell>
                      {getTrophyIcon(rank) ? (
                        <Typography variant="h6">{getTrophyIcon(rank)}</Typography>
                      ) : (
                        <Typography variant="body1" fontWeight="bold">
                          #{rank}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar alt={player.name} src={player.avatar_url}>
                          {player.name?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            {player.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Member since {new Date(player.joined_at).getFullYear()}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body1">
                        {player.hunts_completed}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${player.total_points} pts`}
                        color={isTopThree ? 'primary' : 'default'}
                        variant={isTopThree ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body1">
                        {player.win_rate ? `${(player.win_rate * 100).toFixed(0)}%` : '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {topPlayers.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No player data available yet.
              </Typography>
            </Box>
          )}
        </TableContainer>
      )}
    </Container>
  );
};

export default Leaderboard;
