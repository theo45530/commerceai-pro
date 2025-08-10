const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const chatSupportService = require('../services/chatSupportService');
const permissionService = require('../services/permissionService');
const logger = require('../utils/logger');

class ChatSocketHandler {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      path: '/socket.io/chat'
    });

    this.connectedUsers = new Map(); // userId -> socketId
    this.connectedAgents = new Map(); // agentId -> socketId
    this.sessionSockets = new Map(); // sessionId -> [socketIds]

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user info (you might want to fetch from database)
        socket.userId = decoded.id;
        socket.organizationId = decoded.organizationId;
        socket.userType = decoded.role || 'user';
        
        // Check if user is a support agent
        const isAgent = await permissionService.hasAnyPermission(
          decoded.id,
          ['support.manage_chat', 'support.view_all_chats']
        );
        socket.isAgent = isAgent;
        
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`User connected: ${socket.userId} (Agent: ${socket.isAgent})`);
      
      // Register user/agent
      if (socket.isAgent) {
        this.connectedAgents.set(socket.userId, socket.id);
        chatSupportService.registerAgent(socket.userId, socket.id);
        socket.join('agents'); // Join agents room for broadcasts
      } else {
        this.connectedUsers.set(socket.userId, socket.id);
      }

      // Join user to their organization room
      socket.join(`org_${socket.organizationId}`);

      // Handle chat events
      this.handleChatEvents(socket);
      
      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  handleChatEvents(socket) {
    // Join chat session
    socket.on('join_chat', async (data) => {
      try {
        const { sessionId } = data;
        
        // Verify user has access to this session
        const session = await chatSupportService.getChatSession(sessionId, false);
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        const hasAccess = session.userId.toString() === socket.userId ||
                         session.agentId?.toString() === socket.userId ||
                         socket.isAgent;
        
        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Join session room
        socket.join(`chat_${sessionId}`);
        
        // Track session sockets
        if (!this.sessionSockets.has(sessionId)) {
          this.sessionSockets.set(sessionId, []);
        }
        this.sessionSockets.get(sessionId).push(socket.id);
        
        socket.currentSession = sessionId;
        
        // Notify others in the session
        socket.to(`chat_${sessionId}`).emit('user_joined', {
          userId: socket.userId,
          userType: socket.isAgent ? 'agent' : 'customer',
          timestamp: new Date()
        });
        
        // Send session info
        const fullSession = await chatSupportService.getChatSession(sessionId, true);
        socket.emit('session_joined', { session: fullSession });
        
        logger.info(`User ${socket.userId} joined chat session ${sessionId}`);
      } catch (error) {
        logger.error('Join chat error:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Leave chat session
    socket.on('leave_chat', (data) => {
      const { sessionId } = data;
      this.leaveSession(socket, sessionId);
    });

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { sessionId, content, messageType = 'text', attachments = [] } = data;
        
        if (!socket.currentSession || socket.currentSession !== sessionId) {
          socket.emit('error', { message: 'Not in this chat session' });
          return;
        }

        // Get session to determine sender type
        const session = await chatSupportService.getChatSession(sessionId, false);
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        let senderType = 'customer';
        if (session.agentId?.toString() === socket.userId) {
          senderType = 'agent';
        }

        // Add message to database
        const message = await chatSupportService.addMessage(
          sessionId,
          socket.userId,
          senderType,
          content,
          messageType,
          attachments
        );

        // Broadcast message to all users in the session
        this.io.to(`chat_${sessionId}`).emit('new_message', {
          message: {
            _id: message._id,
            sessionId: message.sessionId,
            senderId: message.senderId,
            senderType: message.senderType,
            content: message.content,
            messageType: message.messageType,
            attachments: message.attachments,
            createdAt: message.createdAt
          }
        });

        logger.info(`Message sent in session ${sessionId} by ${senderType}`);
      } catch (error) {
        logger.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing_start', (data) => {
      const { sessionId } = data;
      if (socket.currentSession === sessionId) {
        socket.to(`chat_${sessionId}`).emit('user_typing', {
          userId: socket.userId,
          userType: socket.isAgent ? 'agent' : 'customer'
        });
      }
    });

    socket.on('typing_stop', (data) => {
      const { sessionId } = data;
      if (socket.currentSession === sessionId) {
        socket.to(`chat_${sessionId}`).emit('user_stopped_typing', {
          userId: socket.userId,
          userType: socket.isAgent ? 'agent' : 'customer'
        });
      }
    });

    // Agent-specific events
    if (socket.isAgent) {
      // Agent status update
      socket.on('agent_status', (data) => {
        const { status } = data; // 'available', 'busy', 'away'
        const agentData = chatSupportService.activeAgents.get(socket.userId);
        if (agentData) {
          agentData.status = status;
          agentData.lastSeen = new Date();
        }
        
        // Broadcast to other agents
        socket.to('agents').emit('agent_status_update', {
          agentId: socket.userId,
          status,
          timestamp: new Date()
        });
      });

      // Get waiting queue
      socket.on('get_waiting_queue', () => {
        const queueStatus = chatSupportService.getWaitingQueueStatus();
        socket.emit('waiting_queue', queueStatus);
      });

      // Accept waiting session
      socket.on('accept_session', async (data) => {
        try {
          const { sessionId } = data;
          await chatSupportService.assignAgentToSession(sessionId, socket.userId);
          
          // Notify customer that agent joined
          this.io.to(`chat_${sessionId}`).emit('agent_assigned', {
            agentId: socket.userId,
            timestamp: new Date()
          });
          
          // Update queue status for all agents
          const queueStatus = chatSupportService.getWaitingQueueStatus();
          this.io.to('agents').emit('queue_updated', queueStatus);
          
        } catch (error) {
          logger.error('Accept session error:', error);
          socket.emit('error', { message: 'Failed to accept session' });
        }
      });
    }

    // End chat session
    socket.on('end_session', async (data) => {
      try {
        const { sessionId } = data;
        
        const session = await chatSupportService.getChatSession(sessionId, false);
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        // Check permissions
        const canEnd = session.userId.toString() === socket.userId ||
                      session.agentId?.toString() === socket.userId ||
                      socket.isAgent;
        
        if (!canEnd) {
          socket.emit('error', { message: 'Cannot end this session' });
          return;
        }

        await chatSupportService.endChatSession(sessionId, socket.userId);
        
        // Notify all users in the session
        this.io.to(`chat_${sessionId}`).emit('session_ended', {
          sessionId,
          endedBy: socket.userId,
          timestamp: new Date()
        });
        
        // Remove all users from session room
        const sessionSockets = this.sessionSockets.get(sessionId) || [];
        sessionSockets.forEach(socketId => {
          const userSocket = this.io.sockets.sockets.get(socketId);
          if (userSocket) {
            userSocket.leave(`chat_${sessionId}`);
            userSocket.currentSession = null;
          }
        });
        this.sessionSockets.delete(sessionId);
        
        logger.info(`Chat session ${sessionId} ended by ${socket.userId}`);
      } catch (error) {
        logger.error('End session error:', error);
        socket.emit('error', { message: 'Failed to end session' });
      }
    });
  }

  handleDisconnect(socket) {
    logger.info(`User disconnected: ${socket.userId}`);
    
    // Remove from connected users/agents
    if (socket.isAgent) {
      this.connectedAgents.delete(socket.userId);
      chatSupportService.unregisterAgent(socket.userId);
      
      // Notify other agents
      socket.to('agents').emit('agent_disconnected', {
        agentId: socket.userId,
        timestamp: new Date()
      });
    } else {
      this.connectedUsers.delete(socket.userId);
    }

    // Leave current session if any
    if (socket.currentSession) {
      this.leaveSession(socket, socket.currentSession);
    }

    // Remove from all session sockets
    for (const [sessionId, sockets] of this.sessionSockets) {
      const index = sockets.indexOf(socket.id);
      if (index > -1) {
        sockets.splice(index, 1);
        if (sockets.length === 0) {
          this.sessionSockets.delete(sessionId);
        }
      }
    }
  }

  leaveSession(socket, sessionId) {
    socket.leave(`chat_${sessionId}`);
    socket.currentSession = null;
    
    // Remove from session sockets
    const sessionSockets = this.sessionSockets.get(sessionId);
    if (sessionSockets) {
      const index = sessionSockets.indexOf(socket.id);
      if (index > -1) {
        sessionSockets.splice(index, 1);
        if (sessionSockets.length === 0) {
          this.sessionSockets.delete(sessionId);
        }
      }
    }
    
    // Notify others in the session
    socket.to(`chat_${sessionId}`).emit('user_left', {
      userId: socket.userId,
      userType: socket.isAgent ? 'agent' : 'customer',
      timestamp: new Date()
    });
    
    logger.info(`User ${socket.userId} left chat session ${sessionId}`);
  }

  // Broadcast to specific session
  broadcastToSession(sessionId, event, data) {
    this.io.to(`chat_${sessionId}`).emit(event, data);
  }

  // Broadcast to all agents
  broadcastToAgents(event, data) {
    this.io.to('agents').emit(event, data);
  }

  // Send to specific user
  sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId) || this.connectedAgents.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  // Get connected users count
  getConnectedUsersCount() {
    return {
      totalUsers: this.connectedUsers.size,
      totalAgents: this.connectedAgents.size,
      activeSessions: this.sessionSockets.size
    };
  }
}

module.exports = ChatSocketHandler;