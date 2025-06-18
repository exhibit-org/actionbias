/**
 * @jest-environment node
 */

import { PlacementService } from '../placement';
import type { ActionContent } from '../../utils/text-processing';

// Mock the AI SDK
jest.mock('ai', () => ({
  generateObject: jest.fn()
}));

import { generateObject } from 'ai';

const mockGenerateObject = generateObject as jest.MockedFunction<typeof generateObject>;

describe('PlacementService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockGenerateObject.mockReset();
  });
  const mockExistingActions = [
    {
      id: 'auth-root',
      title: 'Authentication & Authorization System',
      description: 'Complete authentication and authorization infrastructure',
      vision: 'Secure user access with comprehensive authentication'
    },
    {
      id: 'auth-jwt',
      parentId: 'auth-root',
      title: 'JWT Authentication System',
      description: 'Implement secure JWT token generation and validation'
    },
    {
      id: 'auth-rbac',
      parentId: 'auth-root',
      title: 'Role-Based Authorization',
      description: 'Create Role enum and implement permission matrix'
    },
    {
      id: 'db-root',
      title: 'Database Architecture',
      description: 'Database design and implementation for multi-tenant architecture',
      vision: 'Scalable, secure database foundation'
    },
    {
      id: 'db-schema',
      parentId: 'db-root',
      title: 'Multi-Tenant Database Schema Design',
      description: 'Design and implement database tables'
    },
    {
      id: 'api-root',
      title: 'API Development',
      description: 'REST API endpoints and service layer',
      vision: 'Complete, secure API supporting all functionality'
    },
    {
      id: 'ui-root',
      title: 'User Interface',
      description: 'Frontend components and pages',
      vision: 'Intuitive, responsive user interface'
    }
  ];

  describe('findBestParent', () => {
    it('should place OAuth integration under authentication', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          bestParentId: 'auth-root',
          confidence: 0.9,
          reasoning: 'OAuth2 is fundamentally an authentication protocol and belongs with authentication systems'
        }
      } as any);

      const newAction: ActionContent = {
        title: 'OAuth2 Integration',
        description: 'Implement OAuth2 authentication flow with Google and GitHub providers',
        vision: 'Users can authenticate using their existing accounts'
      };

      const result = await PlacementService.findBestParent(newAction, mockExistingActions);

      expect(result.bestParent?.id).toBe('auth-root');
      expect(result.confidence).toBe(0.9);
      expect(result.reasoning).toContain('authentication');
    });

    it('should place database schema under database architecture', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          bestParentId: 'db-root',
          confidence: 0.95,
          reasoning: 'Database schema design clearly belongs under Database Architecture'
        }
      } as any);

      const newAction: ActionContent = {
        title: 'User Profile Database Schema',
        description: 'Design user_profiles table to store additional user information',
        vision: 'Extended user information is properly stored and queryable'
      };

      const result = await PlacementService.findBestParent(newAction, mockExistingActions);

      expect(result.bestParent?.id).toBe('db-root');
      expect(result.confidence).toBe(0.95);
      expect(result.reasoning).toContain('Database');
    });

    it('should place UI component under user interface', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          bestParentId: 'ui-root',
          confidence: 0.85,
          reasoning: 'React component for visualization belongs with User Interface components'
        }
      } as any);

      const newAction: ActionContent = {
        title: 'Interactive Action Tree Component',
        description: 'Build React component for visualizing action hierarchies',
        vision: 'Users can visually understand and reorganize hierarchies'
      };

      const result = await PlacementService.findBestParent(newAction, mockExistingActions);

      expect(result.bestParent?.id).toBe('ui-root');
      expect(result.confidence).toBe(0.85);
      expect(result.reasoning).toContain('User Interface');
    });

    it('should handle unrelated actions with low confidence', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          bestParentId: null,
          confidence: 0.1,
          reasoning: 'Marketing analytics does not fit well with any of the available technical categories'
        }
      } as any);

      const newAction: ActionContent = {
        title: 'Marketing Campaign Analytics',
        description: 'Track and analyze marketing campaign performance',
        vision: 'Data-driven marketing decisions'
      };

      const result = await PlacementService.findBestParent(newAction, mockExistingActions);

      expect(result.bestParent).toBeNull();
      expect(result.confidence).toBe(0.1);
      expect(result.reasoning).toContain('Marketing analytics');
    });

    it('should handle empty existing actions', async () => {
      const newAction: ActionContent = {
        title: 'Test Action',
        description: 'Test description'
      };

      const result = await PlacementService.findBestParent(newAction, []);

      expect(result.bestParent).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.reasoning).toBe('No potential parent actions found');
    });

    it('should be deterministic across multiple runs', async () => {
      // Mock consistent responses
      const mockResponse = {
        object: {
          bestParentId: 'auth-root',
          confidence: 0.8,
          reasoning: 'Password reset is a core authentication function'
        }
      } as any;
      
      mockGenerateObject
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse);

      const newAction: ActionContent = {
        title: 'Password Reset Flow',
        description: 'Implement secure password reset with email verification',
        vision: 'Users can securely reset their passwords'
      };

      const [result1, result2, result3] = await Promise.all([
        PlacementService.findBestParent(newAction, mockExistingActions),
        PlacementService.findBestParent(newAction, mockExistingActions),
        PlacementService.findBestParent(newAction, mockExistingActions)
      ]);

      expect(result1.bestParent?.id).toBe(result2.bestParent?.id);
      expect(result2.bestParent?.id).toBe(result3.bestParent?.id);
      expect(result1.confidence).toBe(result2.confidence);
      expect(result2.confidence).toBe(result3.confidence);
    });

    it('should include analysis results', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          bestParentId: 'ui-root',
          confidence: 0.5,
          reasoning: 'Test action placed for testing purposes'
        }
      } as any);

      const newAction: ActionContent = {
        title: 'Test Action',
        description: 'Test description with sufficient content',
        vision: 'Clear test vision'
      };

      const result = await PlacementService.findBestParent(newAction, mockExistingActions);

      expect(result.analysis).toBeDefined();
      expect(result.analysis.metadata).toBeDefined();
      expect(result.analysis.keywords).toBeDefined();
      expect(result.analysis.importantTerms).toBeDefined();
    });
  });

  describe('semantic matching', () => {
    it('should prioritize auth concepts over API for password-related actions', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          bestParentId: 'auth-root',
          confidence: 0.85,
          reasoning: 'Password reset is fundamentally an authentication function, despite being delivered via API'
        }
      } as any);

      const newAction: ActionContent = {
        title: 'Password Reset API',
        description: 'API endpoint for secure password reset functionality',
        vision: 'Users can reset passwords via API'
      };

      const result = await PlacementService.findBestParent(newAction, mockExistingActions);

      expect(result.bestParent?.id).toBe('auth-root');
      expect(result.reasoning).toContain('authentication');
    });

    it('should consider child similarity for placement decisions', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          bestParentId: 'auth-root',
          confidence: 0.9,
          reasoning: 'Multi-factor authentication fits perfectly with existing JWT and RBAC authentication systems'
        }
      } as any);

      const newAction: ActionContent = {
        title: 'Multi-Factor Authentication',
        description: 'Add TOTP and SMS-based two-factor authentication',
        vision: 'Enhanced security with multiple auth factors'
      };

      const result = await PlacementService.findBestParent(newAction, mockExistingActions);

      expect(result.bestParent?.id).toBe('auth-root');
      expect(result.reasoning).toContain('authentication');
    });
  });

  describe('LLM error handling', () => {
    it('should handle LLM failures gracefully without suggesting placement', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('API Error'));

      const newAction: ActionContent = {
        title: 'Database Migration Tool',
        description: 'Tool for managing database schema migrations',
        vision: 'Seamless database updates'
      };

      const result = await PlacementService.findBestParent(newAction, mockExistingActions);

      expect(result.bestParent).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.reasoning).toContain('LLM placement failed');
    });
  });
});