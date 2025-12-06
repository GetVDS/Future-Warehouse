# 智慧库存管理系统 - 部署文件说明

本目录包含了智慧库存管理系统在Ubuntu服务器上部署所需的所有文件和脚本。

## 文件说明

### 1. 部署指南
- **UBUNTU_DEPLOYMENT_GUIDE.md** - 极其详细的Ubuntu服务器部署指南，包含从零开始到上线的完整流程

### 2. 部署脚本
- **deploy.sh** - 自动化部署脚本，一键完成所有部署步骤
- **cleanup-for-production.sh** - 生产环境清理脚本
- **backup.sh** - 数据备份脚本
- **restore.sh** - 数据恢复脚本

### 3. 配置文件
- **production-docker-compose.yml** - 生产环境Docker Compose配置模板

## 快速开始

### 1. 准备服务器
确保您有一台Ubuntu 20.04或更高版本的服务器，并且：
- 具有sudo权限的非root用户
- 已配置SSH密钥认证
- 域名已解析到服务器IP

### 2. 上传文件
将整个项目目录上传到服务器：

```bash
# 方式1：使用git克隆
git clone https://github.com/your-username/inventory-system.git

# 方式2：使用scp上传
scp -r /path/to/local/inventory-system/* yourusername@your-server-ip:/opt/apps/inventory-system/
```

### 3. 运行部署脚本

```bash
# 进入项目目录
cd /opt/apps/inventory-system

# 运行部署脚本
./deploy.sh
```

部署脚本会自动完成以下操作：
- 系统更新和基础工具安装
- Docker和Nginx安装配置
- 防火墙和安全设置
- SSL证书获取和配置
- 应用容器化部署
- 性能优化和监控配置

### 4. 验证部署

部署完成后，您可以通过以下方式验证：

```bash
# 检查服务状态
docker-compose ps

# 查看应用日志
docker-compose logs -f app

# 检查网站访问
curl -I https://yourdomain.com
```

## 常用命令

### 服务管理
```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f [app|nginx]
```

### 备份和恢复
```bash
# 创建备份
./backup.sh

# 恢复数据
./restore.sh <TIMESTAMP>

# 查看可用备份
ls -la backups/
```

### 监控和维护
```bash
# 查看系统资源
htop

# 查看磁盘使用
df -h

# 查看内存使用
free -h

# 查看网络连接
netstat -tulpn
```

## 安全注意事项

1. **定期更新系统**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **监控日志文件**
   ```bash
   # 应用日志
   tail -f /opt/apps/inventory-system/logs/app.log
   
   # Nginx日志
   tail -f /var/log/nginx/access.log
   ```

3. **定期备份数据**
   ```bash
   # 设置定时备份
   crontab -e
   
   # 添加每日备份任务（凌晨3点）
   0 3 * * * /opt/apps/inventory-system/backup.sh
   ```

4. **检查SSL证书有效期**
   ```bash
   openssl x509 -in /etc/nginx/ssl/certificate.crt -noout -dates
   ```

## 故障排查

### 502 Bad Gateway错误专门解决方案

如果遇到502 Bad Gateway错误，请使用专门的故障排除脚本：

```bash
# 进入部署目录
cd /opt/apps/inventory-system

# 运行故障排除脚本
./troubleshoot-deployment.sh check

# 如果问题仍然存在，尝试自动修复
./troubleshoot-deployment.sh fix
```

#### 手动故障排除步骤

1. **检查容器状态**
   ```bash
   docker compose ps
   ```

2. **检查容器日志**
   ```bash
   docker compose logs app --tail=50
   docker compose logs nginx --tail=50
   ```

3. **测试网络连接**
   ```bash
   # 测试nginx到app容器的连接
   docker compose exec nginx wget -q --spider http://app:3000/api/health
   
   # 测试应用容器健康状态
   docker compose exec app curl -f http://localhost:3000/api/health
   ```

4. **重启服务**
   ```bash
   docker compose down
   sleep 10
   docker compose up -d
   ```

### 常见问题及解决方案

1. **容器无法启动**
   ```bash
   # 查看容器日志
   docker compose logs app
   
   # 检查容器状态
   docker compose ps
   
   # 重启容器
   docker compose restart app
   ```

2. **网站无法访问**
   ```bash
   # 检查Nginx配置
   sudo nginx -t
   
   # 查看Nginx错误日志
   sudo tail -f /var/log/nginx/error.log
   
   # 重启Nginx
   sudo systemctl restart nginx
   ```

3. **SSL证书问题**
   ```bash
   # 检查证书状态
   sudo certbot certificates
   
   # 手动续期
   sudo certbot renew
   
   # 强制重新获取
   sudo certbot --force-renewal
   ```

4. **数据库问题**
   ```bash
   # 检查数据库文件权限
   ls -la db/custom.db
   
   # 重新生成Prisma客户端
   docker compose exec app npx prisma generate
   
   # 检查数据库连接
   docker compose exec app npx prisma db pull
   ```

5. **端口冲突**
   ```bash
   # 查看端口占用情况
   sudo netstat -tlnp | grep -E ':(80|443|3000)'
   
   # 停止冲突的服务
   sudo systemctl stop nginx  # 如果系统nginx正在运行
   ```

6. **应用容器健康检查失败**
   ```bash
   # 检查应用是否正常运行
   docker compose exec app curl -f http://localhost:3000/api/health
   
   # 如果健康检查失败，重建应用容器
   docker compose up -d --build --force-recreate app
   ```

## 性能优化建议

1. **系统级优化**
   - 定期清理不必要的软件包
   - 优化内核参数
   - 使用SSD存储
   - 配置适当的交换空间

2. **应用级优化**
   - 启用Gzip压缩
   - 配置适当的缓存策略
   - 使用CDN加速静态资源
   - 优化数据库查询

3. **网络级优化**
   - 使用HTTP/2
   - 启用keep-alive连接
   - 优化TLS配置
   - 配置适当的缓存头

## 联系支持

如果在部署过程中遇到问题，请：

1. 首先查看详细的部署指南：`UBUNTU_DEPLOYMENT_GUIDE.md`
2. 检查相关日志文件获取错误信息
3. 参考本文档的故障排查部分
4. 如需进一步帮助，请联系技术支持

## 更新和维护

建议定期执行以下维护任务：

1. **每月**：
   - 更新系统软件包
   - 更新Docker镜像
   - 检查安全更新

2. **每周**：
   - 检查磁盘空间使用情况
   - 查看应用错误日志
   - 验证备份完整性

3. **每日**：
   - 监控应用性能
   - 检查服务运行状态
   - 自动备份重要数据

通过遵循这些指南和建议，您可以确保智慧库存管理系统的稳定、安全运行。