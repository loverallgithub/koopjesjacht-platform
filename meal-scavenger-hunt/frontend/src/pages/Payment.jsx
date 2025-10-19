import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  TextField,
} from '@mui/material';
import {
  CreditCard,
  AccountBalance,
  CheckCircle,
  Lock,
  Info,
} from '@mui/icons-material';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import toast from 'react-hot-toast';
import huntService from '../services/huntService';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const PaymentForm = ({ amount, teamId, huntId, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // Create payment intent on backend
      const { clientSecret } = await huntService.createPaymentIntent({
        team_id: teamId,
        hunt_id: huntId,
        amount: amount,
        payment_method: 'stripe',
      });

      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent.status === 'succeeded') {
        toast.success('Payment successful!');
        onSuccess(paymentIntent.id);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed');
      toast.error(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Card Information
        </Typography>
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            bgcolor: 'background.paper',
          }}
        >
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={!stripe || processing}
        startIcon={processing ? null : <Lock />}
      >
        {processing ? 'Processing...' : `Pay €${amount}`}
      </Button>
    </form>
  );
};

const Payment = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const huntId = searchParams.get('huntId');

  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [hunt, setHunt] = useState(null);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [applyingPromo, setApplyingPromo] = useState(false);

  useEffect(() => {
    fetchPaymentData();
  }, [teamId, huntId]);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      const [teamData, huntData] = await Promise.all([
        huntService.getTeamById(teamId),
        huntService.getHuntById(huntId),
      ]);

      setTeam(teamData);
      setHunt(huntData);
    } catch (error) {
      toast.error('Failed to load payment information');
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    try {
      setApplyingPromo(true);
      const result = await huntService.validatePromoCode(promoCode, huntId);

      if (result.valid) {
        setDiscount(result.discount_amount);
        toast.success(`Promo code applied! €${result.discount_amount} discount`);
      } else {
        toast.error('Invalid promo code');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to apply promo code');
    } finally {
      setApplyingPromo(false);
    }
  };

  const handlePaymentSuccess = async (paymentId) => {
    try {
      // Update team payment status
      await huntService.confirmPayment(teamId, paymentId);

      // Navigate to team dashboard
      navigate(`/team/${teamId}`, {
        state: { paymentSuccess: true },
      });
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Payment succeeded but confirmation failed. Please contact support.');
    }
  };

  const handlePayPalSuccess = async (details) => {
    try {
      toast.success('PayPal payment successful!');
      await handlePaymentSuccess(details.id);
    } catch (error) {
      console.error('PayPal success handler error:', error);
    }
  };

  const handleIdealPayment = async () => {
    try {
      setLoading(true);

      // Create iDEAL payment on backend
      const result = await huntService.createIdealPayment({
        team_id: teamId,
        hunt_id: huntId,
        amount: finalAmount,
      });

      // Redirect to iDEAL payment page
      window.location.href = result.checkout_url;
    } catch (error) {
      toast.error(error.message || 'Failed to initiate iDEAL payment');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>
          Loading payment information...
        </Typography>
      </Container>
    );
  }

  if (!team || !hunt) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Payment information not found</Alert>
      </Container>
    );
  }

  const baseAmount = hunt.entry_fee || 25;
  const finalAmount = Math.max(0, baseAmount - discount);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Complete Your Payment
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Join "{hunt.title}" with team "{team.name}"
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - Order Summary */}
        <Grid item xs={12} md={5}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>
              <Divider sx={{ my: 2 }} />

              <List>
                <ListItem disablePadding sx={{ mb: 1 }}>
                  <ListItemText primary="Hunt" secondary={hunt.title} />
                </ListItem>
                <ListItem disablePadding sx={{ mb: 1 }}>
                  <ListItemText primary="Team" secondary={team.name} />
                </ListItem>
                <ListItem disablePadding sx={{ mb: 1 }}>
                  <ListItemText primary="Team Size" secondary={`${team.size} members`} />
                </ListItem>
                <ListItem disablePadding sx={{ mb: 1 }}>
                  <ListItemText primary="Date" secondary={hunt.start_date} />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              {/* Pricing Breakdown */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Entry Fee</Typography>
                  <Typography variant="body2">€{baseAmount}</Typography>
                </Box>
                {discount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="success.main">
                      Discount
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      -€{discount}
                    </Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" color="primary">
                    €{finalAmount}
                  </Typography>
                </Box>
              </Box>

              {/* Promo Code */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Have a promo code?
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Enter code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    fullWidth
                  />
                  <Button
                    variant="outlined"
                    onClick={handleApplyPromoCode}
                    disabled={applyingPromo}
                  >
                    Apply
                  </Button>
                </Box>
              </Box>

              <Alert severity="info" icon={<Info />} sx={{ mt: 2 }}>
                Payment is fully refundable up to 24 hours before the hunt starts.
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Payment Methods */}
        <Grid item xs={12} md={7}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Method
              </Typography>
              <Divider sx={{ my: 2 }} />

              {/* Payment Method Selection */}
              <RadioGroup
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <FormControlLabel
                  value="stripe"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CreditCard />
                      <Typography>Credit/Debit Card</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="paypal"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <img
                        src="https://www.paypalobjects.com/webstatic/icon/pp258.png"
                        alt="PayPal"
                        width={24}
                        height={24}
                      />
                      <Typography>PayPal</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="ideal"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountBalance />
                      <Typography>iDEAL (Netherlands)</Typography>
                    </Box>
                  }
                />
              </RadioGroup>

              <Divider sx={{ my: 3 }} />

              {/* Payment Forms */}
              {paymentMethod === 'stripe' && (
                <Elements stripe={stripePromise}>
                  <PaymentForm
                    amount={finalAmount}
                    teamId={teamId}
                    huntId={huntId}
                    onSuccess={handlePaymentSuccess}
                  />
                </Elements>
              )}

              {paymentMethod === 'paypal' && (
                <PayPalScriptProvider
                  options={{
                    'client-id': import.meta.env.VITE_PAYPAL_CLIENT_ID,
                    currency: 'EUR',
                  }}
                >
                  <PayPalButtons
                    style={{ layout: 'vertical' }}
                    createOrder={(data, actions) => {
                      return actions.order.create({
                        purchase_units: [
                          {
                            amount: {
                              value: finalAmount.toString(),
                              currency_code: 'EUR',
                            },
                            description: `${hunt.title} - Team: ${team.name}`,
                          },
                        ],
                      });
                    }}
                    onApprove={async (data, actions) => {
                      const details = await actions.order.capture();
                      handlePayPalSuccess(details);
                    }}
                    onError={(err) => {
                      console.error('PayPal error:', err);
                      toast.error('PayPal payment failed');
                    }}
                  />
                </PayPalScriptProvider>
              )}

              {paymentMethod === 'ideal' && (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    You will be redirected to your bank to complete the payment.
                  </Alert>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleIdealPayment}
                    startIcon={<Lock />}
                  >
                    Pay with iDEAL - €{finalAmount}
                  </Button>
                </Box>
              )}

              {/* Security Notice */}
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                  <Lock fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    Secure SSL Encrypted Payment
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Your payment information is encrypted and secure. We never store your card details.
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* What Happens Next */}
          <Card elevation={3} sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <CheckCircle sx={{ verticalAlign: 'middle', mr: 1, color: 'success.main' }} />
                What Happens Next?
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="1. Payment Confirmation"
                    secondary="You'll receive an email confirmation immediately"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="2. Team Dashboard Access"
                    secondary="Access your team dashboard to view the hunt details"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="3. Hunt Day"
                    secondary="Show up at the start location and begin your adventure!"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Payment;
