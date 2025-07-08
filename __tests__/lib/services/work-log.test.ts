import { WorkLogService } from '../../../lib/services/work-log';
import { getDb } from '../../../lib/db/adapter';
import { workLog } from '../../../db/schema';

// Mock the database adapter
jest.mock('../../../lib/db/adapter');
const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;

describe('WorkLogService', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn(),
    };
    mockGetDb.mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addEntry', () => {
    it('should add a work log entry', async () => {
      const mockEntry = {
        id: 'test-id',
        content: 'Started working on action X',
        metadata: { agent_id: 'claude-123' },
        timestamp: new Date(),
      };

      mockDb.returning.mockResolvedValue([mockEntry]);

      const result = await WorkLogService.addEntry({
        content: 'Started working on action X',
        metadata: { agent_id: 'claude-123' },
      });

      expect(mockDb.insert).toHaveBeenCalledWith(workLog);
      expect(mockDb.values).toHaveBeenCalledWith({
        content: 'Started working on action X',
        metadata: { agent_id: 'claude-123' },
      });
      expect(result).toEqual({
        id: 'test-id',
        content: 'Started working on action X',
        metadata: { agent_id: 'claude-123' },
        timestamp: mockEntry.timestamp,
      });
    });
  });

  describe('getRecentEntries', () => {
    it('should get recent entries with default limit', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          content: 'Entry 1',
          metadata: {},
          timestamp: new Date(),
        },
        {
          id: 'entry-2',
          content: 'Entry 2',
          metadata: { agent_id: 'claude-123' },
          timestamp: new Date(),
        },
      ];

      mockDb.limit.mockResolvedValue(mockEntries);

      const result = await WorkLogService.getRecentEntries();

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(workLog);
      expect(mockDb.limit).toHaveBeenCalledWith(50);
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Entry 1');
    });

    it('should respect custom limit', async () => {
      mockDb.limit.mockResolvedValue([]);

      await WorkLogService.getRecentEntries(10);

      expect(mockDb.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('searchEntries', () => {
    it('should search entries by content', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          content: 'Working on action X',
          metadata: {},
          timestamp: new Date(),
        },
      ];

      mockDb.limit.mockResolvedValue(mockEntries);

      const result = await WorkLogService.searchEntries('action X');

      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(20);
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Working on action X');
    });
  });

  describe('getEntriesForAction', () => {
    it('should get entries for a specific action', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          content: 'Started working on action-123',
          metadata: { action_ids: ['action-123'] },
          timestamp: new Date(),
        },
      ];

      mockDb.limit.mockResolvedValue(mockEntries);

      const result = await WorkLogService.getEntriesForAction('action-123');

      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(1);
    });
  });
});