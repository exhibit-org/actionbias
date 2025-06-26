import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

// Define expected API response schemas
const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
});

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

const actionSchema = z.object({
  id: z.string().uuid(),
  data: z.object({
    title: z.string(),
  }),
  version: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const edgeSchema = z.object({
  src: z.string().uuid(),
  dst: z.string().uuid(),
  kind: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const createActionResponseSchema = successResponseSchema.extend({
  data: z.object({
    action: actionSchema,
    parent_id: z.string().uuid().optional(),
    dependencies_count: z.number(),
  }),
});

const listActionsResponseSchema = successResponseSchema.extend({
  data: z.array(actionSchema),
});

const addChildActionResponseSchema = successResponseSchema.extend({
  data: z.object({
    action: actionSchema,
    parent: actionSchema,
    edge: edgeSchema,
  }),
});

const addDependencyResponseSchema = successResponseSchema.extend({
  data: edgeSchema,
});

const deleteActionResponseSchema = successResponseSchema.extend({
  data: z.object({
    deleted_action: actionSchema,
    children_count: z.number(),
    child_handling: z.enum(['delete_recursive', 'reparent']),
    new_parent_id: z.string().uuid().optional(),
  }),
});

const removeDependencyResponseSchema = successResponseSchema.extend({
  data: z.object({
    action: actionSchema,
    depends_on: actionSchema,
    deleted_edge: edgeSchema,
  }),
});

describe('API Response Format Validation', () => {
  describe('Common Response Formats', () => {
    it('should validate success response format', () => {
      const successResponse = {
        success: true,
        data: { someData: 'value' }
      };

      const result = successResponseSchema.parse(successResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ someData: 'value' });
    });

    it('should validate error response format', () => {
      const errorResponse = {
        success: false,
        error: 'Something went wrong'
      };

      const result = errorResponseSchema.parse(errorResponse);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Something went wrong');
    });

    it('should reject malformed success response', () => {
      const malformedResponse = {
        success: 'true', // wrong type
        data: { someData: 'value' }
      };

      expect(() => successResponseSchema.parse(malformedResponse)).toThrow();
    });

    it('should reject malformed error response', () => {
      const malformedResponse = {
        success: false,
        error: 123 // wrong type
      };

      expect(() => errorResponseSchema.parse(malformedResponse)).toThrow();
    });
  });

  describe('Action Schema', () => {
    it('should validate action object', () => {
      const action = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        data: { title: 'Test Action' },
        version: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const result = actionSchema.parse(action);
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.data.title).toBe('Test Action');
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should reject action with invalid ID', () => {
      const action = {
        id: 'invalid-uuid',
        data: { title: 'Test Action' },
        version: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      expect(() => actionSchema.parse(action)).toThrow();
    });

    it('should reject action without title', () => {
      const action = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        data: {}, // missing title
        version: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      expect(() => actionSchema.parse(action)).toThrow();
    });
  });

  describe('Edge Schema', () => {
    it('should validate edge object', () => {
      const edge = {
        src: '123e4567-e89b-12d3-a456-426614174000',
        dst: '123e4567-e89b-12d3-a456-426614174001',
        kind: 'family',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const result = edgeSchema.parse(edge);
      expect(result.src).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.dst).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(result.kind).toBe('family');
    });

    it('should reject edge with invalid UUIDs', () => {
      const edge = {
        src: 'invalid-uuid',
        dst: '123e4567-e89b-12d3-a456-426614174001',
        kind: 'family',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      expect(() => edgeSchema.parse(edge)).toThrow();
    });
  });

  describe('Create Action Response', () => {
    it('should validate successful create action response', () => {
      const response = {
        success: true,
        data: {
          action: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            data: { title: 'New Action' },
            version: 0,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          dependencies_count: 0,
        },
      };

      const result = createActionResponseSchema.parse(response);
      expect(result.success).toBe(true);
      expect(result.data.action.data.title).toBe('New Action');
      expect(result.data.dependencies_count).toBe(0);
    });

    it('should validate create action response with parent', () => {
      const response = {
        success: true,
        data: {
          action: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            data: { title: 'Child Action' },
            version: 0,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          parent_id: '123e4567-e89b-12d3-a456-426614174001',
          dependencies_count: 1,
        },
      };

      const result = createActionResponseSchema.parse(response);
      expect(result.data.parent_id).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(result.data.dependencies_count).toBe(1);
    });
  });

  describe('List Actions Response', () => {
    it('should validate empty list response', () => {
      const response = {
        success: true,
        data: [],
      };

      const result = listActionsResponseSchema.parse(response);
      expect(result.data).toHaveLength(0);
    });

    it('should validate list with multiple actions', () => {
      const response = {
        success: true,
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            data: { title: 'Action 1' },
            version: 0,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            data: { title: 'Action 2' },
            version: 0,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      };

      const result = listActionsResponseSchema.parse(response);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].data.title).toBe('Action 1');
      expect(result.data[1].data.title).toBe('Action 2');
    });
  });

  describe('Add Child Action Response', () => {
    it('should validate add child action response', () => {
      const response = {
        success: true,
        data: {
          action: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            data: { title: 'Child Action' },
            version: 0,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          parent: {
            id: '123e4567-e89b-12d3-a456-426614174001',
            data: { title: 'Parent Action' },
            version: 0,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          edge: {
            src: '123e4567-e89b-12d3-a456-426614174001',
            dst: '123e4567-e89b-12d3-a456-426614174000',
            kind: 'family',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };

      const result = addChildActionResponseSchema.parse(response);
      expect(result.data.action.data.title).toBe('Child Action');
      expect(result.data.parent.data.title).toBe('Parent Action');
      expect(result.data.edge.kind).toBe('family');
    });
  });

  describe('Delete Action Response', () => {
    it('should validate delete action response with delete_recursive strategy', () => {
      const response = {
        success: true,
        data: {
          deleted_action: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            data: { title: 'Deleted Action' },
            version: 0,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          children_count: 2,
          child_handling: 'delete_recursive',
        },
      };

      const result = deleteActionResponseSchema.parse(response);
      expect(result.data.deleted_action.data.title).toBe('Deleted Action');
      expect(result.data.children_count).toBe(2);
      expect(result.data.child_handling).toBe('delete_recursive');
    });

    it('should validate delete action response with reparent strategy', () => {
      const response = {
        success: true,
        data: {
          deleted_action: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            data: { title: 'Deleted Action' },
            version: 0,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          children_count: 1,
          child_handling: 'reparent',
          new_parent_id: '123e4567-e89b-12d3-a456-426614174001',
        },
      };

      const result = deleteActionResponseSchema.parse(response);
      expect(result.data.child_handling).toBe('reparent');
      expect(result.data.new_parent_id).toBe('123e4567-e89b-12d3-a456-426614174001');
    });
  });
});