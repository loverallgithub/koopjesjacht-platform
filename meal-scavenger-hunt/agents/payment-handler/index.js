const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 9003;

app.use(cors());
app.use(express.json());

// Payment storage (in-memory - replace with database in production)
const payments = new Map();
const invoices = new Map();
const refunds = new Map();

// Payment providers configuration
const STRIPE_ENABLED = !!process.env.STRIPE_SECRET_KEY;
const PAYPAL_ENABLED = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'payment-handler',
    timestamp: new Date().toISOString(),
    providers: {
      stripe: STRIPE_ENABLED ? 'configured' : 'not configured',
      paypal: PAYPAL_ENABLED ? 'configured' : 'not configured'
    }
  });
});

// Process payment
app.post('/process-payment', async (req, res) => {
  try {
    const {
      amount,
      currency = 'EUR',
      payment_method,
      customer_id,
      customer_email,
      description,
      hunt_id,
      team_id,
      metadata = {}
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    if (!payment_method || !['stripe', 'paypal', 'test'].includes(payment_method)) {
      return res.status(400).json({ error: 'Valid payment_method required (stripe, paypal, test)' });
    }

    const payment_id = uuidv4();
    const transaction_id = `txn_${uuidv4().substring(0, 8)}`;

    // Simulate payment processing
    let paymentResult;
    if (payment_method === 'test') {
      paymentResult = {
        success: true,
        provider_response: { mock: true, status: 'succeeded' }
      };
    } else if (payment_method === 'stripe') {
      paymentResult = await processStripePayment(amount, currency, customer_email);
    } else if (payment_method === 'paypal') {
      paymentResult = await processPayPalPayment(amount, currency, customer_email);
    }

    const paymentData = {
      payment_id,
      transaction_id,
      amount,
      currency,
      payment_method,
      customer_id,
      customer_email,
      description: description || `Payment for hunt ${hunt_id}`,
      hunt_id,
      team_id,
      status: paymentResult.success ? 'succeeded' : 'failed',
      provider_response: paymentResult.provider_response,
      metadata,
      created_at: new Date().toISOString(),
      processed_at: new Date().toISOString()
    };

    payments.set(payment_id, paymentData);

    // Auto-generate invoice for successful payments
    if (paymentResult.success) {
      const invoice_id = await generateInvoice(payment_id, paymentData);
      paymentData.invoice_id = invoice_id;
    }

    console.log(`[Payment Handler] Payment ${payment_id} ${paymentData.status} - €${amount}`);

    res.json({
      success: paymentResult.success,
      data: paymentData
    });
  } catch (error) {
    console.error('[Payment Handler] Payment error:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

// Simulate Stripe payment
async function processStripePayment(amount, currency, customerEmail) {
  // In production, use actual Stripe SDK
  // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  // const paymentIntent = await stripe.paymentIntents.create({...});

  return {
    success: true,
    provider_response: {
      id: `pi_${uuidv4().substring(0, 14)}`,
      status: 'succeeded',
      amount: amount * 100, // Stripe uses cents
      currency,
      customer: customerEmail,
      mock: !STRIPE_ENABLED
    }
  };
}

// Simulate PayPal payment
async function processPayPalPayment(amount, currency, customerEmail) {
  // In production, use actual PayPal SDK
  return {
    success: true,
    provider_response: {
      id: `PAYID-${uuidv4().substring(0, 12).toUpperCase()}`,
      status: 'COMPLETED',
      amount: { value: amount.toString(), currency },
      payer: { email_address: customerEmail },
      mock: !PAYPAL_ENABLED
    }
  };
}

// Get payment details
app.get('/payment/:payment_id', (req, res) => {
  const { payment_id } = req.params;
  const payment = payments.get(payment_id);

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  res.json({ data: payment });
});

// Get payment status
app.get('/payment/:payment_id/status', (req, res) => {
  const { payment_id } = req.params;
  const payment = payments.get(payment_id);

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  res.json({
    payment_id,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    processed_at: payment.processed_at
  });
});

// Process refund
app.post('/refund', async (req, res) => {
  try {
    const { payment_id, amount, reason = 'requested_by_customer' } = req.body;

    if (!payment_id) {
      return res.status(400).json({ error: 'payment_id required' });
    }

    const payment = payments.get(payment_id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'succeeded') {
      return res.status(400).json({ error: 'Can only refund succeeded payments' });
    }

    const refundAmount = amount || payment.amount;
    if (refundAmount > payment.amount) {
      return res.status(400).json({ error: 'Refund amount exceeds payment amount' });
    }

    const refund_id = uuidv4();
    const refundData = {
      refund_id,
      payment_id,
      amount: refundAmount,
      currency: payment.currency,
      reason,
      status: 'succeeded',
      created_at: new Date().toISOString(),
      processed_at: new Date().toISOString()
    };

    refunds.set(refund_id, refundData);

    // Update payment status
    payment.status = 'refunded';
    payment.refund_id = refund_id;
    payment.refunded_at = new Date().toISOString();

    console.log(`[Payment Handler] Refund ${refund_id} processed - €${refundAmount}`);

    res.json({
      success: true,
      data: refundData
    });
  } catch (error) {
    console.error('[Payment Handler] Refund error:', error);
    res.status(500).json({ error: 'Refund processing failed' });
  }
});

// Get refund details
app.get('/refund/:refund_id', (req, res) => {
  const { refund_id } = req.params;
  const refund = refunds.get(refund_id);

  if (!refund) {
    return res.status(404).json({ error: 'Refund not found' });
  }

  res.json({ data: refund });
});

// Generate invoice
async function generateInvoice(payment_id, paymentData) {
  const invoice_id = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const invoiceData = {
    invoice_id,
    invoice_number: invoice_id,
    payment_id,
    customer_email: paymentData.customer_email,
    customer_id: paymentData.customer_id,
    amount: paymentData.amount,
    currency: paymentData.currency,
    description: paymentData.description,
    hunt_id: paymentData.hunt_id,
    team_id: paymentData.team_id,
    status: 'paid',
    issued_at: new Date().toISOString(),
    paid_at: paymentData.processed_at,
    items: [
      {
        description: paymentData.description,
        quantity: 1,
        unit_price: paymentData.amount,
        total: paymentData.amount
      }
    ],
    subtotal: paymentData.amount,
    tax: 0,
    total: paymentData.amount
  };

  invoices.set(invoice_id, invoiceData);
  console.log(`[Payment Handler] Invoice ${invoice_id} generated`);

  return invoice_id;
}

// Generate invoice manually
app.post('/generate-invoice', async (req, res) => {
  try {
    const { payment_id } = req.body;

    if (!payment_id) {
      return res.status(400).json({ error: 'payment_id required' });
    }

    const payment = payments.get(payment_id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.invoice_id) {
      return res.json({
        success: true,
        message: 'Invoice already exists',
        data: invoices.get(payment.invoice_id)
      });
    }

    const invoice_id = await generateInvoice(payment_id, payment);
    payment.invoice_id = invoice_id;

    res.json({
      success: true,
      data: invoices.get(invoice_id)
    });
  } catch (error) {
    console.error('[Payment Handler] Invoice generation error:', error);
    res.status(500).json({ error: 'Invoice generation failed' });
  }
});

// Get invoice
app.get('/invoice/:invoice_id', (req, res) => {
  const { invoice_id } = req.params;
  const invoice = invoices.get(invoice_id);

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  res.json({ data: invoice });
});

// Get invoices for customer
app.get('/invoices/customer/:customer_id', (req, res) => {
  const { customer_id } = req.params;

  const customerInvoices = Array.from(invoices.values())
    .filter(inv => inv.customer_id === customer_id)
    .sort((a, b) => new Date(b.issued_at) - new Date(a.issued_at));

  res.json({
    customer_id,
    count: customerInvoices.length,
    data: customerInvoices
  });
});

// Get all payments
app.get('/payments', (req, res) => {
  const { status, hunt_id, team_id, limit = 50 } = req.query;

  let paymentList = Array.from(payments.values());

  if (status) {
    paymentList = paymentList.filter(p => p.status === status);
  }
  if (hunt_id) {
    paymentList = paymentList.filter(p => p.hunt_id === hunt_id);
  }
  if (team_id) {
    paymentList = paymentList.filter(p => p.team_id === team_id);
  }

  paymentList = paymentList
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, parseInt(limit));

  res.json({
    count: paymentList.length,
    data: paymentList
  });
});

// Get payment statistics
app.get('/stats', (req, res) => {
  const allPayments = Array.from(payments.values());

  const stats = {
    total_payments: allPayments.length,
    successful_payments: allPayments.filter(p => p.status === 'succeeded').length,
    failed_payments: allPayments.filter(p => p.status === 'failed').length,
    refunded_payments: allPayments.filter(p => p.status === 'refunded').length,
    total_revenue: allPayments
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0),
    total_refunded: Array.from(refunds.values())
      .reduce((sum, r) => sum + r.amount, 0),
    payment_methods: {
      stripe: allPayments.filter(p => p.payment_method === 'stripe').length,
      paypal: allPayments.filter(p => p.payment_method === 'paypal').length,
      test: allPayments.filter(p => p.payment_method === 'test').length
    },
    invoices_generated: invoices.size
  };

  res.json({ data: stats });
});

// Webhook endpoint for payment providers
app.post('/webhook/:provider', async (req, res) => {
  const { provider } = req.params;

  console.log(`[Payment Handler] Received webhook from ${provider}`);

  // In production, verify webhook signature
  // For Stripe: stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  // For PayPal: verify webhook signature

  res.json({ received: true });
});

app.listen(PORT, () => {
  console.log(`✅ Payment Handler Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Stripe: ${STRIPE_ENABLED ? 'Enabled' : 'Disabled (no API key)'}`);
  console.log(`   PayPal: ${PAYPAL_ENABLED ? 'Enabled' : 'Disabled (no credentials)'}`);
});
