const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripeService');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const { auth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Middleware to check if user is organization owner or admin
const requireOwnerOrAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('organization');
    if (!user.organization) {
      return res.status(403).json({ error: 'No organization found' });
    }
    
    if (user.organization.owner.toString() !== req.user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only organization owner or admin can manage billing' });
    }
    
    req.organization = user.organization;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get current subscription
router.get('/subscription', auth, requireOwnerOrAdmin, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ 
      organization: req.organization._id 
    }).populate('organization', 'name email');
    
    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available plans
router.get('/plans', async (req, res) => {
  try {
    const plans = Subscription.getPlans();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create checkout session
router.post('/checkout', [
  auth,
  requireOwnerOrAdmin,
  body('planId').isIn(['starter', 'professional', 'enterprise']).withMessage('Invalid plan ID'),
  body('billingCycle').isIn(['monthly', 'yearly']).withMessage('Invalid billing cycle')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { planId, billingCycle } = req.body;
    
    // Check if organization already has an active subscription
    const existingSubscription = await Subscription.findOne({
      organization: req.organization._id,
      status: { $in: ['active', 'trialing'] }
    });
    
    if (existingSubscription) {
      return res.status(400).json({ error: 'Organization already has an active subscription' });
    }
    
    // Create or get Stripe customer
    let stripeCustomerId = req.organization.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripeService.createCustomer({
        email: req.organization.email,
        name: req.organization.name,
        metadata: {
          organizationId: req.organization._id.toString()
        }
      });
      
      stripeCustomerId = customer.id;
      req.organization.stripeCustomerId = stripeCustomerId;
      await req.organization.save();
    }
    
    // Create checkout session
    const session = await stripeService.createCheckoutSession({
      customerId: stripeCustomerId,
      planId,
      billingCycle,
      successUrl: `${process.env.FRONTEND_URL}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.FRONTEND_URL}/dashboard/billing/plans`,
      metadata: {
        organizationId: req.organization._id.toString(),
        planId,
        billingCycle
      }
    });
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change subscription plan
router.post('/change-plan', [
  auth,
  requireOwnerOrAdmin,
  body('planId').isIn(['starter', 'professional', 'enterprise']).withMessage('Invalid plan ID'),
  body('billingCycle').optional().isIn(['monthly', 'yearly']).withMessage('Invalid billing cycle')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { planId, billingCycle } = req.body;
    
    const subscription = await Subscription.findOne({
      organization: req.organization._id,
      status: { $in: ['active', 'trialing'] }
    });
    
    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    // Update subscription in Stripe
    const updatedStripeSubscription = await stripeService.updateSubscription(
      subscription.stripeSubscriptionId,
      { planId, billingCycle }
    );
    
    // Update local subscription
    const plans = Subscription.getPlans();
    const newPlan = plans[planId];
    
    subscription.planId = planId;
    subscription.planName = newPlan.name;
    subscription.billingCycle = billingCycle || subscription.billingCycle;
    subscription.amount = newPlan.prices[subscription.billingCycle];
    subscription.features = newPlan.features;
    subscription.limits = newPlan.limits;
    
    await subscription.save();
    
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription
router.post('/cancel', auth, requireOwnerOrAdmin, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      organization: req.organization._id,
      status: { $in: ['active', 'trialing'] }
    });
    
    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    // Cancel subscription in Stripe
    await stripeService.cancelSubscription(subscription.stripeSubscriptionId);
    
    // Update local subscription
    subscription.status = 'canceled';
    subscription.canceledAt = new Date();
    subscription.cancelAtPeriodEnd = true;
    
    await subscription.save();
    
    res.json({ message: 'Subscription canceled successfully', subscription });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoices
router.get('/invoices', auth, requireOwnerOrAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const invoices = await Invoice.find({ organization: req.organization._id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('subscription', 'planName billingCycle');
    
    const total = await Invoice.countDocuments({ organization: req.organization._id });
    
    res.json({
      invoices,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific invoice
router.get('/invoices/:invoiceId', auth, requireOwnerOrAdmin, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.invoiceId,
      organization: req.organization._id
    }).populate('subscription', 'planName billingCycle');
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download invoice
router.get('/invoices/:invoiceId/download', auth, requireOwnerOrAdmin, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.invoiceId,
      organization: req.organization._id
    });
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (!invoice.pdfUrl) {
      return res.status(404).json({ error: 'Invoice PDF not available' });
    }
    
    // Redirect to Stripe hosted invoice PDF
    res.redirect(invoice.pdfUrl);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payment methods
router.get('/payment-methods', auth, requireOwnerOrAdmin, async (req, res) => {
  try {
    if (!req.organization.stripeCustomerId) {
      return res.json({ paymentMethods: [] });
    }
    
    const paymentMethods = await stripeService.getPaymentMethods(req.organization.stripeCustomerId);
    res.json({ paymentMethods });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create customer portal session
router.post('/portal', auth, requireOwnerOrAdmin, async (req, res) => {
  try {
    if (!req.organization.stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }
    
    const portalSession = await stripeService.createCustomerPortalSession(
      req.organization.stripeCustomerId,
      `${process.env.FRONTEND_URL}/dashboard/billing`
    );
    
    res.json({ url: portalSession.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record usage (for usage-based billing)
router.post('/usage', [
  auth,
  body('metric').isIn(['ai_requests', 'storage_gb', 'api_calls']).withMessage('Invalid metric'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { metric, quantity } = req.body;
    const user = await User.findById(req.user.id).populate('organization');
    
    if (!user.organization) {
      return res.status(403).json({ error: 'No organization found' });
    }
    
    const subscription = await Subscription.findOne({
      organization: user.organization._id,
      status: { $in: ['active', 'trialing'] }
    });
    
    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    // Check if usage exceeds limits
    const canUse = subscription.canUseFeature(metric, quantity);
    if (!canUse) {
      return res.status(403).json({ error: `Usage limit exceeded for ${metric}` });
    }
    
    // Record usage
    await subscription.incrementUsage(metric, quantity);
    
    // Record usage in Stripe for usage-based billing (if applicable)
    if (subscription.stripeSubscriptionId) {
      await stripeService.recordUsage(
        subscription.stripeSubscriptionId,
        metric,
        quantity
      );
    }
    
    res.json({ message: 'Usage recorded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get usage statistics
router.get('/usage', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('organization');
    
    if (!user.organization) {
      return res.status(403).json({ error: 'No organization found' });
    }
    
    const subscription = await Subscription.findOne({
      organization: user.organization._id,
      status: { $in: ['active', 'trialing'] }
    });
    
    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    res.json({
      usage: subscription.usage,
      limits: subscription.limits,
      usagePercentages: {
        aiRequests: subscription.getUsagePercentage('aiRequests'),
        storageGb: subscription.getUsagePercentage('storageGb'),
        apiCalls: subscription.getUsagePercentage('apiCalls')
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;