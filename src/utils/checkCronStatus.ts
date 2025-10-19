/**
 * Check cron job status and recent runs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function checkCronStatus() {
  console.log('=== CRON JOB STATUS CHECK ===')
  
  try {
    // 1. Check if pg_cron extension is enabled
    console.log('\n1. Checking pg_cron extension...')
    
    const { data: extensions, error: extError } = await supabase
      .from('pg_extension')
      .select('*')
      .eq('extname', 'pg_cron')
    
    if (extError) {
      console.error('Error checking extensions:', extError)
    } else {
      console.log(`pg_cron extension found: ${extensions?.length || 0}`)
      extensions?.forEach(ext => {
        console.log(`  - ${ext.extname}: Version ${ext.extversion}`)
      })
    }
    
    // 2. Check cron jobs
    console.log('\n2. Checking cron jobs...')
    
    const { data: cronJobs, error: cronError } = await supabase
      .from('pg_cron.job')
      .select('*')
      .order('jobid')
    
    if (cronError) {
      console.error('Error fetching cron jobs:', cronError)
    } else {
      console.log(`Found ${cronJobs?.length || 0} cron jobs:`)
      cronJobs?.forEach(job => {
        console.log(`  - Job ${job.jobid}: ${job.jobname}`)
        console.log(`    Active: ${job.active}`)
        console.log(`    Schedule: ${job.schedule}`)
        console.log(`    Command: ${job.command}`)
        console.log(`    Last Run: ${job.last_run}`)
        console.log(`    Next Run: ${job.next_run}`)
        console.log('')
      })
    }
    
    // 3. Check recent cron job runs
    console.log('\n3. Checking recent cron job runs...')
    
    const { data: jobRuns, error: runsError } = await supabase
      .from('pg_cron.job_run_details')
      .select('*')
      .order('start_time', { ascending: false })
      .limit(10)
    
    if (runsError) {
      console.error('Error fetching job runs:', runsError)
    } else {
      console.log(`Found ${jobRuns?.length || 0} recent job runs:`)
      jobRuns?.forEach(run => {
        console.log(`  - Job ${run.jobid}: ${run.jobname}`)
        console.log(`    Start: ${run.start_time}`)
        console.log(`    End: ${run.end_time}`)
        console.log(`    Status: ${run.status}`)
        if (run.return_message) {
          console.log(`    Message: ${run.return_message}`)
        }
        console.log('')
      })
    }
    
    // 4. Check system settings
    console.log('\n4. Checking system settings...')
    
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (settingsError) {
      console.error('Error fetching system settings:', settingsError)
    } else {
      console.log(`Found ${settings?.length || 0} system settings:`)
      settings?.forEach(setting => {
        console.log(`  - ${setting.key}: ${setting.value}`)
      })
    }
    
    // 5. Check scheduler runs table
    console.log('\n5. Checking scheduler runs...')
    
    const { data: schedulerRuns, error: schedulerError } = await supabase
      .from('scheduler_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (schedulerError) {
      console.error('Error fetching scheduler runs:', schedulerError)
    } else {
      console.log(`Found ${schedulerRuns?.length || 0} scheduler runs:`)
      schedulerRuns?.forEach(run => {
        console.log(`  - ${run.scheduler_type}: ${run.status}`)
        console.log(`    Created: ${run.created_at}`)
        if (run.error_message) {
          console.log(`    Error: ${run.error_message}`)
        }
        console.log('')
      })
    }
    
    console.log('\n=== CRON STATUS CHECK COMPLETED ===')
    
  } catch (error) {
    console.error('Error in cron status check:', error)
  }
}

export default checkCronStatus

