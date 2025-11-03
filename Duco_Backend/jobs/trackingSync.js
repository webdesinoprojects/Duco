// Scheduled job for syncing order tracking status with Printrove
let cron;
try {
  cron = require('node-cron');
} catch (error) {
  console.warn('⚠️ node-cron not installed. Tracking sync job will be disabled.');
  console.warn('💡 To enable automatic tracking sync, install node-cron: npm install node-cron');
}

const PrintroveTrackingService = require('../Service/PrintroveTrackingService');

class TrackingSyncJob {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      lastError: null
    };
  }

  // Start the scheduled sync job
  start() {
    if (!cron) {
      console.log('⚠️ Tracking sync job disabled - node-cron not available');
      return;
    }

    console.log('🕐 Starting tracking sync job scheduler...');
    
    // Run every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
      await this.runSync();
    });

    // Run every 4 hours for a more comprehensive sync
    cron.schedule('0 */4 * * *', async () => {
      await this.runSync(true);
    });

    console.log('✅ Tracking sync job scheduler started');
    console.log('📅 Schedule: Every 30 minutes (quick sync), Every 4 hours (full sync)');
  }

  // Run the sync process
  async runSync(isFullSync = false) {
    if (this.isRunning) {
      console.log('⏳ Tracking sync already running, skipping...');
      return;
    }

    try {
      this.isRunning = true;
      this.lastRun = new Date();
      this.stats.totalRuns++;

      console.log(`🔄 Starting ${isFullSync ? 'full' : 'quick'} tracking sync...`);
      
      const result = await PrintroveTrackingService.syncAllOrderStatuses();
      
      console.log(`✅ Tracking sync completed:`, {
        type: isFullSync ? 'full' : 'quick',
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        timestamp: this.lastRun.toISOString()
      });

      this.stats.successfulRuns++;
      this.stats.lastError = null;

      // Log summary for monitoring
      if (result.failed > 0) {
        console.warn(`⚠️ ${result.failed} orders failed to sync`);
        const failedOrders = result.results.filter(r => !r.success);
        failedOrders.slice(0, 5).forEach(failed => {
          console.warn(`   - Order ${failed.orderId}: ${failed.error}`);
        });
        if (failedOrders.length > 5) {
          console.warn(`   ... and ${failedOrders.length - 5} more`);
        }
      }

    } catch (error) {
      console.error('❌ Tracking sync job failed:', error.message);
      this.stats.failedRuns++;
      this.stats.lastError = {
        message: error.message,
        timestamp: new Date().toISOString()
      };
    } finally {
      this.isRunning = false;
    }
  }

  // Get job statistics
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      uptime: this.lastRun ? Date.now() - this.lastRun.getTime() : null
    };
  }

  // Manual trigger for testing
  async triggerManualSync() {
    console.log('🔧 Manual tracking sync triggered');
    await this.runSync(true);
  }
}

// Create singleton instance
const trackingSyncJob = new TrackingSyncJob();

// Auto-start if not in test environment
if (process.env.NODE_ENV !== 'test') {
  trackingSyncJob.start();
}

module.exports = trackingSyncJob;