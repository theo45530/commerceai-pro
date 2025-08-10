import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  Fab,
  Badge,
  Tooltip,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  Send as SendIcon,
  Chat as ChatIcon,
  Close as CloseIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  Support as SupportIcon,
  Person as PersonIcon,
  SupportAgent as AgentIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const ChatSupport = ({ user, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [queueStatus, setQueueStatus] = useState(null);
  const [showSatisfactionDialog, setShowSatisfactionDialog] = useState(false);
  const [satisfaction, setSatisfaction] = useState({ rating: 0, feedback: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageInputRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (isOpen && user?.token) {
      const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:4000', {
        path: '/socket.io/chat',
        auth: {
          token: user.token
        },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('Connected to chat support');
        setIsConnected(true);
        setError(null);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from chat support');
        setIsConnected(false);
      });

      newSocket.on('error', (error) => {
        console.error('Chat error:', error);
        setError(error.message);
      });

      newSocket.on('session_joined', (data) => {
        setSession(data.session);
        setMessages(data.session.messages || []);
      });

      newSocket.on('new_message', (data) => {
        setMessages(prev => [...prev, data.message]);
      });

      newSocket.on('user_typing', (data) => {
        if (data.userType === 'agent') {
          setAgentTyping(true);
        }
      });

      newSocket.on('user_stopped_typing', (data) => {
        if (data.userType === 'agent') {
          setAgentTyping(false);
        }
      });

      newSocket.on('agent_assigned', (data) => {
        setSession(prev => ({ ...prev, agentId: data.agentId, status: 'active' }));
      });

      newSocket.on('session_ended', (data) => {
        setSession(prev => ({ ...prev, status: 'ended' }));
        setShowSatisfactionDialog(true);
      });

      newSocket.on('waiting_queue', (data) => {
        setQueueStatus(data);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isOpen, user?.token]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start new chat session
  const startChatSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat-support/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          subject: 'Support demandé',
          category: 'general',
          priority: 'medium'
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors du démarrage du chat');
      }

      const data = await response.json();
      setSession(data.session);
      setQueueStatus(data.queueStatus);
      
      // Join the chat session
      if (socket) {
        socket.emit('join_chat', { sessionId: data.session.sessionId });
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Send message
  const sendMessage = () => {
    if (!newMessage.trim() || !socket || !session) return;

    socket.emit('send_message', {
      sessionId: session.sessionId,
      content: newMessage.trim(),
      messageType: 'text'
    });

    setNewMessage('');
    stopTyping();
  };

  // Handle typing
  const handleTyping = () => {
    if (!socket || !session) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing_start', { sessionId: session.sessionId });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    if (isTyping && socket && session) {
      setIsTyping(false);
      socket.emit('typing_stop', { sessionId: session.sessionId });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  // End chat session
  const endChatSession = () => {
    if (socket && session) {
      socket.emit('end_session', { sessionId: session.sessionId });
    }
  };

  // Submit satisfaction rating
  const submitSatisfactionRating = async () => {
    try {
      await fetch(`/api/chat-support/sessions/${session.sessionId}/satisfaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(satisfaction)
      });
      setShowSatisfactionDialog(false);
    } catch (error) {
      console.error('Error submitting satisfaction rating:', error);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting': return 'warning';
      case 'active': return 'success';
      case 'ended': return 'default';
      default: return 'default';
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'waiting': return 'En attente';
      case 'active': return 'Actif';
      case 'ended': return 'Terminé';
      default: return status;
    }
  };

  // Render message
  const renderMessage = (message) => {
    const isOwnMessage = message.senderId === user.id;
    const isAgent = message.senderType === 'agent';
    const isSystem = message.senderType === 'system';

    if (isSystem) {
      return (
        <Box key={message._id} sx={{ textAlign: 'center', my: 1 }}>
          <Chip 
            label={message.content} 
            size="small" 
            variant="outlined" 
            color="info"
          />
        </Box>
      );
    }

    return (
      <Box
        key={message._id}
        sx={{
          display: 'flex',
          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
          mb: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-end', maxWidth: '70%' }}>
          {!isOwnMessage && (
            <Avatar sx={{ mr: 1, bgcolor: isAgent ? 'primary.main' : 'grey.500' }}>
              {isAgent ? <AgentIcon /> : <PersonIcon />}
            </Avatar>
          )}
          <Paper
            sx={{
              p: 1.5,
              bgcolor: isOwnMessage ? 'primary.main' : 'grey.100',
              color: isOwnMessage ? 'white' : 'text.primary',
              borderRadius: 2,
              borderBottomRightRadius: isOwnMessage ? 0 : 2,
              borderBottomLeftRadius: isOwnMessage ? 2 : 0
            }}
          >
            <Typography variant="body2">{message.content}</Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.7, 
                display: 'block', 
                mt: 0.5,
                fontSize: '0.7rem'
              }}
            >
              {formatDistanceToNow(new Date(message.createdAt), { 
                addSuffix: true, 
                locale: fr 
              })}
            </Typography>
          </Paper>
        </Box>
      </Box>
    );
  };

  if (!isOpen) {
    return (
      <Tooltip title="Support Chat">
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 20, right: 20 }}
          onClick={() => setIsOpen(true)}
        >
          <Badge badgeContent={session?.status === 'active' ? 1 : 0} color="success">
            <ChatIcon />
          </Badge>
        </Fab>
      </Tooltip>
    );
  }

  return (
    <>
      <Paper
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 400,
          height: 600,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1300
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            bgcolor: 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SupportIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Support Chat</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {session && (
              <Chip
                label={getStatusText(session.status)}
                color={getStatusColor(session.status)}
                size="small"
                sx={{ mr: 1 }}
              />
            )}
            <IconButton
              size="small"
              sx={{ color: 'white' }}
              onClick={() => setIsOpen(false)}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Connection status */}
        {!isConnected && (
          <Alert severity="warning" sx={{ m: 1 }}>
            Connexion en cours...
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ m: 1 }}>
            {error}
          </Alert>
        )}

        {/* Queue status */}
        {session?.status === 'waiting' && queueStatus && (
          <Alert severity="info" sx={{ m: 1 }}>
            Position dans la file: {queueStatus.queueLength} | 
            Agents disponibles: {queueStatus.availableAgents}
          </Alert>
        )}

        {/* Messages */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          {!session ? (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <SupportIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Besoin d'aide ?
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Démarrez une conversation avec notre équipe support
              </Typography>
              <Button
                variant="contained"
                onClick={startChatSession}
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={20} /> : <ChatIcon />}
              >
                {isLoading ? 'Connexion...' : 'Démarrer le chat'}
              </Button>
            </Box>
          ) : (
            <>
              <List sx={{ p: 0 }}>
                {messages.map(renderMessage)}
              </List>
              
              {agentTyping && (
                <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
                  <Avatar sx={{ mr: 1, bgcolor: 'primary.main' }}>
                    <AgentIcon />
                  </Avatar>
                  <Typography variant="body2" color="textSecondary">
                    L'agent est en train d'écrire...
                  </Typography>
                </Box>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </Box>

        {/* Input */}
        {session && session.status !== 'ended' && (
          <>
            <Divider />
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <TextField
                  ref={messageInputRef}
                  fullWidth
                  multiline
                  maxRows={3}
                  placeholder="Tapez votre message..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  variant="outlined"
                  size="small"
                  sx={{ mr: 1 }}
                />
                <IconButton
                  color="primary"
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                >
                  <SendIcon />
                </IconButton>
              </Box>
              
              {session.status === 'active' && (
                <Box sx={{ mt: 1, textAlign: 'center' }}>
                  <Button
                    size="small"
                    color="error"
                    onClick={endChatSession}
                  >
                    Terminer le chat
                  </Button>
                </Box>
              )}
            </Box>
          </>
        )}
      </Paper>

      {/* Satisfaction Dialog */}
      <Dialog open={showSatisfactionDialog} onClose={() => setShowSatisfactionDialog(false)}>
        <DialogTitle>Évaluez votre expérience</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Comment évalueriez-vous ce support ?
          </Typography>
          <Rating
            value={satisfaction.rating}
            onChange={(event, newValue) => {
              setSatisfaction(prev => ({ ...prev, rating: newValue }));
            }}
            size="large"
            sx={{ my: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Commentaires (optionnel)"
            value={satisfaction.feedback}
            onChange={(e) => {
              setSatisfaction(prev => ({ ...prev, feedback: e.target.value }));
            }}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSatisfactionDialog(false)}>
            Ignorer
          </Button>
          <Button 
            onClick={submitSatisfactionRating}
            variant="contained"
            disabled={satisfaction.rating === 0}
          >
            Envoyer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChatSupport;