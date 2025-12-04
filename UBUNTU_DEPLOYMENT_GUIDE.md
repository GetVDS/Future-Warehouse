# Ubuntu服务器完整部署指南 - 智慧库存管理系统

## 目录
1. [服务器初始环境配置](#1-服务器初始环境配置)
2. [基础安全设置](#2-基础安全设置)
3. [Docker安装与配置](#3-docker安装与配置)
4. [Nginx安装与配置](#4-nginx安装与配置)
5. [应用程序容器化部署](#5-应用程序容器化部署)
6. [域名绑定与SSL证书配置](#6-域名绑定与ssl证书配置)
7. [HTTPS设置与安全加固](#7-https设置与安全加固)
8. [性能优化配置](#8-性能优化配置)
9. [监控与日志配置](#9-监控与日志配置)
10. [常见问题排查与解决方案](#10-常见问题排查与解决方案)

---

## 1. 服务器初始环境配置

### 1.1 系统更新

首先更新系统包到最新版本：

```bash
# 更新软件包列表
sudo apt update

# 升级已安装的软件包
sudo apt upgrade -y

# 安装必要的系统工具
sudo apt install -y curl wget git vim htop unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

**预期结果**: 系统所有包更新到最新版本，基础工具安装完成。

### 1.2 设置时区和时间同步

```bash
# 设置时区为上海时间
sudo timedatectl set-timezone Asia/Shanghai

# 安装并启用NTP时间同步
sudo apt install -y ntp
sudo systemctl enable ntp
sudo systemctl start ntp

# 验证时间同步状态
sudo timedatectl status
```

**预期结果**: 系统时间正确设置为亚洲/上海时区，NTP服务正在运行。

### 1.3 创建部署用户

```bash
# 创建新的部署用户（替换yourusername为您想要的用户名）
sudo adduser yourusername

# 将用户添加到sudo组
sudo usermod -aG sudo yourusername

# 切换到新用户
su - yourusername
```

**预期结果**: 成功创建新用户并添加到sudo组，可以执行管理员权限操作。

### 1.4 配置SSH密钥认证

```bash
# 在本地机器生成SSH密钥（如果还没有）
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# 将公钥复制到服务器
ssh-copy-id yourusername@your-server-ip

# 测试SSH连接
ssh yourusername@your-server-ip
```

**预期结果**: 可以通过SSH密钥无密码登录服务器。

### 1.5 禁用密码登录（可选但推荐）

```bash
# 编辑SSH配置文件
sudo vim /etc/ssh/sshd_config

# 找到并修改以下行：
PasswordAuthentication no
ChallengeResponseAuthentication no
UsePAM no

# 重启SSH服务
sudo systemctl restart sshd
```

**预期结果**: SSH只允许密钥认证，提高安全性。

---

## 2. 基础安全设置

### 2.1 配置防火墙

```bash
# 安装UFW防火墙
sudo apt install -y ufw

# 默认策略：拒绝所有传入连接
sudo ufw default deny incoming

# 允许所有传出连接
sudo ufw default allow outgoing

# 允许SSH连接（端口22）
sudo ufw allow ssh

# 允许HTTP和HTTPS连接
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable

# 检查防火墙状态
sudo ufw status verbose
```

**预期结果**: 防火墙启用，只允许SSH、HTTP和HTTPS连接。

### 2.2 安装fail2ban防止暴力破解

```bash
# 安装fail2ban
sudo apt install -y fail2ban

# 创建自定义配置文件
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# 编辑配置文件
sudo vim /etc/fail2ban/jail.local

# 修改以下配置：
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

```bash
# 启动fail2ban服务
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 检查状态
sudo fail2ban-client status
```

**预期结果**: fail2ban运行，会自动封禁多次失败登录尝试的IP。

### 2.3 系统安全加固

```bash
# 安装安全扫描工具
sudo apt install -y rkhunter chkrootkit

# 更新rkhunter数据库
sudo rkhunter --update --propupdate

# 运行系统安全扫描
sudo rkhunter --check --sk

# 设置自动安全更新
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# 编辑自动更新配置
sudo vim /etc/apt/apt.conf.d/50unattended-upgrades

# 添加以下内容：
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Remove-New-Unused-Config-Files "true";
```

**预期结果**: 系统安全加固，自动安全更新配置完成。

---

## 3. Docker安装与配置

### 3.1 安装Docker

```bash
# 添加Docker官方GPG密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加Docker仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 更新包索引
sudo apt update

# 安装Docker Engine
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 启动Docker服务
sudo systemctl enable docker
sudo systemctl start docker

# 将当前用户添加到docker组
sudo usermod -aG docker $USER

# 重新登录以使组更改生效
newgrp docker
```

**预期结果**: Docker安装完成，当前用户可以使用Docker命令。

### 3.2 配置Docker

```bash
# 创建Docker配置目录
sudo mkdir -p /etc/docker

# 创建Docker守护进程配置
sudo vim /etc/docker/daemon.json

# 添加以下配置：
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  },
  "live-restore": true,
  "userland-proxy": false,
  "experimental": false,
  "metrics-addr": "127.0.0.1:9323",
  "iptables": false,
  "bridge": "none",
  "ip-forward": true,
  "userland-proxy": false
}
```

```bash
# 重启Docker服务
sudo systemctl restart docker

# 验证Docker配置
docker info
```

**预期结果**: Docker配置优化，日志轮转和性能设置生效。

### 3.3 安装Docker Compose

```bash
# 下载Docker Compose最新版本
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)

# 下载Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 创建符号链接
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# 验证安装
docker-compose --version
```

**预期结果**: Docker Compose安装完成，可以正常使用。

---

## 4. Nginx安装与配置

### 4.1 安装Nginx

```bash
# 安装Nginx
sudo apt install -y nginx

# 启动Nginx服务
sudo systemctl enable nginx
sudo systemctl start nginx

# 检查Nginx状态
sudo systemctl status nginx

# 验证Nginx是否运行
curl -I http://localhost
```

**预期结果**: Nginx安装完成并正在运行，可以访问默认页面。

### 4.2 配置Nginx基础设置

```bash
# 备份原始配置
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# 创建Nginx配置目录
sudo mkdir -p /etc/nginx/conf.d
sudo mkdir -p /etc/nginx/ssl
sudo mkdir -p /var/log/nginx

# 创建主配置文件
sudo vim /etc/nginx/nginx.conf
```

**nginx.conf内容:**
```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # 基本设置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # 包含站点配置
    include /etc/nginx/conf.d/*.conf;
}
```

**预期结果**: Nginx基础配置完成，启用了Gzip压缩和优化的日志格式。

### 4.3 创建站点配置模板

```bash
# 创建站点配置目录
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled

# 创建默认站点配置
sudo vim /etc/nginx/sites-available/default
```

**default配置内容:**
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    
    root /var/www/html;
    index index.html index.htm;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # 安全头部
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/

# 测试Nginx配置
sudo nginx -t

# 重新加载Nginx配置
sudo systemctl reload nginx
```

**预期结果**: Nginx站点配置生效，可以通过HTTP访问默认页面。

---

## 5. 应用程序容器化部署

### 5.1 准备应用程序代码

```bash
# 创建应用目录
sudo mkdir -p /opt/apps/inventory-system
sudo chown $USER:$USER /opt/apps/inventory-system

# 进入应用目录
cd /opt/apps/inventory-system

# 克隆应用代码（替换为您的代码仓库）
git clone https://github.com/your-username/inventory-system.git .

# 或者上传本地代码
# scp -r /path/to/local/inventory-system/* yourusername@your-server-ip:/opt/apps/inventory-system/
```

**预期结果**: 应用程序代码复制到服务器。

### 5.2 创建生产环境变量文件

```bash
# 创建生产环境变量文件
vim .env.production
```

**.env.production内容:**
```env
# 数据库配置
DATABASE_URL="file:./db/custom.db"

# JWT密钥 - 生产环境必须使用强密钥
JWT_SECRET="your-super-secure-jwt-secret-key-here-change-this-in-production"

# 应用配置
NODE_ENV="production"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-nextauth-secret-here"

# 安全配置
SECURE_COOKIES="true"
ALLOWED_ORIGINS="https://yourdomain.com"

# 日志级别
LOG_LEVEL="error"

# 数据库路径
DATABASE_PATH="/opt/apps/inventory-system/db/custom.db"
```

**预期结果**: 生产环境变量配置完成。

### 5.3 创建生产环境Dockerfile

```bash
# 创建Dockerfile
vim Dockerfile
```

**Dockerfile内容:**
```dockerfile
# 多阶段构建 - 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 生成Prisma客户端
RUN npx prisma generate

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM node:18-alpine AS runner

WORKDIR /app

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# 创建数据库目录
RUN mkdir -p db && chown -R nextjs:nodejs db

# 设置用户
USER nextjs

# 暴露端口
EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# 启动应用
CMD ["node", "server.js"]
```

**预期结果**: 生产环境优化的Dockerfile创建完成。

### 5.4 创建Docker Compose配置

```bash
# 创建docker-compose.yml
vim docker-compose.yml
```

**docker-compose.yml内容:**
```yaml
version: '3.8'

services:
  app:
    build: 
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./db/custom.db
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    volumes:
      - ./db:/app/db
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

**预期结果**: Docker Compose配置完成，定义了应用和Nginx服务。

### 5.5 构建和启动应用

```bash
# 创建必要的目录
mkdir -p db logs nginx/conf.d nginx/ssl

# 设置目录权限
chmod 755 db logs nginx

# 构建并启动服务
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看应用日志
docker-compose logs -f app
```

**预期结果**: 应用容器构建并启动，可以通过本地端口3000访问。

---

## 6. 域名绑定与SSL证书配置

### 6.1 域名解析配置

```bash
# 编辑hosts文件（本地测试用）
sudo vim /etc/hosts

# 添加域名解析（替换为您的域名和IP）
127.0.0.1 yourdomain.com www.yourdomain.com
```

**预期结果**: 本地可以解析域名到服务器IP。

### 6.2 使用Let's Encrypt获取SSL证书

```bash
# 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取SSL证书（替换为您的域名）
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com --email your-email@example.com --agree-tos --no-eff-email

# 设置自动续期
sudo crontab -e

# 添加以下行（每天凌晨2点检查并续期）
0 2 * * * /usr/bin/certbot renew --quiet
```

**预期结果**: SSL证书获取成功，Nginx配置自动更新。

### 6.3 手动SSL证书配置（备选方案）

如果无法使用Let's Encrypt，可以使用自签名证书：

```bash
# 创建SSL目录
mkdir -p nginx/ssl

# 生成私钥
openssl genrsa -out nginx/ssl/private.key 2048

# 生成证书签名请求
openssl req -new -key nginx/ssl/private.key -out nginx/ssl/certificate.csr

# 生成自签名证书（有效期365天）
openssl x509 -req -days 365 -in nginx/ssl/certificate.csr -signkey nginx/ssl/private.key -out nginx/ssl/certificate.crt

# 设置权限
chmod 600 nginx/ssl/private.key
chmod 644 nginx/ssl/certificate.crt
```

**预期结果**: 自签名SSL证书生成完成。

---

## 7. HTTPS设置与安全加固

### 7.1 创建HTTPS Nginx配置

```bash
# 创建站点配置
vim nginx/conf.d/yourdomain.com.conf
```

**yourdomain.com.conf内容:**
```nginx
# HTTP重定向到HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS服务器
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL配置
    ssl_certificate /etc/nginx/ssl/certificate.crt;
    ssl_certificate_key /etc/nginx/ssl/private.key;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozTLS:10m;
    ssl_session_tickets off;
    
    # SSL安全设置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # 安全头部
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';";
    
    # 客户端最大请求体大小
    client_max_body_size 10M;
    
    # 代理设置
    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://app:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**预期结果**: HTTPS配置完成，所有HTTP请求重定向到HTTPS。

### 7.2 重新加载Nginx配置

```bash
# 测试Nginx配置
sudo nginx -t

# 重新加载配置
sudo nginx -s reload

# 重启Docker服务
docker-compose restart nginx
```

**预期结果**: Nginx配置重新加载，HTTPS服务生效。

---

## 8. 性能优化配置

### 8.1 系统性能优化

```bash
# 编辑系统限制
sudo vim /etc/security/limits.conf

# 添加以下内容：
* soft nofile 64000
* hard nofile 64000
root soft nofile 64000
root hard nofile 64000

# 编辑内核参数
sudo vim /etc/sysctl.conf

# 添加以下优化参数：
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = cubic
net.ipv4.tcp_no_metrics_save = 1
net.ipv4.tcp_moderate_rcvbuf = 1
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5

# 应用内核参数
sudo sysctl -p
```

**预期结果**: 系统性能参数优化生效。

### 8.2 Nginx性能优化

```bash
# 编辑Nginx配置
vim nginx/nginx.conf

# 在http块中添加性能优化配置：
worker_processes auto;
worker_connections 2048;
worker_rlimit_nofile 65535;

# 启用缓存
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:10m max_size=1g inactive=60m;
proxy_cache_key "$scheme$request_method$host$request_uri";

# 在server块中添加缓存配置：
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    proxy_cache app_cache;
    proxy_cache_valid 200 1y;
    proxy_cache_valid 404 1m;
    add_header X-Cache-Status $upstream_cache_status;
}
```

**预期结果**: Nginx性能优化，启用缓存机制。

### 8.3 Docker性能优化

```bash
# 编辑docker-compose.yml
vim docker-compose.yml

# 添加资源限制：
services:
  app:
    # ... 其他配置 ...
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

**预期结果**: Docker容器资源限制生效，防止资源耗尽。

---

## 9. 监控与日志配置

### 9.1 安装监控工具

```bash
# 安装htop和iotop
sudo apt install -y htop iotop

# 安装系统监控工具
sudo apt install -y sysstat nethogs

# 启用sysstat数据收集
sudo systemctl enable sysstat
sudo systemctl start sysstat
```

**预期结果**: 系统监控工具安装完成。

### 9.2 配置日志轮转

```bash
# 创建logrotate配置
sudo vim /etc/logrotate.d/inventory-system
```

**logrotate配置内容:**
```
/opt/apps/inventory-system/logs/app/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose restart app
    endscript
}

/var/log/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        docker-compose exec nginx nginx -s reload
    endscript
}
```

```bash
# 测试logrotate配置
sudo logrotate -d /etc/logrotate.d/inventory-system

# 设置定时任务
sudo crontab -e

# 添加以下行（每天凌晨3点执行日志轮转）
0 3 * * * /usr/sbin/logrotate /etc/logrotate.d/inventory-system
```

**预期结果**: 日志轮转配置完成，自动管理日志文件大小。

### 9.3 创建监控脚本

```bash
# 创建监控脚本
vim monitor.sh
```

**monitor.sh内容:**
```bash
#!/bin/bash

LOG_FILE="/opt/apps/inventory-system/logs/monitor.log"
ALERT_EMAIL="your-email@example.com"

# 检查服务状态
check_service() {
    local service=$1
    local url=$2
    
    if curl -f $url > /dev/null 2>&1; then
        echo "$(date): $service - 正常" >> $LOG_FILE
        return 0
    else
        echo "$(date): $service - 异常" >> $LOG_FILE
        echo "$service 服务异常，请检查！" | mail -s "服务告警" $ALERT_EMAIL
        return 1
    fi
}

# 检查磁盘空间
check_disk() {
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $usage -gt 80 ]; then
        echo "$(date): 磁盘空间不足 - 使用率: ${usage}%" >> $LOG_FILE
        echo "磁盘空间不足，使用率: ${usage}%" | mail -s "磁盘告警" $ALERT_EMAIL
    fi
}

# 检查内存使用
check_memory() {
    local usage=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
    if (( $(echo "$usage > 80" | bc -l) )); then
        echo "$(date): 内存使用过高 - 使用率: ${usage}%" >> $LOG_FILE
    fi
}

# 执行检查
check_service "应用" "http://localhost:3000/api/health"
check_service "Nginx" "http://localhost"
check_disk
check_memory

echo "$(date): 监控检查完成" >> $LOG_FILE
```

```bash
# 添加执行权限
chmod +x monitor.sh

# 设置定时监控（每5分钟执行一次）
sudo crontab -e

# 添加以下行：
*/5 * * * * /opt/apps/inventory-system/monitor.sh
```

**预期结果**: 监控脚本创建完成，定期检查系统状态。

---

## 10. 常见问题排查与解决方案

### 10.1 Docker容器问题

**问题**: 容器无法启动
```bash
# 查看容器日志
docker-compose logs app

# 检查容器状态
docker-compose ps

# 进入容器调试
docker-compose exec app sh

# 重启容器
docker-compose restart app
```

**问题**: 容器内存不足
```bash
# 查看容器资源使用
docker stats

# 增加内存限制
# 编辑docker-compose.yml，增加memory限制
```

### 10.2 Nginx问题

**问题**: 502 Bad Gateway
```bash
# 检查Nginx配置
sudo nginx -t

# 查看Nginx错误日志
sudo tail -f /var/log/nginx/error.log

# 检查上游服务状态
curl -I http://localhost:3000
```

**问题**: SSL证书问题
```bash
# 检查证书有效期
openssl x509 -in /etc/nginx/ssl/certificate.crt -noout -dates

# 重新获取证书
sudo certbot renew --force-renewal

# 检查证书链
openssl s_client -connect yourdomain.com:443
```

### 10.3 数据库问题

**问题**: 数据库连接失败
```bash
# 检查数据库文件权限
ls -la db/

# 重新生成Prisma客户端
docker-compose exec app npx prisma generate

# 检查数据库状态
docker-compose exec app npx prisma db pull
```

### 10.4 性能问题

**问题**: 应用响应慢
```bash
# 检查系统资源
htop
iotop

# 分析应用日志
docker-compose logs app | grep ERROR

# 检查网络连接
netstat -tulpn
```

### 10.5 紧急恢复流程

**问题**: 服务完全不可用
```bash
# 1. 检查系统状态
sudo systemctl status docker nginx

# 2. 重启所有服务
docker-compose down
docker-compose up -d

# 3. 检查最新备份
ls -la backups/

# 4. 如需要，恢复数据
./restore.sh latest

# 5. 通知相关人员
echo "系统恢复完成" | mail -s "系统恢复通知" your-email@example.com
```

---

## 部署检查清单

在完成部署后，请确认以下项目：

- [ ] 服务器系统更新完成
- [ ] 防火墙配置正确
- [ ] SSH安全设置完成
- [ ] Docker和Docker Compose安装
- [ ] 应用代码上传完成
- [ ] 环境变量配置正确
- [ ] SSL证书获取成功
- [ ] HTTPS重定向工作正常
- [ ] 应用可以通过域名访问
- [ ] 数据库连接正常
- [ ] 日志轮转配置完成
- [ ] 监控脚本运行正常
- [ ] 性能优化配置生效
- [ ] 备份策略制定完成

---

## 总结

本指南提供了从零开始部署智慧库存管理系统的完整流程，包括：

1. 服务器环境准备和安全加固
2. Docker容器化部署
3. Nginx反向代理和SSL配置
4. 性能优化和监控配置
5. 常见问题排查方案

按照本指南操作，即使作为Linux新手，也能够成功部署一个安全、高性能的生产环境Web应用程序。

如有任何问题，请参考第10节的故障排查指南，或联系技术支持。