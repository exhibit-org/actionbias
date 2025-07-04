/**
 * Mock for placement service
 */

export const PlacementService = {
  calculatePlacement: jest.fn().mockResolvedValue({
    position: 'top',
    priority: 1,
    score: 0.9,
  }),
  
  updatePlacement: jest.fn().mockResolvedValue({
    id: 'placement-123',
    position: 'top',
    priority: 1,
    score: 0.9,
  }),
  
  getPlacement: jest.fn().mockResolvedValue({
    id: 'placement-123',
    position: 'top',
    priority: 1,
    score: 0.9,
  }),
  
  deletePlacement: jest.fn().mockResolvedValue(true),
};