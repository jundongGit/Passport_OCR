# 护照识别系统

一个基于AI的护照识别和管理系统，支持中国、新西兰和澳大利亚护照的自动识别。

## 功能特点

- ✅ 旅游产品管理
- ✅ 游客信息管理（包含护照姓名、护照号、性别、国籍、护照有效期）
- ✅ 游客删除功能（包含护照照片文件清理）
- ✅ 护照图像质量检测（清晰度、光斑、曝光检测）
- ✅ 基于OpenAI的护照信息识别
- ✅ 支持多国护照识别
- ✅ 独立的上传链接系统
- ✅ 实时状态追踪
- ✅ 护照信息预览和编辑功能

## 技术栈

### 后端
- Node.js + Express
- MongoDB
- OpenAI API
- Sharp (图像处理)
- Multer (文件上传)

### 前端
- React
- Ant Design
- Axios
- React Router

## 安装步骤

### 1. 安装MongoDB
```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# 或者使用Docker
docker run -d -p 27017:27017 --name mongodb mongo
```

### 2. 安装后端依赖
```bash
cd backend
npm install
```

### 3. 安装前端依赖
```bash
cd frontend
npm install
```

## 配置

1. 后端配置文件 `backend/.env` 已包含必要的配置
2. 确保MongoDB运行在 `localhost:27017`
3. OpenAI API Key已配置

## 启动项目

### 启动后端服务
```bash
cd backend
npm run dev
```
服务将运行在 http://localhost:3060

### 启动前端应用
```bash
cd frontend
npm start
```
应用将运行在 http://localhost:3000

## 使用流程

1. **管理员操作**
   - 访问 http://localhost:3000/admin
   - 创建新的旅游产品
   - 进入产品管理，添加游客信息
   - 系统生成专属上传链接
   - 将链接发送给游客

2. **游客操作**
   - 打开收到的上传链接
   - 选择护照类型
   - 上传护照照片
   - 系统自动识别并验证

3. **系统处理**
   - 自动检测图像质量
   - 识别护照信息
   - 验证信息完整性
   - 保存识别结果

## API接口

### 旅游产品
- `GET /api/tours` - 获取所有产品
- `POST /api/tours` - 创建产品
- `PUT /api/tours/:id` - 更新产品
- `DELETE /api/tours/:id` - 删除产品

### 游客管理
- `POST /api/tourists` - 添加游客
- `GET /api/tourists/tour/:tourId` - 获取某产品的所有游客
- `GET /api/tourists/link/:uploadLink` - 通过上传链接获取游客信息

### 护照上传
- `POST /api/upload/passport/:uploadLink` - 上传护照
- `GET /api/upload/status/:uploadLink` - 查询上传状态

## 注意事项

1. 确保上传的护照照片清晰、完整
2. 避免照片中出现反光或阴影
3. 支持的图片格式：JPG、PNG
4. 文件大小限制：10MB

## 问题排查

1. **MongoDB连接失败**
   - 确认MongoDB服务已启动
   - 检查连接字符串是否正确

2. **OpenAI API错误**
   - 检查API Key是否有效
   - 确认网络连接正常

3. **图片上传失败**
   - 检查uploads目录权限
   - 确认图片格式和大小符合要求