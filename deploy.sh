#!/usr/bin/env bash
set -e

SSH_KEY="/Users/jundong/Documents/FREEAI/Dev/Test.pem"
SSH_USER="ubuntu"
SSH_HOST="16.176.4.114"
REMOTE_ROOT="/home/ubuntu/apps/Passport_OCR"

# 1) 同步（根目录，但排除会产生数据的目录）
rsync -avz \
  --delete \
  --exclude ".git" \
  --exclude ".DS_Store" \
  --exclude "node_modules" \
  --exclude "backend/uploads/**" \
  --exclude "backend/logs/**" \
  -e "ssh -i ${SSH_KEY}" \
  ./ "${SSH_USER}@${SSH_HOST}:${REMOTE_ROOT}/"

# 2) 远端安装/构建/重启（分别处理 backend & frontend）
ssh -i "${SSH_KEY}" "${SSH_USER}@${SSH_HOST}" << 'EOF'
set -e
export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd /home/ubuntu/apps/Passport_OCR/backend
[ -f package-lock.json ] && npm ci --only=production || npm i --production

cd ../frontend
[ -f package-lock.json ] && npm ci || npm i
npm run build

# 后端热更新（存在则重启，不存在则启动）
pm2 describe passport-ocr-api >/dev/null 2>&1 && \
  pm2 restart passport-ocr-api || \
  pm2 start /home/ubuntu/apps/Passport_OCR/backend/server.js --name passport-ocr-api

# 前端静态服务热更新
pm2 describe passport-ocr-web >/dev/null 2>&1 && \
  pm2 restart passport-ocr-web || \
  pm2 start "npx serve -s /home/ubuntu/apps/Passport_OCR/frontend/build -l 4011" --name passport-ocr-web

pm2 save
EOF

echo "✅ 部署完成（后端:4010 / 前端:4011）"