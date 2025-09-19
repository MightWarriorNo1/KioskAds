import { AdminService } from './adminService';
import { GmailService } from './gmailService';

export class SchedulerService {
  // Check if it's time to send daily emails based on configured time
  static async shouldSendDailyEmails(): Promise<boolean> {
    try {
      const settings = await AdminService.getSystemSettings();
      const enabledSetting = settings.find(s => s.key === 'daily_pending_review_email_enabled');
      const timeSetting = settings.find(s => s.key === 'daily_pending_review_email_time');

      // Check if daily emails are enabled
      if (!enabledSetting?.value || enabledSetting.value === 'false') {
        return false;
      }

      // Get configured time (format: HH:MM)
      const configuredTime = timeSetting?.value || '09:00';
      const [configuredHour, configuredMinute] = configuredTime.split(':').map(Number);

      // Get current time
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Check if current time matches configured time (within 1 minute tolerance)
      const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (configuredHour * 60 + configuredMinute));
      return timeDiff <= 1;
    } catch (error) {
      console.error('Error checking if should send daily emails:', error);
      return false;
    }
  }

  // Process daily scheduled tasks
  static async processDailyTasks(): Promise<void> {
    try {
      console.log('Processing daily scheduled tasks...');

      // Check if it's time to send daily emails
      const shouldSendEmails = await this.shouldSendDailyEmails();
      
      if (shouldSendEmails) {
        console.log('Sending daily pending review emails...');
        await AdminService.sendDailyPendingReviewEmail();
      }

      // Process any pending emails in the queue
      console.log('Processing email queue...');
      await GmailService.processEmailQueue();

      console.log('Daily scheduled tasks completed');
    } catch (error) {
      console.error('Error processing daily scheduled tasks:', error);
    }
  }

  // Start the scheduler (call this from your main application)
  static startScheduler(): void {
    console.log('Starting email scheduler...');
    
    // Run immediately on start
    this.processDailyTasks();

    // Then run every minute to check for scheduled times
    setInterval(() => {
      this.processDailyTasks();
    }, 60000); // 60 seconds = 1 minute
  }

  // Manual trigger for testing
  static async triggerDailyEmails(): Promise<void> {
    try {
      console.log('Manually triggering daily pending review emails...');
      await AdminService.sendDailyPendingReviewEmail();
      console.log('Daily pending review emails triggered successfully');
    } catch (error) {
      console.error('Error manually triggering daily emails:', error);
      throw error;
    }
  }
}

