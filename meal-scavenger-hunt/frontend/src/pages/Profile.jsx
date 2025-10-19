import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Button,
  TextField,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  LinearProgress,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Edit,
  PhotoCamera,
  EmojiEvents,
  History,
  Favorite,
  Settings,
  Logout,
  QrCode,
  Star,
  Delete,
  Notifications,
  Lock,
  Language,
  HelpOutline,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { logout } from '../store/slices/authSlice';
import authService from '../services/authService';
import huntService from '../services/huntService';

const Profile = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [huntHistory, setHuntHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });

  // Settings state
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    language: 'en',
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [statsData, historyData, favoritesData] = await Promise.all([
        authService.getUserStats(),
        huntService.getUserHuntHistory(),
        huntService.getUserFavorites(),
      ]);

      setStats(statsData);
      setHuntHistory(historyData);
      setFavorites(favoritesData);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      await authService.updateProfile(formData);
      toast.success('Profile updated successfully');
      setEditMode(false);
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('avatar', file);

      await authService.uploadAvatar(formData);
      toast.success('Avatar updated successfully');
      setAvatarDialogOpen(false);
    } catch (error) {
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      setLoading(true);
      await authService.updateSettings(settings);
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      await authService.deleteAccount();
      toast.success('Account deleted successfully');
      dispatch(logout());
    } catch (error) {
      toast.error(error.message || 'Failed to delete account');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleRemoveFavorite = async (huntId) => {
    try {
      await huntService.removeFavorite(huntId);
      setFavorites(favorites.filter(fav => fav.id !== huntId));
      toast.success('Removed from favorites');
    } catch (error) {
      toast.error('Failed to remove favorite');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out successfully');
  };

  if (loading && !stats) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Grid container spacing={3}>
        {/* Left Sidebar - Profile Info */}
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                <Avatar
                  src={user?.avatar_url}
                  alt={user?.name}
                  sx={{ width: 120, height: 120, mx: 'auto' }}
                >
                  {user?.name?.charAt(0)}
                </Avatar>
                <IconButton
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                  size="small"
                  onClick={() => setAvatarDialogOpen(true)}
                >
                  <PhotoCamera fontSize="small" />
                </IconButton>
              </Box>

              <Typography variant="h5" gutterBottom>
                {user?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {user?.email}
              </Typography>

              <Divider sx={{ my: 2 }} />

              {/* Stats */}
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Paper sx={{ p: 1.5, bgcolor: 'primary.50' }}>
                    <Typography variant="h6" color="primary">
                      {stats?.hunts_completed || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Hunts
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 1.5, bgcolor: 'success.50' }}>
                    <Typography variant="h6" color="success.main">
                      {stats?.total_points || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Points
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 1.5, bgcolor: 'warning.50' }}>
                    <Typography variant="h6" color="warning.main">
                      {stats?.rank || '-'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Rank
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Achievements */}
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Achievements
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {stats?.achievements?.map((achievement) => (
                    <Chip
                      key={achievement.id}
                      icon={<Star />}
                      label={achievement.name}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )) || [
                    <Chip key="1" icon={<Star />} label="First Hunt" size="small" color="primary" />,
                    <Chip key="2" icon={<Star />} label="Speed Demon" size="small" color="primary" />,
                    <Chip key="3" icon={<Star />} label="Explorer" size="small" color="primary" />,
                  ]}
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Button
                variant="outlined"
                color="error"
                startIcon={<Logout />}
                fullWidth
                onClick={handleLogout}
              >
                Logout
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Content Area */}
        <Grid item xs={12} md={8}>
          <Card elevation={3}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab icon={<Edit />} label="Profile" iconPosition="start" />
              <Tab icon={<History />} label="History" iconPosition="start" />
              <Tab icon={<Favorite />} label="Favorites" iconPosition="start" />
              <Tab icon={<Settings />} label="Settings" iconPosition="start" />
            </Tabs>

            <CardContent sx={{ minHeight: 400 }}>
              {/* Profile Tab */}
              {activeTab === 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h6">Personal Information</Typography>
                    <Button
                      startIcon={<Edit />}
                      onClick={() => setEditMode(!editMode)}
                      variant={editMode ? 'outlined' : 'text'}
                    >
                      {editMode ? 'Cancel' : 'Edit'}
                    </Button>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Full Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={!editMode}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        disabled={!editMode}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={!editMode}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Bio"
                        multiline
                        rows={4}
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        disabled={!editMode}
                        placeholder="Tell us about yourself..."
                      />
                    </Grid>
                  </Grid>

                  {editMode && (
                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        onClick={handleUpdateProfile}
                        disabled={loading}
                      >
                        Save Changes
                      </Button>
                      <Button variant="outlined" onClick={() => setEditMode(false)}>
                        Cancel
                      </Button>
                    </Box>
                  )}

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    Account Information
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Member Since"
                        secondary={user?.created_at ? format(new Date(user.created_at), 'MMMM d, yyyy') : 'N/A'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Account Status"
                        secondary={<Chip label="Active" color="success" size="small" />}
                      />
                    </ListItem>
                  </List>
                </Box>
              )}

              {/* History Tab */}
              {activeTab === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Hunt History
                  </Typography>
                  <List>
                    {huntHistory.map((hunt) => (
                      <React.Fragment key={hunt.id}>
                        <ListItem>
                          <ListItemIcon>
                            {hunt.rank <= 3 ? <EmojiEvents color="primary" /> : <QrCode />}
                          </ListItemIcon>
                          <ListItemText
                            primary={hunt.title}
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  {format(new Date(hunt.completed_at), 'PPP')}
                                </Typography>
                                <Typography variant="caption">
                                  Rank: #{hunt.rank} • {hunt.points} points
                                </Typography>
                              </Box>
                            }
                          />
                          {hunt.rank <= 3 && (
                            <Chip
                              label={hunt.rank === 1 ? '🥇 Winner' : hunt.rank === 2 ? '🥈 2nd Place' : '🥉 3rd Place'}
                              color="primary"
                              size="small"
                            />
                          )}
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                  {huntHistory.length === 0 && (
                    <Alert severity="info">
                      You haven't completed any hunts yet. Join a hunt to get started!
                    </Alert>
                  )}
                </Box>
              )}

              {/* Favorites Tab */}
              {activeTab === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Favorite Hunts
                  </Typography>
                  <List>
                    {favorites.map((hunt) => (
                      <React.Fragment key={hunt.id}>
                        <ListItem
                          secondaryAction={
                            <IconButton
                              edge="end"
                              onClick={() => handleRemoveFavorite(hunt.id)}
                            >
                              <Delete />
                            </IconButton>
                          }
                        >
                          <ListItemText
                            primary={hunt.title}
                            secondary={`${hunt.city} • €${hunt.entry_fee}`}
                          />
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                  {favorites.length === 0 && (
                    <Alert severity="info">
                      You haven't saved any favorite hunts yet. Browse hunts to add favorites!
                    </Alert>
                  )}
                </Box>
              )}

              {/* Settings Tab */}
              {activeTab === 3 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    <Notifications sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Notifications
                  </Typography>
                  <List>
                    <ListItem>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.emailNotifications}
                            onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                          />
                        }
                        label="Email Notifications"
                      />
                    </ListItem>
                    <ListItem>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.pushNotifications}
                            onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
                          />
                        }
                        label="Push Notifications"
                      />
                    </ListItem>
                    <ListItem>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.marketingEmails}
                            onChange={(e) => setSettings({ ...settings, marketingEmails: e.target.checked })}
                          />
                        }
                        label="Marketing Emails"
                      />
                    </ListItem>
                  </List>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="h6" gutterBottom>
                    <Language sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Language & Region
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    label="Language"
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    SelectProps={{ native: true }}
                    sx={{ mb: 2 }}
                  >
                    <option value="en">English</option>
                    <option value="nl">Nederlands</option>
                    <option value="de">Deutsch</option>
                    <option value="fr">Français</option>
                  </TextField>

                  <Button variant="contained" onClick={handleUpdateSettings} disabled={loading}>
                    Save Settings
                  </Button>

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="h6" gutterBottom color="error">
                    <Lock sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Danger Zone
                  </Typography>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Once you delete your account, there is no going back. Please be certain.
                  </Alert>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    Delete Account
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Avatar Upload Dialog */}
      <Dialog open={avatarDialogOpen} onClose={() => setAvatarDialogOpen(false)}>
        <DialogTitle>Update Profile Picture</DialogTitle>
        <DialogContent>
          <input
            accept="image/*"
            type="file"
            onChange={handleAvatarUpload}
            style={{ display: 'block', margin: '20px 0' }}
          />
          <Typography variant="caption" color="text.secondary">
            Accepted formats: JPG, PNG. Max size: 5MB
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAvatarDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          <Typography>
            Are you sure you want to delete your account? All your data, including hunt history, points, and achievements will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteAccount} color="error" variant="contained" disabled={loading}>
            Delete My Account
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;
