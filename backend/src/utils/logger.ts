// ==========================================
// SchoolSync Production-Grade Structured Logger
// ==========================================

export type LogLevel = "debug" | "info" | "success" | "warn" | "error";

interface LogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

class Logger {
  private isProduction = process.env.NODE_ENV === "production";
  private logLevel = process.env.LOG_LEVEL || (this.isProduction ? "info" : "debug");

  private levelPriority: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    success: 20,
    warn: 30,
    error: 40,
  };

  private shouldLog(level: LogLevel): boolean {
    const currentPriority = this.levelPriority[level] || 20;
    const configuredPriority = this.levelPriority[this.logLevel as LogLevel] || 20;
    return currentPriority >= configuredPriority;
  }

  private formatError(err: unknown): { name?: string; message?: string; stack?: string } | undefined {
    if (!err) return undefined;
    if (err instanceof Error) {
      return {
        name: err.name,
        message: err.message,
        stack: this.isProduction ? undefined : err.stack,
      };
    }
    return { message: String(err) };
  }

  private write(level: LogLevel, message: string, context?: string, metadata?: Record<string, any>, err?: unknown) {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const formattedError = this.formatError(err);

    if (this.isProduction) {
      // Structured JSON Output for Cloud Logging (Datadog, CloudWatch, Render, ELK)
      const payload: LogPayload = {
        timestamp,
        level,
        message,
        context,
        metadata: metadata && Object.keys(metadata).length > 0 ? metadata : undefined,
        error: formattedError,
      };
      const jsonLine = JSON.stringify(payload);
      if (level === "error") {
        process.stderr.write(jsonLine + "\n");
      } else {
        process.stdout.write(jsonLine + "\n");
      }
    } else {
      // Readable, formatted terminal output in development
      const prefixMap: Record<LogLevel, string> = {
        debug: "🔍 [DEBUG]",
        info: "ℹ️  [INFO]",
        success: "✅ [SUCCESS]",
        warn: "⚠️  [WARN]",
        error: "❌ [ERROR]",
      };
      const contextPrefix = context ? ` [${context}]` : "";
      const out = `${prefixMap[level]}${contextPrefix} ${message}`;
      
      if (level === "error") {
        console.error(out, metadata || "", err || "");
      } else if (level === "warn") {
        console.warn(out, metadata || "");
      } else {
        console.log(out, metadata || "");
      }
    }
  }

  public debug(message: string, context?: string, metadata?: Record<string, any>) {
    this.write("debug", message, context, metadata);
  }

  public info(message: string, context?: string, metadata?: Record<string, any>) {
    this.write("info", message, context, metadata);
  }

  public success(message: string, context?: string, metadata?: Record<string, any>) {
    this.write("success", message, context, metadata);
  }

  public warn(message: string, context?: string, metadata?: Record<string, any>) {
    this.write("warn", message, context, metadata);
  }

  public error(message: string, context?: string, err?: unknown, metadata?: Record<string, any>) {
    this.write("error", message, context, metadata, err);
  }
}

export const logger = new Logger();
export default logger;
