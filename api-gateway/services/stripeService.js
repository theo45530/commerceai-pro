const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const User = require('../models/User');
const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const logger = require('../../logging/logger-config');

class StripeService {
  constructor() {
    this.stripe = stripe;
  }

  _checkStripeConfig() {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }
  }

  // Customer Management
  async createCustomer(user, organization) {
    try {
      this._checkStripeConfig();
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString(),
          organizationId: organization._id.toString()
        }
      });

      // Update user and organization with Stripe customer ID
      await Promise.all([
        User.findByIdAndUpdate(user._id, { stripeCustomerId: customer.id }),
        Organization.findByIdAndUpdate(organization._id, { stripeCustomerId: customer.id })
      ]);

      logger.info(`Stripe customer created: ${customer.id} for user: ${user.email}`);
      return customer;
    } catch (error) {
      logger.error('Error creating Stripe customer:', error);
      throw new Error('Failed to create customer');
    }
  }

  async updateCustomer(customerId, updates) {
    try {
      this._checkStripeConfig();
      const customer = await stripe.customers.update(customerId, updates);
      logger.info(`Stripe customer updated: ${customerId}`);
      return customer;
    } catch (error) {
      logger.error('Error updating Stripe customer:', error);
      throw new Error('Failed to update customer');
    }
  }

  // Payment Methods
  async attachPaymentMethod(customerId, paymentMethodId) {
    try {
      this._checkStripeConfig();
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });

      // Set as default payment method
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      logger.info(`Payment method attached: ${paymentMethodId} to customer: ${customerId}`);
      return true;
    } catch (error) {
      logger.error('Error attaching payment method:', error);
      throw new Error('Failed to attach payment method');
    }
  }

  async getPaymentMethods(customerId) {
    try {
      this._checkStripeConfig();
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });
      return paymentMethods.data;
    } catch (error) {
      logger.error('Error fetching payment methods:', error);
      throw new Error('Failed to fetch payment methods');
    }
  }

  // Subscription Management
  async createSubscription(customerId, priceId, planType, organizationId, userId) {
    try {
      this._checkStripeConfig();
      const planConfig = Subscription.getPlanConfig(planType);
      if (!planConfig) {
        throw new Error('Invalid plan type');
      }

      // Create Stripe subscription
      const stripeSubscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: 14,
        metadata: {
          organizationId: organizationId.toString(),
          userId: userId.toString(),
          planType
        },
        expand: ['latest_invoice.payment_intent']
      });

      // Create local subscription record
      const subscription = new Subscription({
        organizationId,
        userId,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: customerId,
        stripePriceId: priceId,
        stripeProductId: stripeSubscription.items.data[0].price.product,
        plan: planType,
        planName: planConfig.name,
        amount: planConfig.amount,
        currency: 'eur',
        interval: 'month',
        status: stripeSubscription.status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
        trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
        nextBillingDate: new Date(stripeSubscription.current_period_end * 1000),
        features: planConfig.features
      });

      await subscription.save();

      // Update organization with subscription
      await Organization.findByIdAndUpdate(organizationId, {
        subscriptionId: subscription._id,
        status: 'trial'
      });

      logger.info(`Subscription created: ${stripeSubscription.id} for organization: ${organizationId}`);
      return { stripeSubscription, subscription };
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  async updateSubscription(subscriptionId, updates) {
    try {
      this._checkStripeConfig();
      const stripeSubscription = await stripe.subscriptions.update(subscriptionId, updates);
      
      // Update local subscription
      const subscription = await Subscription.findOne({ stripeSubscriptionId: subscriptionId });
      if (subscription) {
        subscription.status = stripeSubscription.status;
        subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
        subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
        await subscription.save();
      }

      logger.info(`Subscription updated: ${subscriptionId}`);
      return stripeSubscription;
    } catch (error) {
      logger.error('Error updating subscription:', error);
      throw new Error('Failed to update subscription');
    }
  }

  async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
    try {
      this._checkStripeConfig();
      const stripeSubscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd
      });

      // Update local subscription
      const subscription = await Subscription.findOne({ stripeSubscriptionId: subscriptionId });
      if (subscription) {
        subscription.cancelAtPeriodEnd = cancelAtPeriodEnd;
        if (!cancelAtPeriodEnd) {
          subscription.status = 'canceled';
          subscription.canceledAt = new Date();
          subscription.endedAt = new Date();
        }
        await subscription.save();
      }

      logger.info(`Subscription ${cancelAtPeriodEnd ? 'scheduled for cancellation' : 'canceled'}: ${subscriptionId}`);
      return stripeSubscription;
    } catch (error) {
      logger.error('Error canceling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  async changePlan(subscriptionId, newPriceId, newPlanType) {
    try {
      this._checkStripeConfig();
      const subscription = await Subscription.findOne({ stripeSubscriptionId: subscriptionId });
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const newPlanConfig = Subscription.getPlanConfig(newPlanType);
      if (!newPlanConfig) {
        throw new Error('Invalid plan type');
      }

      // Calculate proration
      const proration = subscription.calculateProration(newPlanConfig.amount);

      // Update Stripe subscription
      const stripeSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.stripeSubscriptionId,
          price: newPriceId
        }],
        proration_behavior: 'always_invoice'
      });

      // Update local subscription
      subscription.stripePriceId = newPriceId;
      subscription.plan = newPlanType;
      subscription.planName = newPlanConfig.name;
      subscription.amount = newPlanConfig.amount;
      subscription.features = newPlanConfig.features;
      await subscription.save();

      logger.info(`Plan changed for subscription: ${subscriptionId} to ${newPlanType}`);
      return { stripeSubscription, subscription, proration };
    } catch (error) {
      logger.error('Error changing plan:', error);
      throw new Error('Failed to change plan');
    }
  }

  // Invoice Management
  async createInvoice(subscriptionId, items = []) {
    try {
      this._checkStripeConfig();
      const subscription = await Subscription.findOne({ stripeSubscriptionId: subscriptionId })
        .populate('organizationId');
      
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Create Stripe invoice
      const stripeInvoice = await stripe.invoices.create({
        customer: subscription.stripeCustomerId,
        subscription: subscriptionId,
        auto_advance: true,
        metadata: {
          organizationId: subscription.organizationId._id.toString(),
          subscriptionId: subscription._id.toString()
        }
      });

      // Add custom line items if provided
      for (const item of items) {
        await stripe.invoiceItems.create({
          customer: subscription.stripeCustomerId,
          invoice: stripeInvoice.id,
          amount: item.amount,
          currency: item.currency || 'eur',
          description: item.description
        });
      }

      // Finalize invoice
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id);

      // Create local invoice record
      const invoice = new Invoice({
        organizationId: subscription.organizationId._id,
        subscriptionId: subscription._id,
        stripeInvoiceId: finalizedInvoice.id,
        stripeCustomerId: subscription.stripeCustomerId,
        status: finalizedInvoice.status,
        subtotal: finalizedInvoice.subtotal,
        tax: finalizedInvoice.tax || 0,
        total: finalizedInvoice.total,
        amountDue: finalizedInvoice.amount_due,
        currency: finalizedInvoice.currency,
        dueDate: new Date(finalizedInvoice.due_date * 1000),
        periodStart: new Date(finalizedInvoice.period_start * 1000),
        periodEnd: new Date(finalizedInvoice.period_end * 1000),
        customer: {
          name: subscription.organizationId.name,
          email: subscription.organizationId.email
        },
        hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url,
        pdfUrl: finalizedInvoice.invoice_pdf
      });

      await invoice.save();

      logger.info(`Invoice created: ${finalizedInvoice.id} for subscription: ${subscriptionId}`);
      return { stripeInvoice: finalizedInvoice, invoice };
    } catch (error) {
      logger.error('Error creating invoice:', error);
      throw new Error('Failed to create invoice');
    }
  }

  async payInvoice(invoiceId) {
    try {
      this._checkStripeConfig();
      const stripeInvoice = await stripe.invoices.pay(invoiceId);
      
      // Update local invoice
      const invoice = await Invoice.findOne({ stripeInvoiceId: invoiceId });
      if (invoice) {
        await invoice.markAsPaid();
      }

      logger.info(`Invoice paid: ${invoiceId}`);
      return stripeInvoice;
    } catch (error) {
      logger.error('Error paying invoice:', error);
      throw new Error('Failed to pay invoice');
    }
  }

  // Usage-based billing
  async recordUsage(subscriptionItemId, quantity, timestamp = null) {
    try {
      this._checkStripeConfig();
      const usageRecord = await stripe.subscriptionItems.createUsageRecord(
        subscriptionItemId,
        {
          quantity,
          timestamp: timestamp || Math.floor(Date.now() / 1000),
          action: 'increment'
        }
      );

      logger.info(`Usage recorded: ${quantity} for subscription item: ${subscriptionItemId}`);
      return usageRecord;
    } catch (error) {
      logger.error('Error recording usage:', error);
      throw new Error('Failed to record usage');
    }
  }

  // Webhook handling
  async handleWebhook(event) {
    try {
      logger.info(`Processing webhook event: ${event.type}`);

      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;
        case 'invoice.created':
          await this.handleInvoiceCreated(event.data.object);
          break;
        case 'customer.created':
          await this.handleCustomerCreated(event.data.object);
          break;
        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(event.data.object);
          break;
        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      logger.error('Error handling webhook:', error);
      throw error;
    }
  }

  async handleSubscriptionCreated(subscription) {
    // Subscription creation is handled in createSubscription method
    logger.info(`Subscription created webhook: ${subscription.id}`);
  }

  async handleSubscriptionUpdated(subscription) {
    const localSubscription = await Subscription.findOne({ 
      stripeSubscriptionId: subscription.id 
    });

    if (localSubscription) {
      localSubscription.status = subscription.status;
      localSubscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
      localSubscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      
      if (subscription.canceled_at) {
        localSubscription.canceledAt = new Date(subscription.canceled_at * 1000);
      }
      
      if (subscription.ended_at) {
        localSubscription.endedAt = new Date(subscription.ended_at * 1000);
      }

      await localSubscription.save();

      // Update organization status
      const organization = await Organization.findById(localSubscription.organizationId);
      if (organization) {
        organization.status = subscription.status === 'active' ? 'active' : 
                            subscription.status === 'trialing' ? 'trial' : 'suspended';
        await organization.save();
      }
    }

    logger.info(`Subscription updated: ${subscription.id}`);
  }

  async handleSubscriptionDeleted(subscription) {
    const localSubscription = await Subscription.findOne({ 
      stripeSubscriptionId: subscription.id 
    });

    if (localSubscription) {
      localSubscription.status = 'canceled';
      localSubscription.endedAt = new Date();
      await localSubscription.save();

      // Update organization status
      const organization = await Organization.findById(localSubscription.organizationId);
      if (organization) {
        organization.status = 'cancelled';
        await organization.save();
      }
    }

    logger.info(`Subscription deleted: ${subscription.id}`);
  }

  async handleInvoicePaymentSucceeded(invoice) {
    const localInvoice = await Invoice.findOne({ stripeInvoiceId: invoice.id });
    
    if (localInvoice) {
      await localInvoice.markAsPaid({
        paymentMethodId: invoice.payment_intent?.payment_method
      });

      // Send payment confirmation notification
      await localInvoice.sendNotification('payment_succeeded', localInvoice.customer.email);
    }

    logger.info(`Invoice payment succeeded: ${invoice.id}`);
  }

  async handleInvoicePaymentFailed(invoice) {
    const localInvoice = await Invoice.findOne({ stripeInvoiceId: invoice.id });
    
    if (localInvoice) {
      await localInvoice.markPaymentFailed(invoice.last_finalization_error?.message);

      // Send payment failed notification
      await localInvoice.sendNotification('payment_failed', localInvoice.customer.email);
    }

    logger.info(`Invoice payment failed: ${invoice.id}`);
  }

  async handleInvoiceCreated(invoice) {
    // Invoice creation is handled in createInvoice method
    logger.info(`Invoice created webhook: ${invoice.id}`);
  }

  async handleCustomerCreated(customer) {
    logger.info(`Customer created webhook: ${customer.id}`);
  }

  async handlePaymentMethodAttached(paymentMethod) {
    // Update subscription with payment method details
    const subscription = await Subscription.findOne({ 
      stripeCustomerId: paymentMethod.customer 
    });

    if (subscription && paymentMethod.card) {
      subscription.defaultPaymentMethod = {
        stripePaymentMethodId: paymentMethod.id,
        type: 'card',
        last4: paymentMethod.card.last4,
        brand: paymentMethod.card.brand,
        expiryMonth: paymentMethod.card.exp_month,
        expiryYear: paymentMethod.card.exp_year
      };
      await subscription.save();
    }

    logger.info(`Payment method attached: ${paymentMethod.id}`);
  }

  // Utility methods
  async getCustomerPortalUrl(customerId, returnUrl) {
    try {
      this._checkStripeConfig();
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      });
      return session.url;
    } catch (error) {
      logger.error('Error creating customer portal session:', error);
      throw new Error('Failed to create customer portal session');
    }
  }

  async createCheckoutSession(customerId, priceId, successUrl, cancelUrl, metadata = {}) {
    try {
      this._checkStripeConfig();
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata
      });
      return session;
    } catch (error) {
      logger.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }
}

module.exports = new StripeService();