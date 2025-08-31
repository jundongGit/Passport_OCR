import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../utils/auth';

// 路由保护组件
function ProtectedRoute({ children, requireAdmin = false }) {
  const location = useLocation();

  // 检查是否已登录
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 检查是否需要管理员权限
  if (requireAdmin && !authService.isAdmin()) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 检查销售人员是否试图访问管理员页面
  const userInfo = authService.getUserInfo();
  if (userInfo && userInfo.role === 'salesperson' && location.pathname.startsWith('/admin')) {
    return <Navigate to="/sales" replace />;
  }

  // 检查管理员是否试图访问销售端页面
  if (userInfo && userInfo.role === 'admin' && location.pathname.startsWith('/sales')) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

export default ProtectedRoute;