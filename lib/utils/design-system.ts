// Design system utilities for consistent styling across the application

export const colors = {
  // Dark theme palette matching the tree interface and home page
  background: 'hsl(var(--background))', // Dark background
  foreground: 'hsl(var(--foreground))', // Light text
  card: 'hsl(var(--card))', // Card backgrounds
  cardForeground: 'hsl(var(--card-foreground))',
  muted: 'hsl(var(--muted))', // Muted backgrounds
  mutedForeground: 'hsl(var(--muted-foreground))', // Muted text
  border: 'hsl(var(--border))', // Border colors
  primary: 'hsl(var(--primary))', // Green primary color
  primaryForeground: 'hsl(var(--primary-foreground))',
  
  // Semantic colors
  success: 'rgb(34 197 94)', // green-500
  warning: 'rgb(234 179 8)', // yellow-500
  error: 'rgb(239 68 68)', // red-500
} as const

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  '2xl': '2rem',
  '3xl': '3rem',
} as const

export const borderRadius = {
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
} as const

export const typography = {
  fontMono: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Source Code Pro", "Menlo", "Consolas", monospace',
} as const

// Common component class combinations
export const componentClasses = {
  // Modal styles
  modalOverlay: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm',
  modalContainer: 'bg-card rounded-lg shadow-xl max-w-5xl w-full p-6 relative flex flex-col border border-border',
  modalHeader: 'text-xl font-semibold text-foreground mb-4',
  modalCloseButton: 'absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors',
  
  // Form styles
  input: 'flex-1 p-4 bg-muted/20 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-foreground placeholder-muted-foreground',
  button: 'px-4 py-2 rounded-lg transition-colors font-medium',
  buttonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed',
  buttonSecondary: 'bg-muted text-muted-foreground hover:bg-muted/80',
  buttonGhost: 'text-muted-foreground hover:text-foreground hover:bg-muted/20',
  
  // Card styles
  card: 'bg-card border border-border rounded-lg p-4',
  cardSelected: 'bg-card border border-primary',
  cardHover: 'hover:border-muted transition-colors cursor-pointer',
  
  // Text styles
  textPrimary: 'text-foreground',
  textSecondary: 'text-muted-foreground',
  textSmall: 'text-sm',
  textExtraSmall: 'text-xs',
  
  // Layout styles
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between',
  flexCol: 'flex flex-col',
  spacingMd: 'space-y-3',
  spacingLg: 'space-y-4',
} as const

// Import the existing cn utility from the main utils file
export { cn } from '@/lib/utils'