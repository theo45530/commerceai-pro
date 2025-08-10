const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const { auth, requireOrganization, requireOwner, authorize } = require('../middleware/auth');

// Get organization details
router.get('/', auth, requireOrganization, async (req, res) => {
  try {
    const organization = await Organization.findById(req.organization._id)
      .populate('owner', 'firstName lastName email')
      .populate('subscription');

    res.json({ organization });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update organization details
router.put('/', [
  auth,
  requireOwner,
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Organization name must not be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
  body('website').optional().isURL().withMessage('Please provide a valid website URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      email,
      phone,
      website,
      description,
      industry,
      size,
      address,
      logo,
      settings
    } = req.body;

    const organization = await Organization.findById(req.organization._id);

    // Update basic information
    if (name) organization.name = name;
    if (email) organization.email = email;
    if (phone) organization.phone = phone;
    if (website) organization.website = website;
    if (description) organization.description = description;
    if (industry) organization.industry = industry;
    if (size) organization.size = size;
    if (logo) organization.logo = logo;

    // Update address
    if (address) {
      organization.address = { ...organization.address, ...address };
    }

    // Update settings
    if (settings) {
      organization.settings = {
        ...organization.settings,
        ...settings,
        // Merge nested objects
        general: { ...organization.settings.general, ...settings.general },
        security: { ...organization.settings.security, ...settings.security },
        features: { ...organization.settings.features, ...settings.features },
        aiAgents: { ...organization.settings.aiAgents, ...settings.aiAgents },
        notifications: { ...organization.settings.notifications, ...settings.notifications }
      };
    }

    await organization.save();

    res.json({
      message: 'Organization updated successfully',
      organization
    });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get organization members
router.get('/members', auth, requireOrganization, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status } = req.query;

    const filter = { organization: req.organization._id };
    if (role) filter.role = role;
    if (status) filter.status = status;

    const members = await User.find(filter)
      .select('-password -emailVerificationToken -passwordResetToken')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      members,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Invite user to organization
router.post('/invite', [
  auth,
  authorize('owner', 'admin'),
  requireOrganization,
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('role').isIn(['admin', 'member']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, role, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.organization?.toString() === req.organization._id.toString()) {
        return res.status(400).json({ error: 'User is already a member of this organization' });
      }
      return res.status(400).json({ error: 'User already exists with a different organization' });
    }

    // Check subscription limits
    const subscription = await Subscription.findOne({
      organization: req.organization._id,
      status: { $in: ['active', 'trialing'] }
    });

    if (subscription) {
      const currentMemberCount = await User.countDocuments({ organization: req.organization._id });
      if (!subscription.canUseFeature('users', 1)) {
        return res.status(403).json({ error: 'User limit reached for current subscription plan' });
      }
    }

    // Generate invitation token
    const invitationToken = require('crypto').randomBytes(32).toString('hex');

    // Create pending user
    const user = new User({
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      role,
      organization: req.organization._id,
      status: 'pending',
      emailVerificationToken: invitationToken,
      invitedBy: req.user.id,
      invitedAt: new Date()
    });

    await user.save();

    // Send invitation email
    const invitationUrl = `${process.env.FRONTEND_URL}/accept-invitation?token=${invitationToken}`;
    // TODO: Implement email sending
    console.log(`Invitation email would be sent to ${email}: ${invitationUrl}`);

    res.status(201).json({
      message: 'Invitation sent successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept invitation
router.post('/accept-invitation', [
  body('token').notEmpty().withMessage('Invitation token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password, firstName, lastName } = req.body;

    // Find user with invitation token
    const user = await User.findOne({
      emailVerificationToken: token,
      status: 'pending'
    }).populate('organization');

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired invitation token' });
    }

    // Update user details
    user.password = password;
    user.firstName = firstName;
    user.lastName = lastName;
    user.status = 'active';
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerifiedAt = new Date();
    user.onboarding = {
      currentStep: 'completed',
      completedSteps: ['profile', 'organization']
    };

    await user.save();

    // Generate token
    const jwt = require('jsonwebtoken');
    const authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    res.json({
      message: 'Invitation accepted successfully',
      token: authToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organization: {
          id: user.organization._id,
          name: user.organization.name,
          subscriptionStatus: user.organization.subscriptionStatus
        }
      }
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update member role
router.put('/members/:memberId/role', [
  auth,
  authorize('owner', 'admin'),
  requireOrganization,
  body('role').isIn(['admin', 'member']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { memberId } = req.params;
    const { role } = req.body;

    // Find member
    const member = await User.findOne({
      _id: memberId,
      organization: req.organization._id
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Prevent changing owner role
    if (member.role === 'owner') {
      return res.status(403).json({ error: 'Cannot change owner role' });
    }

    // Only owner can promote to admin
    if (role === 'admin' && req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Only owner can promote members to admin' });
    }

    member.role = role;
    await member.save();

    res.json({
      message: 'Member role updated successfully',
      member: {
        id: member._id,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        role: member.role
      }
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove member from organization
router.delete('/members/:memberId', [
  auth,
  authorize('owner', 'admin'),
  requireOrganization
], async (req, res) => {
  try {
    const { memberId } = req.params;

    // Find member
    const member = await User.findOne({
      _id: memberId,
      organization: req.organization._id
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Prevent removing owner
    if (member.role === 'owner') {
      return res.status(403).json({ error: 'Cannot remove organization owner' });
    }

    // Only owner can remove admins
    if (member.role === 'admin' && req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Only owner can remove admin members' });
    }

    // Remove member
    await User.findByIdAndDelete(memberId);

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get organization usage statistics
router.get('/usage', auth, requireOrganization, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      organization: req.organization._id,
      status: { $in: ['active', 'trialing'] }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const memberCount = await User.countDocuments({ organization: req.organization._id });

    res.json({
      usage: subscription.usage,
      limits: subscription.limits,
      memberCount,
      usagePercentages: {
        users: Math.round((memberCount / subscription.limits.users) * 100),
        aiRequests: subscription.getUsagePercentage('aiRequests'),
        storageGb: subscription.getUsagePercentage('storageGb'),
        apiCalls: subscription.getUsagePercentage('apiCalls')
      },
      subscription: {
        planId: subscription.planId,
        planName: subscription.planName,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd
      }
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Transfer organization ownership
router.post('/transfer-ownership', [
  auth,
  requireOwner,
  body('newOwnerId').isMongoId().withMessage('Invalid user ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { newOwnerId } = req.body;

    // Find new owner
    const newOwner = await User.findOne({
      _id: newOwnerId,
      organization: req.organization._id,
      status: 'active'
    });

    if (!newOwner) {
      return res.status(404).json({ error: 'New owner must be an active member of the organization' });
    }

    // Update organization owner
    req.organization.owner = newOwnerId;
    await req.organization.save();

    // Update user roles
    await User.findByIdAndUpdate(req.user.id, { role: 'admin' });
    await User.findByIdAndUpdate(newOwnerId, { role: 'owner' });

    res.json({ message: 'Ownership transferred successfully' });
  } catch (error) {
    console.error('Transfer ownership error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete organization
router.delete('/', auth, requireOwner, async (req, res) => {
  try {
    // Check if there are other members
    const memberCount = await User.countDocuments({ 
      organization: req.organization._id,
      _id: { $ne: req.user.id }
    });

    if (memberCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete organization with existing members. Please remove all members first.' 
      });
    }

    // Cancel subscription if active
    const subscription = await Subscription.findOne({
      organization: req.organization._id,
      status: { $in: ['active', 'trialing'] }
    });

    if (subscription && subscription.stripeSubscriptionId) {
      const stripeService = require('../services/stripeService');
      await stripeService.cancelSubscription(subscription.stripeSubscriptionId);
    }

    // Delete organization and related data
    await Organization.findByIdAndDelete(req.organization._id);
    await User.findByIdAndDelete(req.user.id);
    await Subscription.deleteMany({ organization: req.organization._id });

    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;