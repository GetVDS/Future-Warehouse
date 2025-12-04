import { NextRequest, NextResponse } from 'next/server';
import { BackupService, autoBackup } from '@/lib/backup';
import { withAuth, createSuccessResponse, createErrorResponse } from '@/lib/api-auth';
import { logInfo, logError } from '@/lib/monitoring';

// 获取备份列表
export async function GET(request: NextRequest) {
  return withAuth(async (request: NextRequest) => {
    try {
      const backupList = await BackupService.getBackupList();
      
      logInfo('Backup list retrieved', { 
        count: backupList.length 
      });
      
      return createSuccessResponse({ 
        backups: backupList 
      });
    } catch (error) {
      logError('Failed to get backup list', error);
      return createErrorResponse('获取备份列表失败', 500);
    }
  })(request);
}

// 创建备份
export async function POST(request: NextRequest) {
  return withAuth(async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { 
        includeData = true, 
        includeSchema = true, 
        compressionLevel = 6,
        encrypt = false,
        encryptionKey 
      } = body;
      
      // 验证压缩级别
      if (compressionLevel < 0 || compressionLevel > 9) {
        return createErrorResponse('压缩级别必须在0-9之间', 400);
      }
      
      // 如果需要加密，验证加密密钥
      if (encrypt && !encryptionKey) {
        return createErrorResponse('加密备份需要提供加密密钥', 400);
      }
      
      const backupPath = await BackupService.createBackup({
        includeData,
        includeSchema,
        compressionLevel,
        encrypt,
        encryptionKey
      });
      
      logInfo('Backup created successfully', { 
        backupPath,
        options: { includeData, includeSchema, compressionLevel, encrypt }
      });
      
      return createSuccessResponse({ 
        message: '备份创建成功',
        backupPath: backupPath.split('/').pop() // 只返回文件名
      });
    } catch (error) {
      logError('Failed to create backup', error);
      return createErrorResponse('创建备份失败', 500);
    }
  })(request);
}

// 删除备份
export async function DELETE(request: NextRequest) {
  return withAuth(async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const fileName = searchParams.get('fileName');
      
      if (!fileName) {
        return createErrorResponse('缺少备份文件名参数', 400);
      }
      
      // 验证文件名格式，防止路径遍历攻击
      if (!fileName.match(/^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{3}\d{3}Z\.sql$/)) {
        return createErrorResponse('无效的备份文件名', 400);
      }
      
      const backupPath = `./backups/${fileName}`;
      await BackupService.deleteBackup(backupPath);
      
      logInfo('Backup deleted successfully', { fileName });
      
      return createSuccessResponse({ 
        message: '备份删除成功',
        fileName
      });
    } catch (error) {
      logError('Failed to delete backup', error);
      return createErrorResponse('删除备份失败', 500);
    }
  })(request);
}

// 恢复备份
export async function PUT(request: NextRequest) {
  return withAuth(async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { fileName, encryptionKey, overwriteExisting = false } = body;
      
      if (!fileName) {
        return createErrorResponse('缺少备份文件名参数', 400);
      }
      
      // 验证文件名格式，防止路径遍历攻击
      if (!fileName.match(/^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{3}\d{3}Z\.sql$/)) {
        return createErrorResponse('无效的备份文件名', 400);
      }
      
      const backupPath = `./backups/${fileName}`;
      
      // 检查备份文件是否存在
      const backupList = await BackupService.getBackupList();
      const backupExists = backupList.some(backup => backup.name === fileName);
      
      if (!backupExists) {
        return createErrorResponse('备份文件不存在', 404);
      }
      
      await BackupService.restoreFromBackup(backupPath, {
        overwriteExisting,
        validateData: true,
        encryptionKey
      });
      
      logInfo('Backup restored successfully', { 
        fileName,
        overwriteExisting
      });
      
      return createSuccessResponse({ 
        message: '备份恢复成功',
        fileName
      });
    } catch (error) {
      logError('Failed to restore backup', error);
      return createErrorResponse('恢复备份失败', 500);
    }
  })(request);
}

// 启动/停止自动备份
export async function PATCH(request: NextRequest) {
  return withAuth(async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { action, intervalHours = 24 } = body;
      
      if (action === 'start') {
        // 验证间隔时间
        if (intervalHours < 1 || intervalHours > 168) { // 1小时到7天
          return createErrorResponse('自动备份间隔必须在1-168小时之间', 400);
        }
        
        const intervalMs = intervalHours * 60 * 60 * 1000;
        autoBackup.startAutoBackup(intervalMs);
        
        logInfo('Auto backup started', { intervalHours });
        
        return createSuccessResponse({ 
          message: '自动备份已启动',
          intervalHours
        });
      } else if (action === 'stop') {
        autoBackup.stopAutoBackup();
        
        logInfo('Auto backup stopped');
        
        return createSuccessResponse({ 
          message: '自动备份已停止'
        });
      } else {
        return createErrorResponse('无效的操作，必须是start或stop', 400);
      }
    } catch (error) {
      logError('Failed to control auto backup', error);
      return createErrorResponse('自动备份操作失败', 500);
    }
  })(request);
}