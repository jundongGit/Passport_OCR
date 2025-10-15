const emailService = require('./utils/emailService');

async function testEmailService() {
  console.log('开始测试邮件服务...\n');
  
  // 1. 测试邮件服务连接
  console.log('1. 测试SMTP连接...');
  const isConnected = await emailService.verifyConnection();
  if (isConnected) {
    console.log('✅ SMTP连接成功\n');
  } else {
    console.log('❌ SMTP连接失败\n');
    return;
  }
  
  // 2. 测试生成验证码
  console.log('2. 测试生成验证码...');
  const code = emailService.generateVerificationCode();
  console.log(`✅ 生成的验证码: ${code}\n`);
  
  // 3. 测试发送验证码邮件
  console.log('3. 测试发送验证码邮件...');
  
  // 请输入您要接收测试邮件的邮箱地址
  const testEmail = process.argv[2];
  
  if (!testEmail) {
    console.log('❌ 请提供测试邮箱地址');
    console.log('用法: node test-email.js your-email@example.com');
    return;
  }
  
  console.log(`发送验证码到: ${testEmail}`);
  console.log(`验证码: ${code}`);
  console.log('发送中...');
  
  const result = await emailService.sendVerificationCode(testEmail, code);
  
  if (result.success) {
    console.log('✅ 邮件发送成功！');
    console.log('请检查您的邮箱（包括垃圾邮件文件夹）');
  } else {
    console.log('❌ 邮件发送失败');
    console.log(`错误信息: ${result.error}`);
  }
}

// 执行测试
testEmailService().catch(error => {
  console.error('测试过程中发生错误:', error);
  process.exit(1);
});