const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  // Basic Information
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // References
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },
  
  // Stripe Information
  stripeInvoiceId: {
    type: String,
    unique: true,
    sparse: true
  },
  stripeCustomerId: {
    type: String,
    required: true
  },
  stripePaymentIntentId: {
    type: String,
    default: null
  },
  
  // Invoice Details
  status: {
    type: String,
    enum: [
      'draft',
      'open',
      'paid',
      'void',
      'uncollectible',
      'payment_failed'
    ],
    required: true,
    default: 'draft'
  },
  
  // Amounts (in cents)
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  amountDue: {
    type: Number,
    required: true
  },
  
  // Currency
  currency: {
    type: String,
    required: true,
    default: 'eur',
    enum: ['eur', 'usd', 'gbp', 'cad', 'aud']
  },
  
  // Dates
  issueDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidAt: {
    type: Date,
    default: null
  },
  voidedAt: {
    type: Date,
    default: null
  },
  
  // Billing Period
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  
  // Line Items
  lineItems: [{
    description: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      default: 1
    },
    unitPrice: {
      type: Number,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['subscription', 'usage', 'one_time', 'discount', 'tax'],
      required: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  
  // Tax Information
  taxDetails: {
    rate: {
      type: Number,
      default: 0
    },
    type: {
      type: String,
      enum: ['vat', 'gst', 'sales_tax', 'none'],
      default: 'none'
    },
    taxId: {
      type: String,
      default: null
    },
    jurisdiction: {
      type: String,
      default: null
    }
  },
  
  // Discount Information
  discountDetails: {
    couponId: {
      type: String,
      default: null
    },
    couponName: {
      type: String,
      default: null
    },
    percentOff: {
      type: Number,
      default: null
    },
    amountOff: {
      type: Number,
      default: null
    }
  },
  
  // Customer Information (snapshot at time of invoice)
  customer: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    taxId: {
      type: String,
      default: null
    }
  },
  
  // Payment Information
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'sepa_debit', 'bank_transfer', 'paypal'],
      default: null
    },
    last4: {
      type: String,
      default: null
    },
    brand: {
      type: String,
      default: null
    }
  },
  
  // Payment Attempts
  paymentAttempts: [{
    attemptedAt: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['succeeded', 'failed', 'pending'],
      required: true
    },
    failureReason: {
      type: String,
      default: null
    },
    amount: {
      type: Number,
      required: true
    },
    paymentMethodId: {
      type: String,
      default: null
    }
  }],
  
  // Notifications
  notifications: {
    sent: [{
      type: {
        type: String,
        enum: ['invoice_created', 'payment_due', 'payment_failed', 'payment_succeeded'],
        required: true
      },
      sentAt: {
        type: Date,
        required: true
      },
      recipient: {
        type: String,
        required: true
      },
      method: {
        type: String,
        enum: ['email', 'webhook'],
        required: true
      }
    }],
    nextReminder: {
      type: Date,
      default: null
    }
  },
  
  // Files
  pdfUrl: {
    type: String,
    default: null
  },
  hostedInvoiceUrl: {
    type: String,
    default: null
  },
  
  // Notes
  notes: {
    type: String,
    default: null
  },
  internalNotes: {
    type: String,
    default: null
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ organizationId: 1 });
invoiceSchema.index({ subscriptionId: 1 });
invoiceSchema.index({ stripeInvoiceId: 1 });
invoiceSchema.index({ stripeCustomerId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ issueDate: 1 });
invoiceSchema.index({ 'customer.email': 1 });

// Virtual for overdue status
invoiceSchema.virtual('isOverdue').get(function() {
  return this.status === 'open' && this.dueDate < new Date();
});

// Virtual for days overdue
invoiceSchema.virtual('daysOverdue').get(function() {
  if (!this.isOverdue) return 0;
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = now - due;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for formatted amounts
invoiceSchema.virtual('formattedAmounts').get(function() {
  const formatAmount = (amount) => {
    const value = amount / 100;
    const symbol = this.currency === 'eur' ? '€' : 
                   this.currency === 'usd' ? '$' : 
                   this.currency === 'gbp' ? '£' : 
                   this.currency.toUpperCase();
    return `${symbol}${value.toFixed(2)}`;
  };
  
  return {
    subtotal: formatAmount(this.subtotal),
    tax: formatAmount(this.tax),
    discount: formatAmount(this.discount),
    total: formatAmount(this.total),
    amountPaid: formatAmount(this.amountPaid),
    amountDue: formatAmount(this.amountDue)
  };
});

// Pre-save middleware to generate invoice number
invoiceSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Find the last invoice for this month
    const lastInvoice = await this.constructor.findOne({
      invoiceNumber: new RegExp(`^INV-${year}${month}-`)
    }).sort({ invoiceNumber: -1 });
    
    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    this.invoiceNumber = `INV-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }
  
  // Calculate total
  if (this.isModified('subtotal') || this.isModified('tax') || this.isModified('discount')) {
    this.total = this.subtotal + this.tax - this.discount;
    this.amountDue = this.total - this.amountPaid;
  }
  
  next();
});

// Method to add line item
invoiceSchema.methods.addLineItem = function(item) {
  this.lineItems.push(item);
  this.subtotal = this.lineItems.reduce((sum, item) => sum + item.amount, 0);
  this.total = this.subtotal + this.tax - this.discount;
  this.amountDue = this.total - this.amountPaid;
  return this.save();
};

// Method to mark as paid
invoiceSchema.methods.markAsPaid = function(paymentDetails = {}) {
  this.status = 'paid';
  this.paidAt = new Date();
  this.amountPaid = this.total;
  this.amountDue = 0;
  
  if (paymentDetails.paymentMethodId) {
    this.paymentAttempts.push({
      attemptedAt: new Date(),
      status: 'succeeded',
      amount: this.total,
      paymentMethodId: paymentDetails.paymentMethodId
    });
  }
  
  return this.save();
};

// Method to mark payment as failed
invoiceSchema.methods.markPaymentFailed = function(reason) {
  this.status = 'payment_failed';
  
  this.paymentAttempts.push({
    attemptedAt: new Date(),
    status: 'failed',
    failureReason: reason,
    amount: this.amountDue
  });
  
  return this.save();
};

// Method to void invoice
invoiceSchema.methods.voidInvoice = function(reason) {
  this.status = 'void';
  this.voidedAt = new Date();
  this.amountDue = 0;
  this.internalNotes = (this.internalNotes || '') + `\nVoided: ${reason}`;
  return this.save();
};

// Method to send notification
invoiceSchema.methods.sendNotification = function(type, recipient, method = 'email') {
  this.notifications.sent.push({
    type,
    sentAt: new Date(),
    recipient,
    method
  });
  
  // Set next reminder based on type
  if (type === 'invoice_created') {
    const reminderDate = new Date(this.dueDate);
    reminderDate.setDate(reminderDate.getDate() - 3); // 3 days before due
    this.notifications.nextReminder = reminderDate;
  } else if (type === 'payment_due') {
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 7); // 7 days later
    this.notifications.nextReminder = reminderDate;
  }
  
  return this.save();
};

// Static method to get overdue invoices
invoiceSchema.statics.getOverdueInvoices = function() {
  return this.find({
    status: 'open',
    dueDate: { $lt: new Date() }
  }).populate('organizationId subscriptionId');
};

// Static method to get invoices due soon
invoiceSchema.statics.getInvoicesDueSoon = function(days = 3) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: 'open',
    dueDate: { 
      $gte: new Date(),
      $lte: futureDate
    }
  }).populate('organizationId subscriptionId');
};

module.exports = mongoose.model('Invoice', invoiceSchema);