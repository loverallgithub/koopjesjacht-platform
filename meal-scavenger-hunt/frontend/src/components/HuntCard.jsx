import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  IconButton,
  LinearProgress,
} from '@mui/material';
import {
  LocationOn,
  CalendarToday,
  People,
  EuroSymbol,
  Star,
  Favorite,
  FavoriteBorder,
  Restaurant,
} from '@mui/icons-material';
import { format } from 'date-fns';

const HuntCard = ({
  hunt,
  onFavoriteToggle,
  isFavorite = false,
  showProgress = false,
  compact = false,
}) => {
  const navigate = useNavigate();

  const getDifficultyColor = (difficulty) => {
    if (difficulty <= 2) return 'success';
    if (difficulty === 3) return 'warning';
    return 'error';
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

  const spotsRemaining = (hunt.max_teams || 50) - (hunt.teams_registered || 0);
  const spotsPercentage = ((hunt.teams_registered || 0) / (hunt.max_teams || 50)) * 100;

  return (
    <Card
      elevation={3}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
      }}
    >
      {/* Image */}
      <CardMedia
        component="img"
        height={compact ? 160 : 200}
        image={hunt.image_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600'}
        alt={hunt.title}
        sx={{ cursor: 'pointer' }}
        onClick={() => navigate(`/hunts/${hunt.id}`)}
      />

      {/* Favorite Button */}
      {onFavoriteToggle && (
        <IconButton
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 1)',
            },
          }}
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle(hunt.id);
          }}
        >
          {isFavorite ? <Favorite color="error" /> : <FavoriteBorder />}
        </IconButton>
      )}

      {/* Status Badge */}
      {hunt.status && (
        <Chip
          label={hunt.status}
          color={getStatusColor(hunt.status)}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            textTransform: 'capitalize',
          }}
        />
      )}

      {/* Content */}
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            cursor: 'pointer',
            '&:hover': { color: 'primary.main' },
          }}
          onClick={() => navigate(`/hunts/${hunt.id}`)}
        >
          {hunt.title}
        </Typography>

        {!compact && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {hunt.description}
          </Typography>
        )}

        {/* Key Information */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {hunt.city || 'Amsterdam'}
            </Typography>
          </Box>

          {hunt.start_date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarToday fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {format(new Date(hunt.start_date), 'MMM d, yyyy')}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Restaurant fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {hunt.venues_count || 5} venues
            </Typography>
          </Box>
        </Box>

        {/* Difficulty & Price */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
          {hunt.difficulty && (
            <Chip
              icon={<Star />}
              label={`Level ${hunt.difficulty}`}
              size="small"
              color={getDifficultyColor(hunt.difficulty)}
            />
          )}
          <Chip
            icon={<EuroSymbol />}
            label={`€${hunt.entry_fee || 25}`}
            size="small"
            variant="outlined"
          />
        </Box>

        {/* Progress Bar (for active hunts) */}
        {showProgress && hunt.progress && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="caption" fontWeight="bold">
                {hunt.progress.completion_percentage}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={hunt.progress.completion_percentage}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}

        {/* Spots Available */}
        {!showProgress && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                <People fontSize="inherit" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                Teams
              </Typography>
              <Typography variant="caption" fontWeight="bold">
                {hunt.teams_registered || 0} / {hunt.max_teams || 50}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={spotsPercentage}
              sx={{ height: 6, borderRadius: 3 }}
              color={spotsPercentage > 80 ? 'error' : 'primary'}
            />
            {spotsRemaining <= 5 && spotsRemaining > 0 && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                Only {spotsRemaining} spots left!
              </Typography>
            )}
          </Box>
        )}
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          variant={showProgress ? 'outlined' : 'contained'}
          fullWidth
          onClick={() => navigate(`/hunts/${hunt.id}`)}
          disabled={hunt.status === 'completed' || spotsRemaining <= 0}
        >
          {showProgress ? 'View Dashboard' :
           hunt.status === 'completed' ? 'Completed' :
           spotsRemaining <= 0 ? 'Fully Booked' : 'View Details'}
        </Button>
      </CardActions>
    </Card>
  );
};

export default HuntCard;
