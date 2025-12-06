#!/bin/bash

# 智慧库存管理系统 - 部署故障排除脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查Docker服务状态
check_docker_status() {
    log_info "检查Docker服务状态..."
    
    if ! systemctl is-active --quiet docker; then
        log_error "Docker服务未运行"
        sudo systemctl start docker
        log_info "Docker服务已启动"
    else
        log_info "Docker服务正在运行"
    fi
    
    # 检查Docker Compose版本
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose插件未安装或不可用"
        exit 1
    else
        log_info "Docker Compose版本: $(docker compose version --short)"
    fi
}

# 检查容器状态
check_container_status() {
    log_info "检查容器状态..."
    
    cd /opt/apps/inventory-system
    
    # 显示容器状态
    echo "容器状态:"
    docker compose ps
    
    # 检查应用容器日志
    log_info "检查应用容器日志..."
    docker compose logs app --tail=20
    
    # 检查nginx容器日志
    log_info "检查nginx容器日志..."
    docker compose logs nginx --tail=20
}

# 检查网络连接
check_network_connectivity() {
    log_info "检查网络连接..."
    
    cd /opt/apps/inventory-system
    
    # 检查网络
    echo "Docker网络:"
    docker network ls
    
    # 检查容器间连接
    log_info "测试nginx到app容器的连接..."
    if docker compose exec nginx wget -q --spider http://app:3000/api/health; then
        log_info "nginx可以连接到app容器"
    else
        log_error "nginx无法连接到app容器"
    fi
    
    # 检查应用容器健康状态
    log_info "测试应用容器健康状态..."
    if docker compose exec app curl -f http://localhost:3000/api/health; then
        log_info "应用容器健康检查通过"
    else
        log_error "应用容器健康检查失败"
    fi
}

# 检查配置文件
check_configuration() {
    log_info "检查配置文件..."
    
    cd /opt/apps/inventory-system
    
    # 检查nginx配置
    log_info "验证nginx配置..."
    if docker compose exec nginx nginx -t; then
        log_info "nginx配置语法正确"
    else
        log_error "nginx配置语法错误"
    fi
    
    # 检查环境变量
    log_info "检查环境变量..."
    docker compose exec app env | grep -E "(DATABASE_URL|NODE_ENV|JWT_SECRET|NEXTAUTH_)"
}

# 检查SSL证书
check_ssl_certificates() {
    log_info "检查SSL证书..."
    
    # 检查证书文件是否存在
    if [ -f "/etc/letsencrypt/live/your-domain.com/fullchain.pem" ]; then
        log_info "SSL证书文件存在"
        
        # 检查证书有效期
        if openssl x509 -checkend 86400 -noout -in "/etc/letsencrypt/live/your-domain.com/fullchain.pem"; then
            log_info "SSL证书有效"
        else
            log_warn "SSL证书即将过期或已过期"
        fi
    else
        log_warn "SSL证书文件不存在，可能需要替换域名"
    fi
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    
    cd /opt/apps/inventory-system
    
    # 停止所有服务
    docker compose down
    
    # 等待容器完全停止
    sleep 10
    
    # 重新启动服务
    docker compose up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    check_container_status
}

# 修复常见问题
fix_common_issues() {
    log_info "修复常见问题..."
    
    cd /opt/apps/inventory-system
    
    # 重建应用容器
    log_info "重建应用容器..."
    docker compose up -d --build --force-recreate app
    
    # 等待应用容器启动
    sleep 30
    
    # 重建nginx容器
    log_info "重建nginx容器..."
    docker compose up -d --force-recreate nginx
    
    # 等待nginx容器启动
    sleep 15
    
    log_info "服务重建完成"
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  check       检查所有服务状态"
    echo "  network     检查网络连接"
    echo "  config      检查配置文件"
    echo "  ssl         检查SSL证书"
    echo "  restart     重启所有服务"
    echo "  fix         修复常见问题"
    echo "  help        显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 check    # 检查所有服务状态"
    echo "  $0 fix      # 修复常见问题"
}

# 主函数
main() {
    case "${1:-check}" in
        check)
            check_docker_status
            check_container_status
            check_network_connectivity
            check_configuration
            check_ssl_certificates
            ;;
        network)
            check_network_connectivity
            ;;
        config)
            check_configuration
            ;;
        ssl)
            check_ssl_certificates
            ;;
        restart)
            restart_services
            ;;
        fix)
            fix_common_issues
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"