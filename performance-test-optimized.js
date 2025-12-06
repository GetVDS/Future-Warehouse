const { performance } = require('perf_hooks');

// 测试API响应时间
async function testAPIPerformance() {
  console.log('🚀 开始性能测试...\n');
  
  const tests = [
    { name: '健康检查', url: 'http://localhost:3001/api/health' },
    { name: '确保管理员', url: 'http://localhost:3001/api/ensure-admin', method: 'POST' },
    { name: '认证检查', url: 'http://localhost:3001/api/auth/me' },
    { name: '首页加载', url: 'http://localhost:3001/' },
  ];
  
  for (const test of tests) {
    console.log(`📊 测试 ${test.name}...`);
    const times = [];
    
    // 进行5次测试取平均值
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      
      try {
        const response = await fetch(test.url, {
          method: test.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        const end = performance.now();
        const time = end - start;
        times.push(time);
        
        console.log(`  第${i + 1}次: ${time.toFixed(2)}ms (状态: ${response.status})`);
        
        // 避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.log(`  第${i + 1}次: 错误 - ${error.message}`);
      }
    }
    
    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      console.log(`  ✅ 平均响应时间: ${avgTime.toFixed(2)}ms`);
      console.log(`  📈 最快: ${minTime.toFixed(2)}ms, 最慢: ${maxTime.toFixed(2)}ms\n`);
    } else {
      console.log(`  ❌ 所有请求都失败了\n`);
    }
  }
  
  console.log('🎯 性能测试完成！');
  
  // 检查内存使用情况
  const memUsage = process.memoryUsage();
  console.log('\n💾 内存使用情况:');
  console.log(`  RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  External: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);
}

// 运行测试
testAPIPerformance().catch(console.error);