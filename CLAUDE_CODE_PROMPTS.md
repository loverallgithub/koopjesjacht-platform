# 🤖 Claude Code Enhancement Prompts

## Ready-to-Use Prompts for Meal Scavenger Hunt Platform

---

## 📋 **How to Use These Prompts**

1. Copy the prompt exactly as written
2. Paste into Claude Code
3. Let Claude analyze the codebase and implement the enhancement
4. Review and approve changes before proceeding to next enhancement

---

## 🎯 **Category A: Core User Experience**

### **A1: Advanced Gamification System**

```
Implement an advanced gamification system for the meal scavenger hunt platform. Add the following features:

1. XP and leveling system with skill trees
2. Achievement badges system (speed demon, explorer, team player, etc.)
3. Multiple leaderboard categories (speed, points, discoveries, team collaboration)
4. Social sharing capabilities for accomplishments
5. Hunt difficulty ratings that scale rewards

Requirements:
- Create database schema for XP, levels, achievements, and badges
- Add XP calculation logic based on hunt completion time, difficulty, and team performance
- Implement achievement tracking and badge awarding system
- Create leaderboard API endpoints with different sorting options
- Add frontend components for displaying progress, achievements, and leaderboards
- Include social sharing functionality for achievements

Focus on user engagement and retention through meaningful progression and recognition systems.
```

### **A2: AI-Powered Dynamic Clue Generation**

```
Enhance the SmythOS clue generation agent to create dynamic, adaptive clues. Implement:

1. Real-time difficulty adjustment based on team performance
2. Personalized hints using team history and preferences
3. Weather and time-based clue variations
4. Multi-language clue generation (EN/NL with extensibility)
5. Local culture and history integration

Requirements:
- Extend the clue-generator agent with ML-based difficulty assessment
- Add personalization engine that analyzes team past performance
- Integrate weather API for weather-dependent clue variations
- Implement i18n framework for multi-language clue generation
- Create local knowledge database for culture/history references
- Add A/B testing for clue effectiveness
- Update the clue generation API to accept context parameters

Focus on creating engaging, contextual clues that adapt to each team's capabilities and current conditions.
```

### **A3: Augmented Reality (AR) Hunt Mode**

```
Add Augmented Reality features to the mobile experience. Implement:

1. AR waypoint navigation using device camera
2. 3D clue overlays that appear at specific locations
3. Virtual treasure chest animations upon completion
4. AR photo filters for social sharing
5. AR-based team challenges and mini-games

Requirements:
- Integrate AR framework (WebXR or native AR libraries)
- Create 3D models for waypoints, clues, and treasure chests
- Implement location-based AR trigger system
- Add camera permission handling and AR capability detection
- Create AR-specific UI components and controls
- Build photo capture and filter system
- Add AR mini-games between hunt locations
- Ensure graceful fallback for devices without AR support

Focus on immersive experience that enhances discovery and engagement while maintaining accessibility.
```

---

## 📊 **Category B: Business Intelligence**

### **B1: Advanced Analytics Dashboard**

```
Create a comprehensive analytics dashboard for organizers and shop owners. Include:

1. Real-time hunt heatmaps showing popular routes and bottlenecks
2. Customer journey analytics with conversion funnels
3. ROI tracking for shop owners with revenue attribution
4. Predictive attendance modeling using historical data
5. Custom report generation with export capabilities

Requirements:
- Build analytics data pipeline with proper event tracking
- Create heatmap visualization using geographic data
- Implement funnel analysis for hunt completion rates
- Add revenue tracking and attribution models
- Build predictive models for attendance forecasting
- Create customizable dashboard with drag-drop widgets
- Add report scheduling and export functionality (PDF, CSV, Excel)
- Implement role-based access control for different user types

Focus on actionable insights that help organizers optimize hunts and shop owners maximize participation.
```

### **B2: A/B Testing Framework**

```
Build a built-in A/B testing framework for the platform. Implement:

1. Hunt format and rule experimentation
2. UI/UX variation testing capabilities
3. Pricing model experiments
4. Feature flag management system
5. Statistical significance tracking and reporting

Requirements:
- Create experiment configuration system
- Implement user segmentation for test groups
- Add feature flag infrastructure with real-time toggles
- Build statistical analysis engine for experiment results
- Create A/B test dashboard for monitoring and management
- Add experiment lifecycle management (create, run, analyze, conclude)
- Implement gradual rollout capabilities
- Add integration with analytics for conversion tracking

Focus on data-driven decision making and continuous optimization of the platform.
```

---

## 🏗️ **Category C: Technical Infrastructure**

### **C1: Microservices Architecture Migration**

```
Migrate the current monolithic backend to a microservices architecture. Implement:

1. Service mesh with API gateway
2. Independent scaling capabilities for each service
3. Fault isolation and circuit breaker patterns
4. Service discovery and load balancing
5. Distributed tracing and monitoring

Requirements:
- Break down current backend into logical microservices (auth, hunts, payments, notifications, analytics)
- Implement API gateway using Kong or similar
- Set up service mesh with Istio or Linkerd
- Add circuit breakers and retry mechanisms
- Implement distributed tracing with Jaeger or Zipkin
- Create service discovery mechanism
- Add health checks and monitoring for each service
- Update Docker composition for microservices deployment
- Maintain backward compatibility during migration

Focus on scalability, maintainability, and fault tolerance while ensuring zero downtime migration.
```

### **C2: Advanced Caching Strategy**

```
Implement a multi-layer caching strategy to optimize performance. Add:

1. CDN integration for static assets
2. Redis cluster setup for distributed caching
3. Database query optimization with intelligent caching
4. Browser caching strategies for frontend
5. API response caching with smart invalidation

Requirements:
- Set up CDN (CloudFlare or AWS CloudFront) integration
- Configure Redis cluster with master-slave replication
- Implement query result caching with automatic invalidation
- Add browser caching headers and service worker caching
- Create cache warming strategies for popular data
- Implement cache analytics and monitoring
- Add cache invalidation APIs for real-time updates
- Optimize database indexes and query patterns

Focus on reducing response times and database load while maintaining data consistency.
```

---

## 💰 **Category D: Monetization & Growth**

### **D1: Subscription & Premium Tiers**

```
Implement a subscription system with premium features. Add:

1. Multiple subscription tiers (Basic, Premium, Enterprise)
2. Premium hunt access and exclusive content
3. Ad-free experience for subscribers
4. Advanced team analytics for premium users
5. Billing management and payment processing

Requirements:
- Design subscription tiers with clear feature differentiation
- Integrate subscription billing with Stripe Billing
- Create subscription management dashboard for users
- Implement feature gating based on subscription level
- Add usage tracking and billing analytics
- Create dunning management for failed payments
- Implement prorated upgrades/downgrades
- Add subscription analytics and churn tracking
- Create admin tools for subscription management

Focus on recurring revenue generation while providing clear value propositions for each tier.
```

### **D2: Marketplace for Hunt Creators**

```
Build a marketplace where users can create and sell custom hunts. Implement:

1. Hunt creation tools with drag-drop interface
2. Template marketplace with rating system
3. Revenue sharing model for creators
4. Creator analytics dashboard
5. Community features for hunt sharing and feedback

Requirements:
- Create visual hunt designer with map integration
- Build template system with customizable elements
- Implement payment processing for hunt purchases
- Add revenue sharing and payout system
- Create creator onboarding and verification process
- Build rating and review system for hunts
- Add search and discovery features for marketplace
- Implement creator analytics and earnings dashboard
- Add community features (comments, forums, creator profiles)

Focus on user-generated content that expands the platform's offering while creating new revenue streams.
```

---

## 🔒 **Category E: Security & Compliance**

### **E1: Advanced Security Framework**

```
Implement enterprise-grade security measures. Add:

1. Multi-factor authentication (MFA) system
2. Advanced rate limiting and DDoS protection
3. Data encryption at rest and in transit
4. Security audit logging and monitoring
5. Automated security testing and vulnerability scanning

Requirements:
- Implement MFA using TOTP, SMS, or authenticator apps
- Add advanced rate limiting with IP-based and user-based rules
- Set up DDoS protection with fail2ban or cloud-based solutions
- Encrypt sensitive data in database and file storage
- Implement comprehensive audit logging for all user actions
- Add security monitoring with anomaly detection
- Set up automated vulnerability scanning in CI/CD pipeline
- Create security incident response procedures
- Add security headers and OWASP compliance

Focus on protecting user data and platform integrity while maintaining usability.
```

### **E2: GDPR & Privacy Compliance**

```
Implement comprehensive GDPR compliance and privacy protection. Add:

1. Data anonymization and pseudonymization tools
2. Consent management platform
3. Right to be forgotten automation
4. Privacy policy automation and updates
5. Data breach detection and response procedures

Requirements:
- Create consent management system with granular permissions
- Implement data anonymization for analytics and reporting
- Build automated data deletion system for GDPR requests
- Add privacy policy generator with legal compliance
- Create data mapping and inventory system
- Implement breach detection and notification system
- Add data portability features for user data export
- Create privacy dashboard for users to manage their data
- Implement cookie consent management
- Add privacy impact assessment tools

Focus on legal compliance while maintaining platform functionality and user experience.
```

---

## 🚀 **Phase-Based Implementation**

### **Quick Wins (1-2 weeks each):**
```
Implement advanced caching strategy for immediate performance improvements. Focus on Redis setup, query optimization, and CDN integration for static assets.
```

```
Add corporate team building packages to unlock B2B revenue streams. Create custom booking flows, bulk pricing, and corporate analytics dashboards.
```

### **Foundation Phase (3-4 weeks each):**
```
Build the advanced analytics dashboard to provide actionable insights for all user types. Focus on real-time data, predictive analytics, and customizable reporting.
```

```
Implement the advanced security framework to establish trust and compliance. Prioritize MFA, encryption, and audit logging.
```

### **Growth Phase (4-6 weeks each):**
```
Create the advanced gamification system to boost user engagement and retention. Focus on meaningful progression and social features.
```

```
Build the subscription and premium tiers system to establish recurring revenue streams with clear value propositions.
```

---

## 📝 **Notes for Implementation**

- **Always backup the database before major changes**
- **Implement feature flags for gradual rollouts**
- **Test thoroughly in staging environment first**
- **Monitor performance metrics during and after deployment**
- **Get user feedback early and iterate based on responses**
- **Maintain backwards compatibility where possible**
- **Document all new APIs and configuration changes**