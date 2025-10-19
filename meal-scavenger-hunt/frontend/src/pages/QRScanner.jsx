import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
  IconButton,
} from '@mui/material';
import {
  QrCodeScanner,
  Close,
  FlashOn,
  FlashOff,
  CameraAlt,
  Refresh,
  CheckCircle,
} from '@mui/icons-material';
import QrScanner from 'qr-scanner';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';
import qrService from '../services/qrService';
import huntService from '../services/huntService';

const QRScannerPage = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  const [scanning, setScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [teamProgress, setTeamProgress] = useState(null);

  useEffect(() => {
    // Check for camera availability
    checkCameraAvailability();
    fetchTeamProgress();

    return () => {
      stopScanner();
    };
  }, []);

  const checkCameraAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setHasCamera(videoDevices.length > 0);
    } catch (err) {
      console.error('Error checking camera:', err);
      setHasCamera(false);
      setError('Camera access is not available');
    }
  };

  const fetchTeamProgress = async () => {
    try {
      const progress = await huntService.getTeamProgress(teamId);
      setTeamProgress(progress);
    } catch (err) {
      console.error('Error fetching team progress:', err);
    }
  };

  const startScanner = async () => {
    if (!videoRef.current || scanning) return;

    try {
      setError(null);
      setScanning(true);

      // Initialize QR Scanner
      scannerRef.current = new QrScanner(
        videoRef.current,
        (result) => handleScanSuccess(result.data),
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
        }
      );

      await scannerRef.current.start();
      toast.success('Scanner started - point your camera at a QR code');
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Failed to start camera. Please check permissions.');
      setScanning(false);
      toast.error('Failed to start camera');
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScanSuccess = async (qrCode) => {
    if (loading) return; // Prevent multiple scans

    try {
      setLoading(true);
      stopScanner(); // Stop scanning while processing

      // Submit scan to backend
      const result = await qrService.scanQRCode(teamId, qrCode);

      setScanResult(result);
      setResultDialogOpen(true);

      // Update team progress
      await fetchTeamProgress();

      // Show confetti for successful scan
      if (result.success) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }

      // Play success sound (optional)
      playSuccessSound();
    } catch (err) {
      console.error('Error processing scan:', err);
      toast.error(err.message || 'Failed to process QR code');

      // Resume scanning on error
      setTimeout(() => {
        setLoading(false);
        startScanner();
      }, 1500);
    }
  };

  const playSuccessSound = () => {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const toggleFlash = async () => {
    if (!scannerRef.current) return;

    try {
      const newFlashState = !flashEnabled;
      await scannerRef.current.toggleFlash();
      setFlashEnabled(newFlashState);
      toast.success(newFlashState ? 'Flash enabled' : 'Flash disabled');
    } catch (err) {
      console.error('Error toggling flash:', err);
      toast.error('Flash not available on this device');
    }
  };

  const handleCloseResult = () => {
    setResultDialogOpen(false);
    setScanResult(null);
    setLoading(false);

    // Check if hunt is completed
    if (scanResult?.hunt_completed) {
      navigate(`/team/${teamId}`);
    } else {
      // Resume scanning
      startScanner();
    }
  };

  const handleManualEntry = () => {
    const qrCode = prompt('Enter QR code manually:');
    if (qrCode) {
      handleScanSuccess(qrCode);
    }
  };

  if (!hasCamera) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Camera access is required to scan QR codes. Please enable camera permissions in your browser settings.
        </Alert>
        <Button variant="outlined" onClick={() => navigate(`/team/${teamId}`)}>
          Back to Dashboard
        </Button>
        <Button variant="text" onClick={handleManualEntry} sx={{ ml: 2 }}>
          Enter Code Manually
        </Button>
      </Container>
    );
  }

  return (
    <>
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}

      <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            Scan QR Code
          </Typography>
          <IconButton onClick={() => navigate(`/team/${teamId}`)}>
            <Close />
          </IconButton>
        </Box>

        {/* Progress Indicator */}
        {teamProgress && (
          <Card elevation={2} sx={{ mb: 2 }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2">
                  Progress
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {teamProgress.venues_completed} / {teamProgress.total_venues} venues
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={teamProgress.completion_percentage}
                sx={{ height: 8, borderRadius: 4 }}
                color={teamProgress.completion_percentage === 100 ? 'success' : 'primary'}
              />
            </CardContent>
          </Card>
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Scanner Container */}
        <Paper
          elevation={3}
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: 600,
            mx: 'auto',
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'black',
          }}
        >
          {/* Video Element */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              paddingTop: '100%', // 1:1 aspect ratio
            }}
          >
            <video
              ref={videoRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />

            {/* Scanning Overlay */}
            {scanning && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Box
                  sx={{
                    width: '70%',
                    height: '70%',
                    border: '3px solid',
                    borderColor: 'primary.main',
                    borderRadius: 2,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                  }}
                />
              </Box>
            )}

            {/* Loading Overlay */}
            {loading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                }}
              >
                <Typography variant="h6" color="white">
                  Processing...
                </Typography>
              </Box>
            )}

            {/* Flash Button */}
            {scanning && (
              <IconButton
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                  },
                }}
                onClick={toggleFlash}
              >
                {flashEnabled ? <FlashOff /> : <FlashOn />}
              </IconButton>
            )}
          </Box>

          {/* Instructions */}
          {!scanning && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: 'white',
              }}
            >
              <QrCodeScanner sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h6">
                Ready to scan
              </Typography>
              <Typography variant="body2">
                Position QR code within the frame
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Control Buttons */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
          {!scanning ? (
            <Button
              variant="contained"
              size="large"
              startIcon={<CameraAlt />}
              onClick={startScanner}
            >
              Start Scanner
            </Button>
          ) : (
            <Button
              variant="outlined"
              size="large"
              startIcon={<Close />}
              onClick={stopScanner}
            >
              Stop Scanner
            </Button>
          )}
          <Button
            variant="outlined"
            size="large"
            onClick={handleManualEntry}
            disabled={loading}
          >
            Manual Entry
          </Button>
        </Box>

        {/* Instructions */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            How to scan:
          </Typography>
          <Typography variant="body2" component="div">
            1. Click "Start Scanner" to activate your camera<br />
            2. Point your camera at the QR code at the restaurant<br />
            3. Hold steady until the code is detected<br />
            4. You'll receive points automatically!
          </Typography>
        </Alert>
      </Container>

      {/* Scan Result Dialog */}
      <Dialog
        open={resultDialogOpen}
        onClose={handleCloseResult}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {scanResult?.success ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle color="success" />
              Scan Successful!
            </Box>
          ) : (
            'Scan Failed'
          )}
        </DialogTitle>
        <DialogContent>
          {scanResult?.success ? (
            <>
              <Typography variant="h6" gutterBottom>
                {scanResult.venue_name}
              </Typography>
              <Box sx={{ my: 2 }}>
                <Chip
                  label={`+${scanResult.points_earned} points`}
                  color="success"
                  sx={{ fontSize: '1.2rem', py: 2, px: 1 }}
                />
              </Box>
              <Typography variant="body1" paragraph>
                {scanResult.message}
              </Typography>
              {scanResult.hunt_completed && (
                <>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Congratulations! You've completed the entire hunt!
                  </Alert>
                  <Typography variant="body1" fontWeight="bold">
                    Your discount code: {scanResult.discount_code}
                  </Typography>
                </>
              )}
              {scanResult.clue_unlocked && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Next clue:
                  </Typography>
                  <Typography variant="body2">
                    {scanResult.next_clue}
                  </Typography>
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="error">
              {scanResult?.message || 'This QR code is invalid or has already been scanned.'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResult} variant="contained">
            {scanResult?.hunt_completed ? 'View Dashboard' : 'Continue Scanning'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QRScannerPage;
