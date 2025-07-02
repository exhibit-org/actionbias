import { eq, desc, and, ilike } from 'drizzle-orm';
import { getDb } from '../db/adapter';
import { workLog } from '../../db/schema';

type WorkLogSelect = typeof workLog.$inferSelect;

export interface WorkLogEntry {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface CreateWorkLogEntryParams {
  content: string;
  metadata?: Record<string, any>;
}

export class WorkLogService {
  /**
   * Add a new work log entry
   */
  static async addEntry(params: CreateWorkLogEntryParams): Promise<WorkLogEntry> {
    const db = getDb();
    const [entry] = await db
      .insert(workLog)
      .values({
        content: params.content,
        metadata: params.metadata || {},
      })
      .returning();

    return {
      id: entry.id,
      content: entry.content,
      metadata: entry.metadata || {},
      timestamp: entry.timestamp,
    };
  }

  /**
   * Get recent work log entries
   */
  static async getRecentEntries(limit: number = 50): Promise<WorkLogEntry[]> {
    const db = getDb();
    const entries = await db
      .select()
      .from(workLog)
      .orderBy(desc(workLog.timestamp))
      .limit(limit);

    return entries.map((entry: WorkLogSelect) => ({
      id: entry.id,
      content: entry.content,
      metadata: entry.metadata || {},
      timestamp: entry.timestamp,
    }));
  }

  /**
   * Search work log entries by content
   */
  static async searchEntries(query: string, limit: number = 20): Promise<WorkLogEntry[]> {
    const db = getDb();
    const entries = await db
      .select()
      .from(workLog)
      .where(ilike(workLog.content, `%${query}%`))
      .orderBy(desc(workLog.timestamp))
      .limit(limit);

    return entries.map((entry: WorkLogSelect) => ({
      id: entry.id,
      content: entry.content,
      metadata: entry.metadata || {},
      timestamp: entry.timestamp,
    }));
  }

  /**
   * Get entries by agent (from metadata)
   */
  static async getEntriesByAgent(agentId: string, limit: number = 20): Promise<WorkLogEntry[]> {
    const db = getDb();
    const entries = await db
      .select()
      .from(workLog)
      .where(eq(workLog.metadata, { agent_id: agentId }))
      .orderBy(desc(workLog.timestamp))
      .limit(limit);

    return entries.map((entry: WorkLogSelect) => ({
      id: entry.id,
      content: entry.content,
      metadata: entry.metadata || {},
      timestamp: entry.timestamp,
    }));
  }

  /**
   * Get work log entries mentioning specific action IDs
   * This uses a simple JSON contains check - could be enhanced with vector search later
   */
  static async getEntriesForAction(actionId: string, limit: number = 10): Promise<WorkLogEntry[]> {
    // For now, search in both content and metadata
    const db = getDb();
    const entries = await db
      .select()
      .from(workLog)
      .where(
        and(
          // Check if action ID appears in content OR metadata
          // This is a simple approach - we could enhance with vector search later
          ilike(workLog.content, `%${actionId}%`)
        )
      )
      .orderBy(desc(workLog.timestamp))
      .limit(limit);

    return entries.map((entry: WorkLogSelect) => ({
      id: entry.id,
      content: entry.content,
      metadata: entry.metadata || {},
      timestamp: entry.timestamp,
    }));
  }

  /**
   * Get Claude Code hook entries by type
   */
  static async getHookEntries(hookType?: string, limit: number = 50): Promise<WorkLogEntry[]> {
    const db = getDb();
    let query = db
      .select()
      .from(workLog)
      .where(ilike(workLog.content, 'claude_code_hook:%'));

    if (hookType) {
      query = query.where(
        and(
          ilike(workLog.content, 'claude_code_hook:%'),
          ilike(workLog.content, `%${hookType}%`)
        )
      );
    }

    const entries = await query
      .orderBy(desc(workLog.timestamp))
      .limit(limit);

    return entries.map((entry: WorkLogSelect) => ({
      id: entry.id,
      content: entry.content,
      metadata: entry.metadata || {},
      timestamp: entry.timestamp,
    }));
  }

  /**
   * Get hook entries by tool name (for analyzing specific tool usage)
   */
  static async getHookEntriesByTool(toolName: string, limit: number = 50): Promise<WorkLogEntry[]> {
    const db = getDb();
    const entries = await db
      .select()
      .from(workLog)
      .where(
        and(
          ilike(workLog.content, 'claude_code_hook:%'),
          // Use JSON path query to check metadata.tool_name
          // This is PostgreSQL specific - may need adjustment for other DBs
          eq(workLog.metadata, { tool_name: toolName })
        )
      )
      .orderBy(desc(workLog.timestamp))
      .limit(limit);

    return entries.map((entry: WorkLogSelect) => ({
      id: entry.id,
      content: entry.content,
      metadata: entry.metadata || {},
      timestamp: entry.timestamp,
    }));
  }

  /**
   * Optimized method for high-volume hook data insertion
   * Returns immediately without waiting for DB response
   */
  static async addHookEntryAsync(params: CreateWorkLogEntryParams): Promise<void> {
    const db = getDb();
    
    // Fire-and-forget insertion for maximum performance
    db.insert(workLog)
      .values({
        content: params.content,
        metadata: params.metadata || {},
      })
      .catch((error: any) => {
        console.error('Hook entry insertion failed:', error);
      });
    
    // Return immediately - don't wait for DB
    return Promise.resolve();
  }
}