import { describe, it, expect } from '@jest/globals';

// UUID validation function (this could be extracted to a utility)
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Function to generate a UUID (simplified for testing)
function generateUUID(): string {
  return crypto.randomUUID();
}

describe('UUID Utilities', () => {
  describe('isValidUUID', () => {
    it('should validate correct UUID format', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
        'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF'
      ];

      validUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        'invalid-uuid',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-426614174000-extra',
        'gggggggg-gggg-gggg-gggg-gggggggggggg',
        '123e4567_e89b_12d3_a456_426614174000',
        '123e4567-e89b-12d3-a456-42661417400',
        '',
        '123e4567-e89b-12d3-a456-4266141740000'
      ];

      invalidUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });

    it('should handle null and undefined', () => {
      expect(isValidUUID(null as any)).toBe(false);
      expect(isValidUUID(undefined as any)).toBe(false);
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUIDs', () => {
      for (let i = 0; i < 10; i++) {
        const uuid = generateUUID();
        expect(isValidUUID(uuid)).toBe(true);
      }
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID());
      }
      expect(uuids.size).toBe(100);
    });

    it('should follow UUID v4 format', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });
});