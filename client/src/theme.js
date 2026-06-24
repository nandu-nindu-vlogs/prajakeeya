import { createTheme, alpha } from '@mui/material/styles';

export const NAVY = '#0D1B2A';
export const TEAL = '#0891B2';
export const GOLD = '#F59E0B';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: NAVY, light: '#1E3A5F', dark: '#060D14', contrastText: '#FFFFFF' },
    secondary: { main: GOLD, light: '#FCD34D', dark: '#B45309', contrastText: NAVY },
    info: { main: TEAL, contrastText: '#FFFFFF' },
    success: { main: '#10B981', contrastText: '#FFFFFF' },
    error: { main: '#EF4444', contrastText: '#FFFFFF' },
    warning: { main: '#F59E0B', contrastText: NAVY },
    background: { default: '#F1F5F9', paper: '#FFFFFF' },
    text: { primary: '#0F172A', secondary: '#64748B' },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", system-ui, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.025em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.015em' },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em' },
    caption: { color: '#64748B' },
  },
  shape: { borderRadius: 12 },
  shadows: [
    'none',
    '0 1px 2px rgba(15,23,42,0.04)',
    '0 2px 4px rgba(15,23,42,0.06)',
    '0 4px 8px rgba(15,23,42,0.07)',
    '0 8px 16px rgba(15,23,42,0.08)',
    '0 12px 24px rgba(15,23,42,0.09)',
    '0 16px 32px rgba(15,23,42,0.10)',
    '0 20px 40px rgba(15,23,42,0.11)',
    '0 24px 48px rgba(15,23,42,0.12)',
    '0 28px 56px rgba(15,23,42,0.13)',
    '0 32px 64px rgba(15,23,42,0.14)',
    '0 36px 72px rgba(15,23,42,0.15)',
    '0 40px 80px rgba(15,23,42,0.16)',
    '0 44px 88px rgba(15,23,42,0.17)',
    '0 48px 96px rgba(15,23,42,0.18)',
    '0 52px 104px rgba(15,23,42,0.19)',
    '0 56px 112px rgba(15,23,42,0.20)',
    '0 60px 120px rgba(15,23,42,0.21)',
    '0 64px 128px rgba(15,23,42,0.22)',
    '0 68px 136px rgba(15,23,42,0.23)',
    '0 72px 144px rgba(15,23,42,0.24)',
    '0 76px 152px rgba(15,23,42,0.25)',
    '0 80px 160px rgba(15,23,42,0.26)',
    '0 84px 168px rgba(15,23,42,0.27)',
    '0 88px 176px rgba(15,23,42,0.28)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, paddingTop: 10, paddingBottom: 10, fontSize: 14 },
        containedPrimary: {
          background: `linear-gradient(135deg, #1E3A5F 0%, ${NAVY} 100%)`,
          '&:hover': { background: `linear-gradient(135deg, #2a4f7c 0%, #142236 100%)` },
        },
        containedSecondary: {
          background: `linear-gradient(135deg, #FBBF24 0%, ${GOLD} 100%)`,
          '&:hover': { background: `linear-gradient(135deg, #FCD34D 0%, #D97706 100%)` },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.06)',
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, borderRadius: 6 } },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        rounded: { borderRadius: 16 },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#F8FAFC',
            fontWeight: 700,
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#64748B',
            borderBottom: '2px solid #E2E8F0',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: '1px solid #F1F5F9', fontSize: 14 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, height: 6 },
        bar: { borderRadius: 4 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { borderRadius: '8px !important' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
});
