/**
 * Daily Delivery Reminder Job
 * Runs at 9:00 AM every day; sends "Coming Soon" emails for orders due in 24-48h.
 */
let cron;
try {
  cron = require('node-cron');
} catch (e) {
  console.warn('⚠️ node-cron not installed. Delivery reminder job disabled.');
}

const deliveryReminderService = require('../Service/deliveryReminderService');

class DeliveryReminderJob {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.stats = { totalRuns: 0, lastResult: null };
  }

  start() {
    if (!cron) return;

    // 9:00 AM daily (cron: minute=0, hour=9)
    cron.schedule('0 9 * * *', async () => {
      await this.run();
    });

    console.log('✅ [DeliveryReminder] Cron scheduled: daily at 9:00 AM');
  }

  async run() {
    if (this.isRunning) {
      console.log('⏳ [DeliveryReminder] Already running, skip.');
      return this.stats.lastResult;
    }

    this.isRunning = true;
    this.lastRun = new Date();
    this.stats.totalRuns++;

    try {
      const result = await deliveryReminderService.runDailyReminders();
      this.stats.lastResult = result;
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
    };
  }
}

const deliveryReminderJob = new DeliveryReminderJob();

if (process.env.NODE_ENV !== 'test') {
  deliveryReminderJob.start();
}

module.exports = deliveryReminderJob;
