// 认证工具类

const AUTH_TOKEN_KEY = 'passport_auth_token';
const USER_INFO_KEY = 'passport_user_info';

class AuthService {
  // 保存token和用户信息
  setAuth(token, userInfo) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
  }

  // 获取token
  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  // 获取用户信息
  getUserInfo() {
    const userInfo = localStorage.getItem(USER_INFO_KEY);
    return userInfo ? JSON.parse(userInfo) : null;
  }

  // 检查是否已登录
  isAuthenticated() {
    return !!this.getToken();
  }

  // 检查是否是管理员
  isAdmin() {
    const userInfo = this.getUserInfo();
    return userInfo && userInfo.role === 'admin';
  }

  // 检查是否是销售人员
  isSalesperson() {
    const userInfo = this.getUserInfo();
    return userInfo && userInfo.role === 'salesperson';
  }

  // 清除认证信息
  clearAuth() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
  }

  // 获取请求头（包含Authorization）
  getAuthHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // 登录
  async login(email, password) {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3060/api'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '登录失败');
      }

      if (data.success) {
        this.setAuth(data.data.token, data.data.user);
        return data.data;
      } else {
        throw new Error(data.error || '登录失败');
      }
    } catch (error) {
      throw error;
    }
  }

  // 退出登录
  async logout() {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3060/api'}/auth/logout`, {
          method: 'POST',
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  // 获取当前用户信息（从服务器）
  async getCurrentUser() {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3060/api'}/auth/me`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.clearAuth();
        }
        throw new Error(data.error || '获取用户信息失败');
      }

      return data.data;
    } catch (error) {
      throw error;
    }
  }

  // 修改密码
  async changePassword(oldPassword, newPassword) {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3060/api'}/auth/change-password`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '修改密码失败');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }
}

// 创建单例
const authService = new AuthService();

export default authService;