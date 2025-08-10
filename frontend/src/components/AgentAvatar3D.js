import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const AgentAvatar3D = ({ 
  type = 'default', 
  size = 'md', 
  animated = true, 
  className = '',
  onClick = null 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Configuration des avatars par type d'agent
  const avatarConfig = {
    'publicite': {
      emoji: '📢',
      gradient: 'from-orange-400 to-red-500',
      glowColor: 'shadow-orange-500/50',
      name: 'Agent Publicité',
      bgPattern: '🎯📊💰'
    },
    'sav': {
      emoji: '🎧',
      gradient: 'from-blue-400 to-cyan-500',
      glowColor: 'shadow-blue-500/50',
      name: 'Agent SAV',
      bgPattern: '💬🔧✨'
    },
    'analyse': {
      emoji: '📊',
      gradient: 'from-purple-400 to-pink-500',
      glowColor: 'shadow-purple-500/50',
      name: 'Agent Analyse',
      bgPattern: '📈🔍💡'
    },
    'email': {
      emoji: '📧',
      gradient: 'from-green-400 to-emerald-500',
      glowColor: 'shadow-green-500/50',
      name: 'Agent Email',
      bgPattern: '✉️📮🚀'
    },
    'pages': {
      emoji: '🎨',
      gradient: 'from-indigo-400 to-purple-500',
      glowColor: 'shadow-indigo-500/50',
      name: 'Agent Pages',
      bgPattern: '🎨🖼️✨'
    },
    'contenu': {
      emoji: '✍️',
      gradient: 'from-yellow-400 to-orange-500',
      glowColor: 'shadow-yellow-500/50',
      name: 'Agent Contenu',
      bgPattern: '✍️📝💫'
    },
    'default': {
      emoji: '🤖',
      gradient: 'from-gray-400 to-gray-600',
      glowColor: 'shadow-gray-500/50',
      name: 'Agent IA',
      bgPattern: '🤖⚡🌟'
    }
  };

  // Configuration des tailles
  const sizeConfig = {
    'xs': { container: 'w-12 h-12', emoji: 'text-lg', pattern: 'text-xs' },
    'sm': { container: 'w-16 h-16', emoji: 'text-xl', pattern: 'text-sm' },
    'md': { container: 'w-24 h-24', emoji: 'text-3xl', pattern: 'text-base' },
    'lg': { container: 'w-32 h-32', emoji: 'text-4xl', pattern: 'text-lg' },
    'xl': { container: 'w-40 h-40', emoji: 'text-5xl', pattern: 'text-xl' }
  };

  const config = avatarConfig[type] || avatarConfig.default;
  const sizes = sizeConfig[size] || sizeConfig.md;

  useEffect(() => {
    // Simuler le chargement de l'avatar
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const containerVariants = {
    initial: { 
      scale: 0,
      rotate: -180,
      opacity: 0
    },
    animate: { 
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
        duration: 0.6
      }
    },
    hover: {
      scale: 1.1,
      rotate: [0, -5, 5, 0],
      transition: {
        rotate: {
          duration: 0.5,
          ease: "easeInOut"
        },
        scale: {
          duration: 0.2
        }
      }
    },
    tap: {
      scale: 0.95,
      transition: { duration: 0.1 }
    }
  };

  const emojiVariants = {
    initial: { scale: 0 },
    animate: { 
      scale: 1,
      transition: { delay: 0.2, type: "spring", stiffness: 300 }
    },
    hover: {
      scale: 1.2,
      rotate: [0, -10, 10, 0],
      transition: {
        duration: 0.4,
        ease: "easeInOut"
      }
    }
  };

  const patternVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 20,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  const glowVariants = {
    animate: {
      opacity: [0.5, 1, 0.5],
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div
      className={`relative ${sizes.container} ${className}`}
      variants={containerVariants}
      initial="initial"
      animate={isLoaded ? "animate" : "initial"}
      whileHover={animated ? "hover" : {}}
      whileTap={animated && onClick ? "tap" : {}}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Glow effect */}
      {animated && (
        <motion.div
          className={`absolute inset-0 rounded-full bg-gradient-to-r ${config.gradient} opacity-20 blur-md ${config.glowColor}`}
          variants={glowVariants}
          animate="animate"
        />
      )}
      
      {/* Background pattern */}
      <motion.div
        className={`absolute inset-0 rounded-full overflow-hidden opacity-10`}
        variants={patternVariants}
        animate={animated ? "animate" : {}}
      >
        <div className={`absolute inset-0 flex items-center justify-center ${sizes.pattern} opacity-30`}>
          {config.bgPattern.split('').map((char, index) => (
            <span
              key={index}
              className="absolute"
              style={{
                transform: `rotate(${index * 120}deg) translateY(-${sizes.container.includes('12') ? '20' : sizes.container.includes('16') ? '28' : sizes.container.includes('24') ? '40' : sizes.container.includes('32') ? '52' : '64'}px)`,
                transformOrigin: 'center'
              }}
            >
              {char}
            </span>
          ))}
        </div>
      </motion.div>
      
      {/* Main avatar container */}
      <motion.div
        className={`relative w-full h-full rounded-full bg-gradient-to-br ${config.gradient} p-1 shadow-2xl ${config.glowColor}`}
      >
        {/* Inner glass effect */}
        <div className="w-full h-full rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center overflow-hidden">
          {/* Main emoji */}
          <motion.div
            className={`${sizes.emoji} filter drop-shadow-lg`}
            variants={emojiVariants}
            initial="initial"
            animate={isLoaded ? "animate" : "initial"}
            whileHover={animated ? "hover" : {}}
          >
            {config.emoji}
          </motion.div>
          
          {/* Floating particles */}
          {animated && isHovered && (
            <>
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full"
                  initial={{ 
                    opacity: 0, 
                    scale: 0,
                    x: 0,
                    y: 0
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: [0, (Math.random() - 0.5) * 40],
                    y: [0, (Math.random() - 0.5) * 40],
                  }}
                  transition={{
                    duration: 1,
                    delay: i * 0.2,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                />
              ))}
            </>
          )}
        </div>
        
        {/* Status indicator */}
        <motion.div
          className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-lg"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
        >
          <motion.div
            className="w-full h-full bg-green-400 rounded-full"
            animate={{
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      </motion.div>
      
      {/* Tooltip */}
      {isHovered && (
        <motion.div
          className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap z-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
        >
          {config.name}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/80" />
        </motion.div>
      )}
    </motion.div>
  );
};

export default AgentAvatar3D;