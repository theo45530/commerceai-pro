import { createTheme } from '@mui/material/styles';

// Palette de couleurs inspirée de Sintra.ai
const colors = {
  primary: {
    50: '#f3f4ff',
    100: '#e8eaff',
    200: '#d4d8ff',
    300: '#b8beff',
    400: '#9b9eff',
    500: '#7c7eff',
    600: '#6366f1',
    700: '#5b5bd6',
    800: '#4f46e5',
    900: '#4338ca',
    main: '#6366f1',
    dark: '#4338ca',
    light: '#9b9eff'
  },
  secondary: {
    50: '#fdf2ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef',
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
    main: '#8b5cf6',
    dark: '#7c3aed',
    light: '#a78bfa'
  },
  accent: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    main: '#22c55e'
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    main: '#f59e0b'
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    main: '#ef4444'
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717'
  }
};

// Gradients modernes
const gradients = {
  primary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
  secondary: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #c084fc 100%)',
  accent: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
  dark: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)',
  light: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
  aurora: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
  sunset: 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)',
  ocean: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%)',
  sintra: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
  card: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)'
};

// Shadows modernes avec effet de profondeur
const shadows = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  glow: '0 0 20px rgba(14, 165, 233, 0.3)',
  glowPurple: '0 0 20px rgba(217, 70, 239, 0.3)',
  glowGreen: '0 0 20px rgba(34, 197, 94, 0.3)'
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary.main,
      light: colors.primary.light,
      dark: colors.primary.dark,
      contrastText: '#ffffff'
    },
    secondary: {
      main: colors.secondary.main,
      light: colors.secondary.light,
      dark: colors.secondary.dark,
      contrastText: '#ffffff'
    },
    error: {
      main: colors.error.main,
      light: colors.error[400],
      dark: colors.error[700]
    },
    warning: {
      main: colors.warning.main,
      light: colors.warning[400],
      dark: colors.warning[700]
    },
    success: {
      main: colors.accent.main,
      light: colors.accent[400],
      dark: colors.accent[700]
    },
    background: {
      default: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      paper: 'rgba(255, 255, 255, 0.95)'
    },
    text: {
      primary: colors.neutral[900],
      secondary: colors.neutral[600]
    },
    divider: colors.neutral[200]
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '3.5rem',
      fontWeight: 800,
      lineHeight: 1.2,
      letterSpacing: '-0.02em'
    },
    h2: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.01em'
    },
    h3: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.4
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: colors.neutral[700]
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: colors.neutral[600]
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.025em'
    }
  },
  shape: {
    borderRadius: 12
  },
  shadows: [
    'none',
    shadows.xs,
    shadows.sm,
    shadows.md,
    shadows.lg,
    shadows.xl,
    shadows['2xl'],
    shadows.glow,
    shadows.glowPurple,
    shadows.glowGreen,
    shadows.inner,
    '0 4px 20px 0 rgba(0,0,0,0.12)',
    '0 8px 40px 0 rgba(0,0,0,0.12)',
    '0 16px 64px 0 rgba(0,0,0,0.12)',
    '0 24px 80px 0 rgba(0,0,0,0.12)',
    '0 32px 96px 0 rgba(0,0,0,0.12)',
    '0 40px 112px 0 rgba(0,0,0,0.12)',
    '0 48px 128px 0 rgba(0,0,0,0.12)',
    '0 56px 144px 0 rgba(0,0,0,0.12)',
    '0 64px 160px 0 rgba(0,0,0,0.12)',
    '0 72px 176px 0 rgba(0,0,0,0.12)',
    '0 80px 192px 0 rgba(0,0,0,0.12)',
    '0 88px 208px 0 rgba(0,0,0,0.12)',
    '0 96px 224px 0 rgba(0,0,0,0.12)',
    '0 104px 240px 0 rgba(0,0,0,0.12)'
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '12px 24px',
          fontSize: '0.95rem',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: shadows.sm,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: shadows.md
          }
        },
        contained: {
          background: gradients.primary,
          '&:hover': {
            background: gradients.primary,
            filter: 'brightness(1.1)'
          }
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: shadows.lg,
          border: `1px solid ${colors.neutral[100]}`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: shadows.xl
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: shadows.md
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: colors.neutral[50],
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: '#ffffff'
            },
            '&.Mui-focused': {
              backgroundColor: '#ffffff',
              boxShadow: shadows.glow
            }
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500
        }
      }
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          boxShadow: shadows.md
        }
      }
    }
  }
});

// Ajout des propriétés personnalisées
theme.palette.gradients = gradients;
theme.palette.colors = colors;
theme.shadows.custom = shadows;

export default theme;
export { colors, gradients, shadows };