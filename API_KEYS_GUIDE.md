# API Keys and Configuration Guide

## Platform: Meal Scavenger Hunt (Koopjesjacht)

This platform is a gamified meal collection system with multi-agent architecture, built with Node.js/React frontend, PostgreSQL/Redis data stores, and SmythOS AI agents.

---

## 🔑 Required API Keys

### 1. **SmythOS API Key** (CRITICAL - NEEDS EXPLICIT INSTRUCTIONS)
**Purpose:** Powers all AI agents (clue generation, QR management, stats, payments, notifications)

**How to Obtain SmythOS API Key:**

1. **Visit SmythOS Website**
   - Go to https://smythos.com
   - Click "Get Started" or "Sign Up" button

2. **Create Account**
   - Register with email address
   - Verify email through confirmation link
   - Complete profile setup

3. **Access Developer Dashboard**
   - Log into SmythOS account
   - Navigate to Dashboard → API Keys section
   - Or directly visit: https://app.smythos.com/api-keys

4. **Generate API Key**
   - Click "Create New API Key"
   - Name it: "Meal Scavenger Hunt Platform"
   - Select permissions:
     - Agent Creation & Management
     - Workflow Execution
     - Data Processing
     - Real-time Communication
   - Copy the generated key immediately (shown only once!)

5. **Configure Usage Limits** (Optional)
   - Set rate limits if needed
   - Configure spending caps
   - Enable usage alerts

6. **Test the Key**
   ```bash
   curl -X GET https://api.smythos.com/v1/verify \
     -H "Authorization: Bearer YOUR_SMYTHOS_API_KEY"
   ```

**Pricing:** 
- Free tier: 1,000 API calls/month
- Starter: $29/month for 10,000 calls
- Pro: $99/month for 100,000 calls
- Enterprise: Custom pricing

---

### 2. **Stripe Secret Key**
**Purpose:** Credit card payment processing

**How to Obtain:**
1. Sign up at https://stripe.com
2. Go to Dashboard → Developers → API Keys
3. Copy the Secret Key (starts with `sk_`)
4. For testing, use test keys (sk_test_...)
5. Documentation: https://stripe.com/docs/keys

---

### 3. **PayPal Client Credentials**
**Purpose:** PayPal payment integration

**How to Obtain:**
1. Sign up at https://developer.paypal.com
2. Create an App in Dashboard
3. Get Client ID and Secret
4. Use Sandbox for testing
5. Documentation: https://developer.paypal.com/docs/api/overview/

---

### 4. **Mollie API Key**
**Purpose:** iDEAL and European payment methods

**How to Obtain:**
1. Sign up at https://www.mollie.com
2. Complete verification process
3. Dashboard → Settings → API Keys
4. Create API key for your platform
5. Test with test API key first
6. Documentation: https://docs.mollie.com/

---

### 5. **Firebase Credentials**
**Purpose:** Push notifications

**How to Obtain:**
1. Go to https://console.firebase.google.com
2. Create new project
3. Settings → Service Accounts
4. Generate new private key
5. Download JSON file containing:
   - project_id
   - private_key
   - client_email

---

### 6. **SMTP Credentials**
**Purpose:** Email notifications

**Options:**

**Gmail (App Password):**
1. Enable 2FA on Google Account
2. Go to https://myaccount.google.com/apppasswords
3. Generate app-specific password
4. Use with smtp.gmail.com:587

**SendGrid:**
1. Sign up at https://sendgrid.com
2. Settings → API Keys → Create API Key
3. Use SMTP relay settings

---

## 📝 Environment Setup

Create `.env` file in project root:

```bash
# Database
DB_USER=scavenger
DB_PASSWORD=scavenger_secret
DB_NAME=scavenger_hunt

# Application
NODE_ENV=development
REACT_APP_API_URL=http://localhost:3527
JWT_SECRET=generate_secure_random_string_here

# SmythOS (REQUIRED)
SMYTHOS_API_KEY=your_smythos_api_key_here

# Payment Providers
STRIPE_SECRET_KEY=sk_test_your_stripe_key
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_secret
MOLLIE_API_KEY=test_your_mollie_key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Firebase (Optional)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com

# Redis
REDIS_URL=redis://redis:3493
```

---

## 🔐 Security Best Practices

1. **Never commit `.env` file to git**
2. **Use different keys for development/production**
3. **Rotate keys regularly**
4. **Use secret management service in production**
5. **Enable API key restrictions where possible**
6. **Monitor API usage for anomalies**

---

## 🧪 Testing Without Keys

For initial testing without all keys:

1. **Minimum Required:**
   - Database credentials (local PostgreSQL)
   - JWT_SECRET (any random string)
   - SMYTHOS_API_KEY (for AI features)

2. **Mock Mode:**
   - Set `MOCK_PAYMENTS=true` to bypass payment APIs
   - Set `MOCK_NOTIFICATIONS=true` to bypass email/push
   - AI agents will fail without SmythOS key

3. **Local Development:**
   ```bash
   # Start only core services
   docker-compose up postgres redis backend frontend
   ```

---

## 📞 Support Contacts

- **SmythOS Support:** support@smythos.com or https://smythos.com/support
- **Stripe Support:** https://support.stripe.com
- **PayPal Support:** https://www.paypal.com/merchantsupport
- **Mollie Support:** info@mollie.com
- **Firebase Support:** https://firebase.google.com/support