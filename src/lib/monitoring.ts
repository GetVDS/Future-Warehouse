import { NextRequest } from 'next/server';

// 日志级别
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// 日志条目接口
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  userId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// 性能指标接口
export interface PerformanceMetrics {
  timestamp: string;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  responseTime: number;
  endpoint: string;
  method: string;
  statusCode: number;
}

// 动态导入jsonwebtoken模块
let jwtModule: any = null;
let jsonwebtokenLoaded = false;

const loadJsonWebToken = async () => {
  if (!jsonwebtokenLoaded) {
    jwtModule = await import('jsonwebtoken');
    jsonwebtokenLoaded = true;
  }
  return jwtModule;
};

// 监控类
export class MonitoringService {
  private static instance: MonitoringService;
  private logs: LogEntry[] = [];
  private metrics: PerformanceMetrics[] = [];
  private maxLogEntries = 1000;
  private maxMetricEntries = 500;

  private constructor() {
    // 定期清理旧的日志和指标
    setInterval(() => {
      this.cleanupOldEntries();
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  // 记录日志
  public async log(level: LogLevel, message: string, context?: any, request?: NextRequest): Promise<void> {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      requestId: this.generateRequestId(),
      userAgent: request?.headers.get('user-agent') || undefined,
      ip: this.getClientIP(request),
      url: request?.url,
      method: request?.method
    };

    // 添加用户ID（如果可用）
    if (request) {
      const token = request.cookies.get('auth-token')?.value;
      if (token) {
        try {
          // 使用动态导入jsonwebtoken
          const jwt = await loadJsonWebToken();
          const { verify } = jwt;
          const decoded = verify(token, process.env.JWT_SECRET || 'default-secret') as any;
          logEntry.userId = decoded.userId;
        } catch (error) {
          // 忽略token解析错误
        }
      }
    }

    this.logs.push(logEntry);

    // 在生产环境中，将错误日志发送到外部服务
    if (process.env.NODE_ENV === 'production' && level === LogLevel.ERROR) {
      this.sendToExternalService(logEntry);
    }

    // 控制台输出
    this.consoleLog(logEntry);
  }

  // 记录性能指标
  public recordPerformance(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    request?: NextRequest
  ): void {
    const memUsage = process.memoryUsage();
    const metrics: PerformanceMetrics = {
      timestamp: new Date().toISOString(),
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      cpu: {
        usage: process.cpuUsage().user // 简化的CPU使用率
      },
      responseTime,
      endpoint,
      method,
      statusCode
    };

    this.metrics.push(metrics);

    // 如果响应时间过长，记录警告
    if (responseTime > 1000) {
      this.log(LogLevel.WARN, `Slow response time detected`, {
        endpoint,
        method,
        responseTime,
        threshold: 1000
      }, request);
    }
  }

  // 获取最近的日志
  public getRecentLogs(level?: LogLevel, limit: number = 100): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }
    
    return filteredLogs.slice(-limit);
  }

  // 获取最近的性能指标
  public getRecentMetrics(limit: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  // 获取错误统计
  public getErrorStats(timeRangeMinutes: number = 60): {
    totalErrors: number;
    errorsByEndpoint: { [key: string]: number };
    errorsByHour: { [key: string]: number };
  } {
    const cutoffTime = new Date(Date.now() - timeRangeMinutes * 60 * 1000);
    const recentLogs = this.logs.filter(log => 
      log.level === LogLevel.ERROR && 
      new Date(log.timestamp) > cutoffTime
    );

    const errorsByEndpoint: { [key: string]: number } = {};
    const errorsByHour: { [key: string]: number } = {};

    recentLogs.forEach(log => {
      const endpoint = log.url || 'unknown';
      errorsByEndpoint[endpoint] = (errorsByEndpoint[endpoint] || 0) + 1;

      const hour = new Date(log.timestamp).getHours();
      const hourKey = `${hour}:00`;
      errorsByHour[hourKey] = (errorsByHour[hourKey] || 0) + 1;
    });

    return {
      totalErrors: recentLogs.length,
      errorsByEndpoint,
      errorsByHour
    };
  }

  // 获取性能统计
  public getPerformanceStats(timeRangeMinutes: number = 60): {
    avgResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    avgMemoryUsage: number;
    requestCount: number;
    errorRate: number;
  } {
    const cutoffTime = new Date(Date.now() - timeRangeMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(metric => 
      new Date(metric.timestamp) > cutoffTime
    );

    if (recentMetrics.length === 0) {
      return {
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        avgMemoryUsage: 0,
        requestCount: 0,
        errorRate: 0
      };
    }

    const responseTimes = recentMetrics.map(m => m.responseTime);
    const memoryUsages = recentMetrics.map(m => m.memory.percentage);
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;

    return {
      avgResponseTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      avgMemoryUsage: Math.round(memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length),
      requestCount: recentMetrics.length,
      errorRate: Math.round((errorCount / recentMetrics.length) * 100)
    };
  }

  // 清理旧条目
  private cleanupOldEntries(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24小时前
    
    this.logs = this.logs.filter(log => new Date(log.timestamp) > cutoffTime);
    this.metrics = this.metrics.filter(metric => new Date(metric.timestamp) > cutoffTime);

    // 限制数组大小
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries);
    }
    
    if (this.metrics.length > this.maxMetricEntries) {
      this.metrics = this.metrics.slice(-this.maxMetricEntries);
    }
  }

  // 生成请求ID
  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 获取客户端IP
  private getClientIP(request?: NextRequest): string | undefined {
    if (!request) return undefined;
    
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const requestIP = (request as any).ip;
    
    return forwardedFor || realIP || requestIP;
  }

  // 控制台日志
  private consoleLog(logEntry: LogEntry): void {
    const logMethod = {
      [LogLevel.ERROR]: console.error,
      [LogLevel.WARN]: console.warn,
      [LogLevel.INFO]: console.info,
      [LogLevel.DEBUG]: console.debug
    }[logEntry.level];

    const message = `[${logEntry.timestamp}] ${logEntry.level.toUpperCase()}: ${logEntry.message}`;
    
    if (logEntry.context) {
      logMethod(message, logEntry.context);
    } else {
      logMethod(message);
    }
  }

  // 发送到外部服务（生产环境）
  private async sendToExternalService(logEntry: LogEntry): Promise<void> {
    // 这里可以集成外部日志服务，如Sentry、LogRocket等
    // 示例：发送到Webhook或API
    try {
      const webhookUrl = process.env.ERROR_WEBHOOK_URL;
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(logEntry)
        });
      }
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }
}

// 导出单例实例
export const monitoring = MonitoringService.getInstance();

// 便捷方法
export const logError = async (message: string, context?: any, request?: NextRequest) =>
  await monitoring.log(LogLevel.ERROR, message, context, request);

export const logWarn = async (message: string, context?: any, request?: NextRequest) =>
  await monitoring.log(LogLevel.WARN, message, context, request);

export const logInfo = async (message: string, context?: any, request?: NextRequest) =>
  await monitoring.log(LogLevel.INFO, message, context, request);

export const logDebug = async (message: string, context?: any, request?: NextRequest) =>
  await monitoring.log(LogLevel.DEBUG, message, context, request);

// 性能监控装饰器
export function withPerformanceMonitoring(
  handler: (request: NextRequest, ...args: any[]) => Promise<Response>
) {
  return async (request: NextRequest, ...args: any[]): Promise<Response> => {
    const startTime = Date.now();
    const url = request.url || 'unknown';
    const method = request.method || 'GET';
    
    try {
      const response = await handler(request, ...args);
      const responseTime = Date.now() - startTime;
      
      monitoring.recordPerformance(
        url,
        method,
        response.status,
        responseTime,
        request
      );
      
      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      monitoring.recordPerformance(
        url,
        method,
        500,
        responseTime,
        request
      );
      
      await logError('Request failed', {
        url,
        method,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      }, request);
      
      throw error;
    }
  };
}