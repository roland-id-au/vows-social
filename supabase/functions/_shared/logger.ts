// Centralized Logger Utility
// Structured logging following Supabase best practices

export class Logger {
  private functionName: string
  private traceId: string
  private startTime: number

  constructor(functionName: string) {
    this.functionName = functionName
    this.traceId = crypto.randomUUID()
    this.startTime = Date.now()
  }

  private log(level: string, message: string, metadata?: Record<string, any>) {
    const logEntry = {
      level,
      function: this.functionName,
      trace_id: this.traceId,
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    }

    console.log(JSON.stringify(logEntry))
  }

  debug(message: string, metadata?: Record<string, any>) {
    this.log('DEBUG', message, metadata)
  }

  info(message: string, metadata?: Record<string, any>) {
    this.log('INFO', message, metadata)
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.log('WARN', message, metadata)
  }

  error(message: string, metadata?: Record<string, any>) {
    this.log('ERROR', message, metadata)
  }

  fatal(message: string, metadata?: Record<string, any>) {
    this.log('FATAL', message, metadata)
  }

  // Log to database for function execution tracking
  async logToDatabase(
    supabase: any,
    status: 'success' | 'error',
    recordsProcessed: number = 0,
    metadata?: Record<string, any>,
    errors?: string
  ) {
    const duration = Date.now() - this.startTime

    try {
      await supabase
        .from('function_logs')
        .insert({
          function_name: this.functionName,
          trace_id: this.traceId,
          status,
          records_processed: recordsProcessed,
          duration_ms: duration,
          metadata: metadata || {},
          errors: errors || null
        })
    } catch (error) {
      console.error('Failed to log to database:', error)
    }
  }
}
