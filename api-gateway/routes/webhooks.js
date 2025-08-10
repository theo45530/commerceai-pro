const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripeService');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');

// Stripe webhook endpoint
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripeService.constructWebhookEvent(req.body, sig);
    
    console.log(`Received Stripe webhook: ${event.type}`);
    
    switch (event.type) {
      case 'customer.created':
        await handleCustomerCreated(event.data.object);
        break;
        
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object);
        break;
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.created':
        await handleInvoiceCreated(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
        
      case 'invoice.finalized':
        await handleInvoiceFinalized(event.data.object);
        break;
        
      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object);
        break;
        
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Webhook handlers
async function handleCustomerCreated(customer) {
  try {
    const organizationId = customer.metadata?.organizationId;
    if (!organizationId) return;
    
    await Organization.findByIdAndUpdate(organizationId, {
      stripeCustomerId: customer.id,
      'billing.email': customer.email
    });
    
    console.log(`Updated organization ${organizationId} with Stripe customer ${customer.id}`);
  } catch (error) {
    console.error('Error handling customer.created:', error);
  }
}

async function handleCustomerUpdated(customer) {
  try {
    await Organization.findOneAndUpdate(
      { stripeCustomerId: customer.id },
      {
        'billing.email': customer.email,
        'billing.phone': customer.phone,
        'billing.address': customer.address
      }
    );
    
    console.log(`Updated customer ${customer.id}`);
  } catch (error) {
    console.error('Error handling customer.updated:', error);
  }
}

async function handleSubscriptionCreated(subscription) {
  try {
    const organizationId = subscription.metadata?.organizationId;
    if (!organizationId) return;
    
    const organization = await Organization.findById(organizationId);
    if (!organization) return;
    
    // Get plan details from metadata or price
    const planId = subscription.metadata?.planId || 'starter';
    const billingCycle = subscription.metadata?.billingCycle || 'monthly';
    const plans = Subscription.getPlans();
    const plan = plans[planId];
    
    // Create subscription record
    const newSubscription = new Subscription({
      organization: organizationId,
      user: organization.owner,
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      planId,
      planName: plan.name,
      billingCycle,
      status: subscription.status,
      amount: subscription.items.data[0]?.price?.unit_amount || plan.prices[billingCycle],
      currency: subscription.currency,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      features: plan.features,
      limits: plan.limits,
      trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
    });
    
    await newSubscription.save();
    
    // Update organization subscription reference
    organization.subscription = newSubscription._id;
    organization.subscriptionStatus = subscription.status;
    await organization.save();
    
    console.log(`Created subscription ${subscription.id} for organization ${organizationId}`);
  } catch (error) {
    console.error('Error handling subscription.created:', error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    const existingSubscription = await Subscription.findOne({
      stripeSubscriptionId: subscription.id
    });
    
    if (!existingSubscription) return;
    
    // Update subscription details
    existingSubscription.status = subscription.status;
    existingSubscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
    existingSubscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    existingSubscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
    
    if (subscription.canceled_at) {
      existingSubscription.canceledAt = new Date(subscription.canceled_at * 1000);
    }
    
    if (subscription.trial_end) {
      existingSubscription.trialEnd = new Date(subscription.trial_end * 1000);
    }
    
    await existingSubscription.save();
    
    // Update organization status
    await Organization.findByIdAndUpdate(existingSubscription.organization, {
      subscriptionStatus: subscription.status
    });
    
    console.log(`Updated subscription ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription.updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    const existingSubscription = await Subscription.findOne({
      stripeSubscriptionId: subscription.id
    });
    
    if (!existingSubscription) return;
    
    existingSubscription.status = 'canceled';
    existingSubscription.canceledAt = new Date();
    await existingSubscription.save();
    
    // Update organization status
    await Organization.findByIdAndUpdate(existingSubscription.organization, {
      subscriptionStatus: 'canceled'
    });
    
    console.log(`Deleted subscription ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription.deleted:', error);
  }
}

async function handleInvoiceCreated(invoice) {
  try {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: invoice.subscription
    });
    
    if (!subscription) return;
    
    // Create invoice record
    const newInvoice = new Invoice({
      organization: subscription.organization,
      subscription: subscription._id,
      stripeInvoiceId: invoice.id,
      stripeCustomerId: invoice.customer,
      invoiceNumber: invoice.number,
      status: invoice.status,
      subtotal: invoice.subtotal,
      total: invoice.total,
      amountPaid: invoice.amount_paid,
      amountDue: invoice.amount_due,
      currency: invoice.currency,
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      paidAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : null,
      billingPeriodStart: new Date(invoice.period_start * 1000),
      billingPeriodEnd: new Date(invoice.period_end * 1000),
      lineItems: invoice.lines.data.map(item => ({
        description: item.description,
        amount: item.amount,
        quantity: item.quantity,
        unitAmount: item.price?.unit_amount,
        currency: item.currency
      })),
      tax: invoice.tax || 0,
      discount: invoice.discount?.amount || 0,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      pdfUrl: invoice.invoice_pdf
    });
    
    await newInvoice.save();
    
    console.log(`Created invoice ${invoice.id}`);
  } catch (error) {
    console.error('Error handling invoice.created:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  try {
    const existingInvoice = await Invoice.findOne({
      stripeInvoiceId: invoice.id
    });
    
    if (existingInvoice) {
      await existingInvoice.markAsPaid({
        paidAt: new Date(invoice.status_transitions.paid_at * 1000),
        amountPaid: invoice.amount_paid,
        paymentMethod: invoice.payment_intent?.payment_method
      });
    }
    
    // Update subscription if this was a subscription invoice
    if (invoice.subscription) {
      const subscription = await Subscription.findOne({
        stripeSubscriptionId: invoice.subscription
      });
      
      if (subscription) {
        subscription.lastPaymentDate = new Date();
        subscription.nextBillingDate = new Date(invoice.period_end * 1000);
        await subscription.save();
      }
    }
    
    console.log(`Payment succeeded for invoice ${invoice.id}`);
  } catch (error) {
    console.error('Error handling invoice.payment_succeeded:', error);
  }
}

async function handleInvoicePaymentFailed(invoice) {
  try {
    const existingInvoice = await Invoice.findOne({
      stripeInvoiceId: invoice.id
    });
    
    if (existingInvoice) {
      await existingInvoice.markAsFailed({
        failedAt: new Date(),
        failureReason: invoice.last_finalization_error?.message
      });
    }
    
    // Update subscription status if needed
    if (invoice.subscription) {
      const subscription = await Subscription.findOne({
        stripeSubscriptionId: invoice.subscription
      });
      
      if (subscription) {
        subscription.paymentFailures = (subscription.paymentFailures || 0) + 1;
        await subscription.save();
        
        // If too many failures, consider suspending
        if (subscription.paymentFailures >= 3) {
          await Organization.findByIdAndUpdate(subscription.organization, {
            subscriptionStatus: 'past_due'
          });
        }
      }
    }
    
    console.log(`Payment failed for invoice ${invoice.id}`);
  } catch (error) {
    console.error('Error handling invoice.payment_failed:', error);
  }
}

async function handleInvoiceFinalized(invoice) {
  try {
    await Invoice.findOneAndUpdate(
      { stripeInvoiceId: invoice.id },
      {
        status: invoice.status,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        pdfUrl: invoice.invoice_pdf,
        finalizedAt: new Date()
      }
    );
    
    console.log(`Invoice ${invoice.id} finalized`);
  } catch (error) {
    console.error('Error handling invoice.finalized:', error);
  }
}

async function handlePaymentMethodAttached(paymentMethod) {
  try {
    // Update organization with default payment method if this is the first one
    const organization = await Organization.findOne({
      stripeCustomerId: paymentMethod.customer
    });
    
    if (organization && !organization.defaultPaymentMethod) {
      organization.defaultPaymentMethod = paymentMethod.id;
      await organization.save();
    }
    
    console.log(`Payment method ${paymentMethod.id} attached`);
  } catch (error) {
    console.error('Error handling payment_method.attached:', error);
  }
}

async function handleCheckoutSessionCompleted(session) {
  try {
    const organizationId = session.metadata?.organizationId;
    if (!organizationId) return;
    
    // The subscription should already be created by the subscription.created webhook
    // This is mainly for tracking successful checkouts
    
    await Organization.findByIdAndUpdate(organizationId, {
      'billing.lastCheckoutSession': session.id,
      'billing.lastCheckoutAt': new Date()
    });
    
    console.log(`Checkout session ${session.id} completed for organization ${organizationId}`);
  } catch (error) {
    console.error('Error handling checkout.session.completed:', error);
  }
}

module.exports = router;