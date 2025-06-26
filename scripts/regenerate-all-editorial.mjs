#!/usr/bin/env node

/**
 * Script to regenerate all editorial content with enhanced context
 * 
 * Usage:
 *   node scripts/regenerate-all-editorial.mjs
 *   node scripts/regenerate-all-editorial.mjs --batch-size=20
 *   node scripts/regenerate-all-editorial.mjs --before=2025-06-20
 *   node scripts/regenerate-all-editorial.mjs --dry-run
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.actionbias.ai';
const DEFAULT_BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  batchSize: DEFAULT_BATCH_SIZE,
  before: null,
  dryRun: false,
  baseUrl: BASE_URL
};

args.forEach(arg => {
  if (arg.startsWith('--batch-size=')) {
    options.batchSize = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--before=')) {
    options.before = arg.split('=')[1];
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg.startsWith('--base-url=')) {
    options.baseUrl = arg.split('=')[1];
  }
});

console.log('🔄 Editorial Content Regeneration Script');
console.log('=====================================');
console.log(`Base URL: ${options.baseUrl}`);
console.log(`Batch size: ${options.batchSize}`);
console.log(`Before date: ${options.before || 'Today'}`);
console.log(`Dry run: ${options.dryRun}`);
console.log('');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function regenerateBatch(batchSize, beforeDate) {
  const url = new URL(`${options.baseUrl}/api/debug/regenerate-editorial`);
  url.searchParams.set('limit', batchSize.toString());
  if (beforeDate) {
    url.searchParams.set('before', beforeDate);
  }

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('❌ Batch failed:', error.message);
    return null;
  }
}

async function main() {
  let totalProcessed = 0;
  let totalErrors = 0;
  let batchNumber = 1;
  let continueProcessing = true;

  console.log('Starting regeneration process...\n');

  while (continueProcessing) {
    console.log(`📦 Batch ${batchNumber}:`);
    
    if (options.dryRun) {
      console.log('  [DRY RUN] Would process batch with:');
      console.log(`  - Limit: ${options.batchSize}`);
      console.log(`  - Before: ${options.before || 'Today'}`);
      continueProcessing = false;
      break;
    }

    const result = await regenerateBatch(options.batchSize, options.before);
    
    if (!result) {
      console.log('  ❌ Batch failed, stopping.');
      break;
    }

    console.log(`  ✅ Processed: ${result.processed}`);
    console.log(`  ❌ Errors: ${result.errors}`);
    
    totalProcessed += result.processed;
    totalErrors += result.errors;

    // If we processed fewer than the batch size, we're done
    if (result.processed < options.batchSize) {
      console.log(`\n✨ All done! Processed fewer than batch size.`);
      continueProcessing = false;
    } else {
      console.log(`  ⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES);
      batchNumber++;
    }
  }

  console.log('\n📊 Final Summary:');
  console.log('================');
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Batches run: ${batchNumber}`);
  console.log(`Success rate: ${totalProcessed > 0 ? ((totalProcessed / (totalProcessed + totalErrors)) * 100).toFixed(1) : 0}%`);
}

// Run the script
main().catch(error => {
  console.error('\n💥 Script failed:', error);
  process.exit(1);
});