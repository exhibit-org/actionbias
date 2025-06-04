import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

// Define the schemas used in API routes
const createActionSchema = z.object({
  title: z.string().min(1),
  parent_id: z.string().uuid().optional(),
  depends_on_ids: z.array(z.string().uuid()).optional(),
});

const listActionsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const addChildActionSchema = z.object({
  title: z.string().min(1),
  parent_id: z.string().uuid(),
});

const addDependencySchema = z.object({
  action_id: z.string().uuid(),
  depends_on_id: z.string().uuid(),
});

const deleteActionSchema = z.object({
  child_handling: z.enum(["delete_recursive", "orphan", "reparent"]).default("orphan"),
  new_parent_id: z.string().uuid().optional(),
});

describe('API Schema Validation', () => {
  describe('createActionSchema', () => {
    it('should validate simple action creation', () => {
      const data = { title: 'Test Action' };
      const result = createActionSchema.parse(data);
      
      expect(result.title).toBe('Test Action');
      expect(result.parent_id).toBeUndefined();
      expect(result.depends_on_ids).toBeUndefined();
    });

    it('should validate action with parent', () => {
      const data = {
        title: 'Child Action',
        parent_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      const result = createActionSchema.parse(data);
      
      expect(result.title).toBe('Child Action');
      expect(result.parent_id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should validate action with dependencies', () => {
      const data = {
        title: 'Action with Dependencies',
        depends_on_ids: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001'
        ]
      };
      const result = createActionSchema.parse(data);
      
      expect(result.title).toBe('Action with Dependencies');
      expect(result.depends_on_ids).toHaveLength(2);
    });

    it('should reject empty title', () => {
      const data = { title: '' };
      
      expect(() => createActionSchema.parse(data)).toThrow();
    });

    it('should reject missing title', () => {
      const data = {};
      
      expect(() => createActionSchema.parse(data)).toThrow();
    });

    it('should reject invalid parent_id format', () => {
      const data = {
        title: 'Test Action',
        parent_id: 'invalid-uuid'
      };
      
      expect(() => createActionSchema.parse(data)).toThrow();
    });

    it('should reject invalid depends_on_ids format', () => {
      const data = {
        title: 'Test Action',
        depends_on_ids: ['invalid-uuid']
      };
      
      expect(() => createActionSchema.parse(data)).toThrow();
    });
  });

  describe('listActionsSchema', () => {
    it('should apply default values', () => {
      const data = {};
      const result = listActionsSchema.parse(data);
      
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should validate custom limit and offset', () => {
      const data = { limit: '10', offset: '5' };
      const result = listActionsSchema.parse(data);
      
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(5);
    });

    it('should reject limit too small', () => {
      const data = { limit: '0' };
      
      expect(() => listActionsSchema.parse(data)).toThrow();
    });

    it('should reject limit too large', () => {
      const data = { limit: '101' };
      
      expect(() => listActionsSchema.parse(data)).toThrow();
    });

    it('should reject negative offset', () => {
      const data = { offset: '-1' };
      
      expect(() => listActionsSchema.parse(data)).toThrow();
    });

    it('should coerce string numbers', () => {
      const data = { limit: '15', offset: '10' };
      const result = listActionsSchema.parse(data);
      
      expect(result.limit).toBe(15);
      expect(result.offset).toBe(10);
    });
  });

  describe('addChildActionSchema', () => {
    it('should validate child action creation', () => {
      const data = {
        title: 'Child Action',
        parent_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      const result = addChildActionSchema.parse(data);
      
      expect(result.title).toBe('Child Action');
      expect(result.parent_id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should reject missing title', () => {
      const data = { parent_id: '123e4567-e89b-12d3-a456-426614174000' };
      
      expect(() => addChildActionSchema.parse(data)).toThrow();
    });

    it('should reject missing parent_id', () => {
      const data = { title: 'Child Action' };
      
      expect(() => addChildActionSchema.parse(data)).toThrow();
    });

    it('should reject invalid parent_id format', () => {
      const data = {
        title: 'Child Action',
        parent_id: 'invalid-uuid'
      };
      
      expect(() => addChildActionSchema.parse(data)).toThrow();
    });
  });

  describe('addDependencySchema', () => {
    it('should validate dependency creation', () => {
      const data = {
        action_id: '123e4567-e89b-12d3-a456-426614174000',
        depends_on_id: '123e4567-e89b-12d3-a456-426614174001'
      };
      const result = addDependencySchema.parse(data);
      
      expect(result.action_id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.depends_on_id).toBe('123e4567-e89b-12d3-a456-426614174001');
    });

    it('should reject missing action_id', () => {
      const data = { depends_on_id: '123e4567-e89b-12d3-a456-426614174001' };
      
      expect(() => addDependencySchema.parse(data)).toThrow();
    });

    it('should reject missing depends_on_id', () => {
      const data = { action_id: '123e4567-e89b-12d3-a456-426614174000' };
      
      expect(() => addDependencySchema.parse(data)).toThrow();
    });

    it('should reject invalid UUID formats', () => {
      const data = {
        action_id: 'invalid-uuid',
        depends_on_id: '123e4567-e89b-12d3-a456-426614174001'
      };
      
      expect(() => addDependencySchema.parse(data)).toThrow();
    });
  });

  describe('deleteActionSchema', () => {
    it('should apply default child_handling', () => {
      const data = {};
      const result = deleteActionSchema.parse(data);
      
      expect(result.child_handling).toBe('orphan');
      expect(result.new_parent_id).toBeUndefined();
    });

    it('should validate explicit child_handling strategies', () => {
      const strategies = ['delete_recursive', 'orphan', 'reparent'] as const;
      
      strategies.forEach(strategy => {
        const data = { child_handling: strategy };
        const result = deleteActionSchema.parse(data);
        expect(result.child_handling).toBe(strategy);
      });
    });

    it('should validate reparent with new_parent_id', () => {
      const data = {
        child_handling: 'reparent' as const,
        new_parent_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      const result = deleteActionSchema.parse(data);
      
      expect(result.child_handling).toBe('reparent');
      expect(result.new_parent_id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should reject invalid child_handling strategy', () => {
      const data = { child_handling: 'invalid_strategy' };
      
      expect(() => deleteActionSchema.parse(data)).toThrow();
    });

    it('should reject invalid new_parent_id format', () => {
      const data = {
        child_handling: 'reparent' as const,
        new_parent_id: 'invalid-uuid'
      };
      
      expect(() => deleteActionSchema.parse(data)).toThrow();
    });
  });
});