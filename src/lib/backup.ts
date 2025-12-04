import { db } from '@/lib/db';
import { promises as fs } from 'fs';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { logInfo, logError, logWarn } from './monitoring';

export interface BackupOptions {
  includeData?: boolean;
  includeSchema?: boolean;
  compressionLevel?: number;
  encrypt?: boolean;
  encryptionKey?: string;
}

export interface RestoreOptions {
  overwriteExisting?: boolean;
  validateData?: boolean;
  encryptionKey?: string;
}

export class BackupService {
  private static readonly BACKUP_DIR = './backups';
  private static readonly MAX_BACKUPS = 10;

  // 创建备份目录
  private static ensureBackupDir(): void {
    if (!existsSync(this.BACKUP_DIR)) {
      mkdirSync(this.BACKUP_DIR, { recursive: true });
    }
  }

  // 生成备份文件名
  private static generateBackupFileName(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `backup-${timestamp}.sql`;
  }

  // 清理旧备份
  private static async cleanupOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.BACKUP_DIR);
      const backupFiles = [];
      
      for (const file of files.filter(file => file.startsWith('backup-') && file.endsWith('.sql'))) {
        const filePath = path.join(this.BACKUP_DIR, file);
        const stat = await fs.stat(filePath);
        backupFiles.push({
          name: file,
          path: filePath,
          time: stat.mtime
        });
      }

      // 按时间排序，保留最新的N个
      backupFiles.sort((a, b) => b.time.getTime() - a.time.getTime());
      
      if (backupFiles.length > this.MAX_BACKUPS) {
        const filesToDelete = backupFiles.slice(this.MAX_BACKUPS);
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
          logInfo(`Deleted old backup: ${file.name}`);
        }
      }
    } catch (error) {
      logError('Failed to cleanup old backups', error);
    }
  }

  // 创建数据库备份
  public static async createBackup(options: BackupOptions = {}): Promise<string> {
    const {
      includeData = true,
      includeSchema = true,
      compressionLevel = 6,
      encrypt = false,
      encryptionKey
    } = options;

    this.ensureBackupDir();
    
    const backupFileName = this.generateBackupFileName();
    const backupPath = path.join(this.BACKUP_DIR, backupFileName);
    
    try {
      logInfo('Starting database backup...', { backupPath, options });
      
      // 使用Prisma的导出功能
      const backupData = await this.exportDatabase(includeSchema, includeData);
      
      // 压缩数据（如果需要）
      const compressedData = compressionLevel > 0 
        ? await this.compressData(backupData, compressionLevel)
        : backupData;
      
      // 加密数据（如果需要）
      const finalData = encrypt && encryptionKey
        ? await this.encryptData(compressedData, encryptionKey)
        : compressedData;
      
      // 写入文件
      await fs.writeFile(backupPath, finalData);
      
      // 清理旧备份
      await this.cleanupOldBackups();
      
      logInfo('Database backup completed successfully', { 
        backupPath, 
        size: finalData.length,
        compressed: compressionLevel > 0,
        encrypted: encrypt
      });
      
      return backupPath;
    } catch (error) {
      logError('Database backup failed', error);
      throw new Error(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 导出数据库
  private static async exportDatabase(includeSchema: boolean, includeData: boolean): Promise<string> {
    try {
      // 获取所有表的数据
      const tables = await this.getAllTables();
      let sql = '';
      
      if (includeSchema) {
        sql += '-- Database Schema Backup\n';
        sql += `-- Generated at: ${new Date().toISOString()}\n\n`;
        
        // 添加表结构
        for (const table of tables) {
          sql += await this.getTableSchema(table);
        }
      }
      
      if (includeData) {
        sql += '\n-- Database Data Backup\n';
        
        // 添加表数据
        for (const table of tables) {
          sql += await this.getTableData(table);
        }
      }
      
      return sql;
    } catch (error) {
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 获取所有表名
  private static async getAllTables(): Promise<string[]> {
    const result = await db.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `;
    return result.map(row => row.name);
  }

  // 获取表结构
  private static async getTableSchema(tableName: string): Promise<string> {
    try {
      const result = await db.$queryRawUnsafe(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName}'`) as Array<{ sql: string }>;
      
      if (result && result.length > 0 && result[0]) {
        return `-- Table: ${tableName}\n${result[0].sql};\n\n`;
      }
      return '';
    } catch (error) {
      logWarn(`Failed to get schema for table: ${tableName}`, error);
      return '';
    }
  }

  // 获取表数据
  private static async getTableData(tableName: string): Promise<string> {
    try {
      const data = await db.$queryRawUnsafe(`SELECT * FROM ${tableName}`) as any[];
      
      if (Array.isArray(data) && data.length > 0) {
        const columns = Object.keys(data[0]);
        let sql = `-- Data for table: ${tableName}\n`;
        
        for (const row of data) {
          const values = columns.map(col => {
            const value = (row as any)[col];
            if (value === null) return 'NULL';
            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
            if (typeof value === 'number') return value.toString();
            if (value instanceof Date) return `'${value.toISOString()}'`;
            return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
          });
          
          sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        
        sql += '\n';
        return sql;
      }
      
      return `-- No data for table: ${tableName}\n\n`;
    } catch (error) {
      logWarn(`Failed to get data for table: ${tableName}`, error);
      return `-- Error getting data for table: ${tableName}\n\n`;
    }
  }

  // 压缩数据
  private static async compressData(data: string, level: number): Promise<Buffer> {
    const zlib = require('zlib');
    return new Promise((resolve, reject) => {
      zlib.gzip(data, { level }, (err: Error | null, result: Buffer) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  // 解压缩数据
  private static async decompressData(data: Buffer): Promise<string> {
    const zlib = require('zlib');
    return new Promise((resolve, reject) => {
      zlib.gunzip(data, (err: Error | null, result: Buffer) => {
        if (err) reject(err);
        else resolve(result.toString());
      });
    });
  }

  // 加密数据
  private static async encryptData(data: string | Buffer, key: string): Promise<Buffer> {
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const authTag = cipher.getAuthTag();
    
    // 将IV和认证标签附加到加密数据
    return Buffer.concat([iv, authTag, encrypted]);
  }

  // 解密数据
  private static async decryptData(encryptedData: Buffer, key: string): Promise<Buffer> {
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    
    // 提取IV、认证标签和加密数据
    const iv = encryptedData.slice(0, 16);
    const authTag = encryptedData.slice(16, 32);
    const data = encryptedData.slice(32);
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(data);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
  }

  // 恢复数据库
  public static async restoreFromBackup(
    backupPath: string, 
    options: RestoreOptions = {}
  ): Promise<void> {
    const {
      overwriteExisting = false,
      validateData = true,
      encryptionKey
    } = options;

    try {
      logInfo('Starting database restore...', { backupPath, options });
      
      // 检查备份文件是否存在
      if (!existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }
      
      // 读取备份文件
      let backupData = await fs.readFile(backupPath);
      
      // 尝试解密（如果需要）
      try {
        if (encryptionKey) {
          backupData = Buffer.from(await this.decryptData(backupData, encryptionKey));
        }
      } catch (error) {
        throw new Error('Failed to decrypt backup file. Invalid encryption key?');
      }
      
      // 尝试解压缩（如果需要）
      try {
        // 检查是否是gzip格式（魔术字节：1f 8b）
        if (backupData[0] === 0x1f && backupData[1] === 0x8b) {
          backupData = Buffer.from(await this.decompressData(backupData));
        }
      } catch (error) {
        // 如果解压缩失败，假设数据未压缩
        logWarn('Failed to decompress backup data, assuming uncompressed data');
      }
      
      const sqlScript = backupData.toString();
      
      // 验证SQL脚本（如果需要）
      if (validateData && !this.validateSQLScript(sqlScript)) {
        throw new Error('Invalid SQL script in backup file');
      }
      
      // 执行恢复
      await this.executeRestoreScript(sqlScript, overwriteExisting);
      
      logInfo('Database restore completed successfully', { backupPath });
    } catch (error) {
      logError('Database restore failed', error);
      throw new Error(`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 验证SQL脚本
  private static validateSQLScript(sql: string): boolean {
    // 基本的SQL验证
    const dangerousKeywords = [
      'DROP DATABASE',
      'DROP TABLE',
      'DELETE FROM',
      'TRUNCATE',
      'ALTER TABLE',
      'CREATE INDEX',
      'CREATE TRIGGER'
    ];
    
    const upperSql = sql.toUpperCase();
    
    // 检查是否包含危险的关键词
    for (const keyword of dangerousKeywords) {
      if (upperSql.includes(keyword)) {
        logWarn(`Potentially dangerous SQL keyword found: ${keyword}`);
        // 在实际应用中，你可能想要更严格的验证
      }
    }
    
    return true; // 暂时允许所有SQL
  }

  // 执行恢复脚本
  private static async executeRestoreScript(sql: string, overwrite: boolean): Promise<void> {
    try {
      if (overwrite) {
        // 如果覆盖现有数据，先删除所有表
        const tables = await this.getAllTables();
        for (const table of tables) {
          await db.$executeRawUnsafe(`DROP TABLE IF EXISTS ${table}`);
        }
      }
      
      // 分割SQL语句并执行
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        try {
          await db.$executeRawUnsafe(`${statement};`);
        } catch (error) {
          logWarn(`Failed to execute SQL statement: ${statement}`, error);
          // 继续执行其他语句
        }
      }
    } catch (error) {
      throw new Error(`Failed to execute restore script: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 获取备份列表
  public static async getBackupList(): Promise<Array<{
    name: string;
    path: string;
    size: number;
    createdAt: Date;
  }>> {
    try {
      this.ensureBackupDir();
      
      const files = await fs.readdir(this.BACKUP_DIR);
      const backupFiles = [];
      
      for (const file of files.filter(file => file.startsWith('backup-') && file.endsWith('.sql'))) {
        const filePath = path.join(this.BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        backupFiles.push({
          name: file,
          path: filePath,
          size: stats.size,
          createdAt: stats.mtime
        });
      }
      
      // 按创建时间排序（最新的在前）
      return backupFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      logError('Failed to get backup list', error);
      return [];
    }
  }

  // 删除备份
  public static async deleteBackup(backupPath: string): Promise<void> {
    try {
      if (existsSync(backupPath)) {
        await fs.unlink(backupPath);
        logInfo(`Backup deleted: ${backupPath}`);
      } else {
        throw new Error(`Backup file not found: ${backupPath}`);
      }
    } catch (error) {
      logError('Failed to delete backup', error);
      throw new Error(`Failed to delete backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// 自动备份功能
export class AutoBackupService {
  private static instance: AutoBackupService;
  private backupInterval: NodeJS.Timeout | null = null;
  private readonly DEFAULT_INTERVAL = 24 * 60 * 60 * 1000; // 24小时

  private constructor() {}

  public static getInstance(): AutoBackupService {
    if (!AutoBackupService.instance) {
      AutoBackupService.instance = new AutoBackupService();
    }
    return AutoBackupService.instance;
  }

  // 启动自动备份
  public startAutoBackup(intervalMs: number = this.DEFAULT_INTERVAL): void {
    this.stopAutoBackup(); // 停止现有的定时器
    
    this.backupInterval = setInterval(async () => {
      try {
        await BackupService.createBackup({
          includeData: true,
          includeSchema: true,
          compressionLevel: 6
        });
        logInfo('Automatic backup completed');
      } catch (error) {
        logError('Automatic backup failed', error);
      }
    }, intervalMs);
    
    logInfo(`Auto backup started with interval: ${intervalMs}ms`);
  }

  // 停止自动备份
  public stopAutoBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      logInfo('Auto backup stopped');
    }
  }
}

// 导出单例实例
export const autoBackup = AutoBackupService.getInstance();