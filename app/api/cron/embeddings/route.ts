/**
 * Vercel Cron job for processing actions without embeddings
 * Runs every 10 minutes to catch any actions that didn't get processed async
 */

import { NextRequest, NextResponse } from 'next/server';
import { VectorService } from '../../../../lib/services/vector';
import { EmbeddingsService } from '../../../../lib/services/embeddings';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron job request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting embedding batch processing cron job');

    // Get actions without embeddings (batch of 50 to avoid timeouts)
    const actionsWithoutEmbeddings = await VectorService.getActionsWithoutEmbeddings(50);
    
    if (actionsWithoutEmbeddings.length === 0) {
      console.log('No actions need embeddings');
      return NextResponse.json({ 
        message: 'No actions need embeddings',
        processed: 0 
      });
    }

    console.log(`Processing ${actionsWithoutEmbeddings.length} actions without embeddings`);

    // Process in smaller batches to avoid API rate limits
    const BATCH_SIZE = 10;
    let totalProcessed = 0;
    let errors = 0;

    for (let i = 0; i < actionsWithoutEmbeddings.length; i += BATCH_SIZE) {
      const batch = actionsWithoutEmbeddings.slice(i, i + BATCH_SIZE);
      
      try {
        // Generate embeddings for the batch
        const embeddingInputs = batch.map(action => ({
          title: action.title,
          description: action.description,
          vision: action.vision
        }));

        const embeddings = await EmbeddingsService.generateBatchEmbeddings(embeddingInputs);

        // Store embeddings in database
        for (let j = 0; j < batch.length; j++) {
          try {
            await VectorService.updateEmbedding(batch[j].id, embeddings[j]);
            totalProcessed++;
          } catch (error) {
            console.error(`Failed to store embedding for action ${batch[j].id}:`, error);
            errors++;
          }
        }

        console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}, total processed: ${totalProcessed}`);

        // Small delay between batches to be nice to OpenAI API
        if (i + BATCH_SIZE < actionsWithoutEmbeddings.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error(`Failed to process batch starting at index ${i}:`, error);
        errors += batch.length;
      }
    }

    // Get updated stats (with error handling)
    let stats;
    try {
      stats = await VectorService.getEmbeddingStats();
    } catch (error) {
      console.error('Failed to get embedding stats:', error);
      stats = {
        totalActions: 0,
        actionsWithEmbeddings: 0,
        actionsWithoutEmbeddings: 0,
        coveragePercentage: 0
      };
    }

    console.log(`Embedding cron job completed: ${totalProcessed} processed, ${errors} errors`);

    return NextResponse.json({
      message: 'Embedding processing completed',
      processed: totalProcessed,
      errors,
      stats: {
        totalActions: stats.totalActions,
        actionsWithEmbeddings: stats.actionsWithEmbeddings,
        coveragePercentage: Math.round(stats.coveragePercentage * 100) / 100
      }
    });

  } catch (error) {
    console.error('Embedding cron job failed:', error);
    return NextResponse.json(
      { 
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also handle POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}