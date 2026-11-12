import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const AlivetPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#E0F0E8',
      100: '#C9E6D8',
      200: '#A3D4BE',
      300: '#6FBB99',
      400: '#087850',
      500: '#083828',
      600: '#062E20',
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
