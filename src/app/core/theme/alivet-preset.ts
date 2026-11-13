import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const ALIVET_COLORS = {
  primary: '#083828',
  primaryHover: '#062E20',
  accent: '#087850',
  sage: '#E0F0E8',
  sage100: '#C9E6D8',
  sage200: '#A3D4BE',
  sage300: '#6FBB99',
  muted: '#406858',
  danger: '#DC2626',
} as const;

export const AlivetPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: ALIVET_COLORS.sage,
      100: ALIVET_COLORS.sage100,
      200: ALIVET_COLORS.sage200,
      300: ALIVET_COLORS.sage300,
      400: ALIVET_COLORS.accent,
      500: ALIVET_COLORS.primary,
      600: ALIVET_COLORS.primaryHover,
      700: '#042418',
      800: '#031A12',
      900: '#02140E',
      950: '#010C08',
    },
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '{primary.color}',
      offset: '2px',
      shadow: 'none',
    },
  },
  components: {
    button: {
      root: {
        borderRadius: '999px',
        label: {
          fontWeight: '600',
        },
      },
      outlined: {
        primary: {
          borderColor: '{primary.color}',
        },
      },
    },
    card: {
      root: {
        borderRadius: '1.25rem',
        shadow: '0 8px 24px rgba(8, 56, 40, 0.06)',
      },
    },
  },
});
