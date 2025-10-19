import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Stack,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import {
  ArrowForward,
  ArrowBack,
  CheckCircle,
  QrCode2,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Helmet } from 'react-helmet-async';
import {
  createProfile,
  startTutorial,
  completeTutorialStop,
} from '../store/slices/authSlice';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';

const Onboarding = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { signupId, onboardingStep, tutorialProgress, isLoading } = useSelector(
    (state) => state.auth
  );

  const [activeStep, setActiveStep] = useState(onboardingStep || 0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Profile form state
  const [displayName, setDisplayName] = useState('');
  const [teamPreference, setTeamPreference] = useState('flexible');
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  const [interests, setInterests] = useState([]);

  const steps = ['Create Profile', 'Tutorial Hunt', 'Complete Tutorial'];

  const interestOptions = [
    'food',
    'puzzles',
    'exploration',
    'competition',
    'photography',
    'socializing',
  ];

  useEffect(() => {
    if (!signupId) {
      navigate('/register');
    }
  }, [signupId, navigate]);

  useEffect(() => {
    setActiveStep(onboardingStep);
  }, [onboardingStep]);

  const handleProfileSubmit = async () => {
    if (!displayName) {
      toast.error('Please enter a display name');
      return;
    }

    try {
      await dispatch(
        createProfile({
          signupId,
          profileData: {
            displayName,
            teamPreference,
            experienceLevel,
            interests,
          },
        })
      ).unwrap();
      toast.success('Profile created!');
    } catch (err) {
      toast.error(err || 'Failed to create profile');
    }
  };

  const handleStartTutorial = async () => {
    try {
      await dispatch(startTutorial(signupId)).unwrap();
      toast.success('Tutorial started! Let\'s scan some QR codes!');
    } catch (err) {
      toast.error(err || 'Failed to start tutorial');
    }
  };

  const handleScanQR = async (qrCode) => {
    try {
      const result = await dispatch(
        completeTutorialStop({ signupId, qrCode })
      ).unwrap();

      if (result.tutorial.completed) {
        setShowConfetti(true);
        toast.success(`Tutorial complete! Your discount code: ${result.tutorial.discount_code}`);
        setTimeout(() => {
          navigate('/hunts');
        }, 3000);
      } else {
        toast.success(`Stop ${result.tutorial.stop_completed} completed! +${result.tutorial.points_earned} points`);
      }
    } catch (err) {
      toast.error(err || 'Failed to scan QR code');
    }
  };

  const toggleInterest = (interest) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  return (
    <>
      <Helmet>
        <title>Get Started - Koopjesjacht</title>
      </Helmet>

      {showConfetti && <Confetti />}

      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 4 }}>
        <Container maxWidth="md">
          <Paper elevation={3} sx={{ p: 4 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Step 1: Create Profile */}
            {activeStep === 1 && (
              <Box>
                <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
                  Create Your Profile
                </Typography>

                <TextField
                  fullWidth
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  margin="normal"
                  helperText="This is how other players will see you"
                  required
                />

                <FormControl component="fieldset" sx={{ mt: 3, width: '100%' }}>
                  <FormLabel component="legend">Team Preference</FormLabel>
                  <RadioGroup
                    value={teamPreference}
                    onChange={(e) => setTeamPreference(e.target.value)}
                  >
                    <FormControlLabel
                      value="solo"
                      control={<Radio />}
                      label="Solo - I prefer hunting alone"
                    />
                    <FormControlLabel
                      value="team"
                      control={<Radio />}
                      label="Team - I want to join or create a team"
                    />
                    <FormControlLabel
                      value="flexible"
                      control={<Radio />}
                      label="Flexible - I'm open to either"
                    />
                  </RadioGroup>
                </FormControl>

                <FormControl component="fieldset" sx={{ mt: 3, width: '100%' }}>
                  <FormLabel component="legend">Experience Level</FormLabel>
                  <RadioGroup
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                  >
                    <FormControlLabel
                      value="beginner"
                      control={<Radio />}
                      label="Beginner - First time doing a scavenger hunt"
                    />
                    <FormControlLabel
                      value="intermediate"
                      control={<Radio />}
                      label="Intermediate - I've done this a few times"
                    />
                    <FormControlLabel
                      value="expert"
                      control={<Radio />}
                      label="Expert - I'm a scavenger hunt pro!"
                    />
                  </RadioGroup>
                </FormControl>

                <Box sx={{ mt: 3 }}>
                  <FormLabel component="legend" sx={{ mb: 2 }}>
                    What interests you? (Select all that apply)
                  </FormLabel>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    {interestOptions.map((interest) => (
                      <Chip
                        key={interest}
                        label={interest}
                        onClick={() => toggleInterest(interest)}
                        color={interests.includes(interest) ? 'primary' : 'default'}
                        variant={interests.includes(interest) ? 'filled' : 'outlined'}
                      />
                    ))}
                  </Stack>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={handleProfileSubmit}
                  disabled={isLoading}
                  sx={{ mt: 4 }}
                >
                  Continue to Tutorial
                </Button>
              </Box>
            )}

            {/* Step 2: Start Tutorial */}
            {activeStep === 2 && !tutorialProgress?.started && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
                  Welcome to Your Tutorial Hunt!
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                  Learn how to play by completing a quick 3-stop tutorial hunt.
                  Scan QR codes, collect points, and get ready for the real adventure!
                </Typography>

                <Card sx={{ mb: 4, textAlign: 'left' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      What you'll learn:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2 }}>
                      <li>How to scan QR codes at venues</li>
                      <li>How the points system works</li>
                      <li>How to request hints (with penalties)</li>
                      <li>How to complete a hunt</li>
                    </Box>
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Complete the tutorial to get a <strong>20% discount</strong> on your first hunt!
                    </Alert>
                  </CardContent>
                </Card>

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<QrCode2 />}
                  onClick={handleStartTutorial}
                  disabled={isLoading}
                  sx={{ px: 4, py: 1.5 }}
                >
                  Start Tutorial Hunt
                </Button>
              </Box>
            )}

            {/* Step 3: Complete Tutorial Stops */}
            {activeStep >= 2 && tutorialProgress?.started && !tutorialProgress?.completed && (
              <Box>
                <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
                  Tutorial Hunt in Progress
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                  Stops completed: {tutorialProgress.stops_completed?.length || 0} / {tutorialProgress.total_stops}
                </Typography>

                {/* Show current stop */}
                {tutorialProgress.next_stop && (
                  <Card sx={{ mb: 4 }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        {tutorialProgress.next_stop.name}
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 3 }}>
                        {tutorialProgress.next_stop.clue}
                      </Typography>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Points: +{tutorialProgress.next_stop.points}
                      </Alert>
                      <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        startIcon={<QrCode2 />}
                        onClick={() => handleScanQR(tutorialProgress.next_stop.qr_code)}
                        disabled={isLoading}
                      >
                        Scan QR Code
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Progress indicator */}
                <Box sx={{ mt: 4 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Points: {tutorialProgress.total_points || 0}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Step 4: Tutorial Complete */}
            {tutorialProgress?.completed && (
              <Box sx={{ textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 100, color: 'success.main', mb: 2 }} />
                <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
                  Congratulations! 🎉
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                  You've completed the tutorial and earned {tutorialProgress.total_points} points!
                </Typography>

                <Alert severity="success" sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Your Discount Code:
                  </Typography>
                  <Typography variant="h5" sx={{ fontFamily: 'monospace', my: 1 }}>
                    {tutorialProgress.discount_code}
                  </Typography>
                  <Typography variant="body2">
                    Use this code to get 20% off your first hunt!
                  </Typography>
                </Alert>

                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/hunts')}
                  sx={{ px: 4, py: 1.5 }}
                >
                  Browse Available Hunts
                </Button>
              </Box>
            )}
          </Paper>
        </Container>
      </Box>
    </>
  );
};

export default Onboarding;
