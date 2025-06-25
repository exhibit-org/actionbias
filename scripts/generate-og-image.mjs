#!/usr/bin/env node

/**
 * Script to generate Open Graph images for ActionBias
 * 
 * To create the actual image:
 * 1. Use a design tool like Figma, Canva, or Photoshop
 * 2. Create a 1200x630px image
 * 3. Include:
 *    - ActionBias branding
 *    - "Dream like a human. Execute like a machine." tagline
 *    - Visual representation of the concept (e.g., organic shapes transforming to precise grids)
 *    - Brand colors: Blue (#3B82F6), Gray (#111827), Light backgrounds
 * 4. Export as PNG
 * 5. Optimize with tools like TinyPNG
 * 6. Replace app/opengraph-image.png
 * 
 * For dynamic Open Graph images per changelog item:
 * - Consider using @vercel/og or similar libraries
 * - Generate images on-demand with action titles and descriptions
 */

console.log(`
📸 Open Graph Image Guidelines for ActionBias
============================================

Dimensions: 1200x630px
Format: PNG
File location: app/opengraph-image.png

Design suggestions:
- Use the "Dream like a human. Execute like a machine." tagline
- Include visual metaphor for transformation (organic → precise)
- Keep text readable at small sizes
- Use brand colors: #3B82F6 (blue), #111827 (dark gray)
- Consider adding a subtle pattern or gradient background

For dynamic images per changelog item, consider:
- Using @vercel/og for server-side generation
- Including action title and impact story
- Adding completion date and author info
- Using consistent branding elements
`);