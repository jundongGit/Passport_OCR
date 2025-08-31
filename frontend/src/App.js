import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Result, Button } from 'antd';
import zhCN from 'antd/locale/zh_CN';

// 页面组件
import LoginPage from './pages/LoginPage';
import UploadPage from './pages/UploadPage';
import TourManagement from './pages/TourManagement';
import SalespersonManagement from './pages/SalespersonManagement';
import SalesTours from './pages/SalesTours';
import SalesTourists from './pages/SalesTourists';
import OCRLogs from './pages/OCRLogs';

// 布局组件
import AdminLayout from './layouts/AdminLayout';
import SalesLayout from './layouts/SalesLayout';

// 工具组件
import ProtectedRoute from './components/ProtectedRoute';
import authService from './utils/auth';
import './App.css';

// 未授权页面
function UnauthorizedPage() {
  const handleGoBack = () => {
    const userInfo = authService.getUserInfo();
    if (userInfo?.role === 'admin') {
      window.location.href = '/admin';
    } else if (userInfo?.role === 'salesperson') {
      window.location.href = '/sales';
    } else {
      window.location.href = '/login';
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您没有权限访问此页面"
        extra={<Button type="primary" onClick={handleGoBack}>返回首页</Button>}
      />
    </div>
  );
}

// 首页重定向组件
function HomeRedirect() {
  const userInfo = authService.getUserInfo();
  
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  if (userInfo?.role === 'admin') {
    return <Navigate to="/admin/tours" replace />;
  } else if (userInfo?.role === 'salesperson') {
    return <Navigate to="/sales/tours" replace />;
  }
  
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Routes>
          {/* 公开路由 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/upload/:uploadLink" element={<UploadPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          
          {/* 管理员路由 */}
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/admin/tours" replace />} />
            <Route path="tours" element={<TourManagement />} />
            <Route path="salespersons" element={<SalespersonManagement />} />
            <Route path="ocr-logs" element={<OCRLogs />} />
          </Route>
          
          {/* 销售端路由 */}
          <Route path="/sales" element={
            <ProtectedRoute>
              <SalesLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/sales/tours" replace />} />
            <Route path="tours" element={<SalesTours />} />
            <Route path="tourists" element={<SalesTourists />} />
          </Route>
          
          {/* 首页和默认路由 */}
          <Route path="/" element={<HomeRedirect />} />
          
          {/* 404页面 */}
          <Route path="*" element={
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Result
                status="404"
                title="404"
                subTitle="抱歉，您访问的页面不存在"
                extra={<Button type="primary" onClick={() => window.location.href = '/'}>返回首页</Button>}
              />
            </div>
          } />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;