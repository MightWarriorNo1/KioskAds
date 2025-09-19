import { SchedulerService } from '../services/schedulerService';

// Initialize the scheduler when the app starts
export function initializeScheduler(): void {
  // Only start the scheduler in the browser environment
  if (typeof window !== 'undefined') {
    console.log('Initializing email scheduler...');
    SchedulerService.startScheduler();
  }
}

// Manual trigger function for testing
export async function triggerDailyEmails(): Promise<void> {
  try {
    await SchedulerService.triggerDailyEmails();
    console.log('Daily emails triggered successfully');
  } catch (error) {
    console.error('Error triggering daily emails:', error);
    throw error;
  }
}

