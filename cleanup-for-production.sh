#!/bin/bash

# 智慧库存管理系统 - 生产环境清理脚本
echo "🧹 开始清理生产环境不需要的文件..."

# 删除开发构建文件
echo "📦 删除构建文件..."
rm -rf .next
rm -f tsconfig.tsbuildinfo

# 删除测试和开发脚本
echo "🧪 删除测试和开发脚本..."
rm -f create-simple-test-data.js
rm -f init-test-data.js
rm -f test-customer-orders.js
rm -f test-order-flow.js
rm -f performance-test.js
rm -f performance-comprehensive-test.js

# 删除开发日志
echo "📋 删除开发日志..."
rm -f dev.log

# 删除优化报告
echo "📊 删除优化报告..."
rm -f FINAL_OPTIMIZATION_SUMMARY.md
rm -f OPTIMIZATION_REPORT.md
rm -f PERFORMANCE_OPTIMIZATION_REPORT.md

# 删除示例目录
echo "📂 删除示例目录..."
rm -rf examples/
rm -rf mini-services/

# 删除备份和临时文件
echo "🗑️ 删除备份和临时文件..."
find . -name "*.bak" -delete
find . -name "*.backup" -delete
find . -name "*~" -delete
find . -name "*.swp" -delete
find . -name ".#*" -delete
find . -name "*.log" -not -path "./db/*" -delete

echo "✅ 清理完成！项目已准备好进行生产部署。"