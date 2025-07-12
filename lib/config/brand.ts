/**
 * Central brand configuration
 * This file contains all brand-related constants that should be used throughout the application
 */

export const BRAND = {
  // Main brand name used throughout the app
  name: 'actions.engineering',
  
  // Short brand name
  shortName: 'actions',
  
  // Full brand name for formal contexts
  fullName: 'actions.engineering Intelligence Unit',
  
  // MCP server name (what appears in Claude's MCP server list)
  mcpServerName: 'actions',
  
  // Brand name for technical contexts (e.g., server names, API references)
  technicalName: 'actions',
  
  // Legacy name (for backwards compatibility if needed)
  legacyName: 'done.engineering',
} as const;

// Type-safe brand name getter
export function getBrandName(): string {
  return BRAND.name;
}

// For contexts that need the full formal name
export function getFullBrandName(): string {
  return BRAND.fullName;
}