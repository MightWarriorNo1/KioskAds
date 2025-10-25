import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export interface S3ProxyConfig {
  action: 'list' | 'get'
  prefix?: string
  key?: string
  maxKeys?: number
}

export interface S3Object {
  Key: string
  Size?: number
  LastModified?: Date
  ETag?: string
}

export interface S3ListResponse {
  success: boolean
  data?: {
    Contents: S3Object[]
    IsTruncated?: boolean
    NextContinuationToken?: string
  }
  error?: string
}

export class S3ProxyService {
  private static getProxyUrl(): string {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    return `${supabaseUrl}/functions/v1/s3-proxy`
  }

  /**
   * List objects in S3 bucket through proxy
   */
  static async listObjects(config: {
    prefix?: string
    maxKeys?: number
  }): Promise<S3Object[]> {
    try {
      const url = new URL(this.getProxyUrl())
      url.searchParams.set('action', 'list')
      if (config.prefix) {
        url.searchParams.set('prefix', config.prefix)
      }
      if (config.maxKeys) {
        url.searchParams.set('maxKeys', config.maxKeys.toString())
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No authentication session found')
      }

      console.log('S3ProxyService: Making request to:', url.toString())

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('S3ProxyService: Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('S3ProxyService: Error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      const result: S3ListResponse = await response.json()
      console.log('S3ProxyService: Result:', result)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to list objects')
      }

      return result.data?.Contents || []
    } catch (error) {
      console.error('S3ProxyService: Error listing S3 objects via proxy:', error)
      throw new Error(`Failed to list objects: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get object content from S3 bucket through proxy
   */
  static async getObject(key: string): Promise<string> {
    try {
      const url = new URL(this.getProxyUrl())
      url.searchParams.set('action', 'get')
      url.searchParams.set('key', key)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No authentication session found')
      }

      console.log('S3ProxyService: Making request for object to:', url.toString())

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('S3ProxyService: Response status for object:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('S3ProxyService: Error response for object:', errorText)
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      return await response.text()
    } catch (error) {
      console.error('S3ProxyService: Error getting S3 object via proxy:', error)
      throw new Error(`Failed to get object: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Test the S3 proxy connection
   */
  static async testConnection(): Promise<{
    success: boolean
    message: string
    details?: Record<string, unknown>
  }> {
    try {
      const objects = await this.listObjects({ maxKeys: 1 })
      
      return {
        success: true,
        message: 'S3 proxy connection test successful!',
        details: {
          objectCount: objects.length,
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `S3 proxy connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }
}