<script setup lang="ts">
/**
 * @file LoginView.vue
 * @description 用户登录/注册页面
 * 包含登录和注册双表单切换，支持记住密码、社交登录UI（占位）以及炫酷的动态背景效果。
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const themeStore = useThemeStore()
const authStore = useAuthStore()

const activeTab = ref<'login' | 'register'>('login')
const showPassword = ref(false)
// 从 localStorage 读取上次登录的用户名和密码
const username = ref(localStorage.getItem('lastUsername') || '')
const password = ref(localStorage.getItem('savedPassword') || '')
const rememberPassword = ref(!!localStorage.getItem('savedPassword'))
const loginError = ref('')

// 注册表单
const regUsername = ref('')
const regName = ref('')
const regEmail = ref('')
const regPhone = ref('')
const regPassword = ref('')
const regConfirmPassword = ref('')
const registerError = ref('')

function togglePassword() {
  showPassword.value = !showPassword.value
}

async function handleLogin() {
  loginError.value = ''
  
  const success = await authStore.login({
    username: username.value,
    password: password.value
  })
  
  if (success) {
    // 保存用户名到 localStorage
    localStorage.setItem('lastUsername', username.value)
    // 如果勾选了记住密码，保存密码
    if (rememberPassword.value) {
      localStorage.setItem('savedPassword', password.value)
    } else {
      localStorage.removeItem('savedPassword')
    }
    router.push('/dashboard')
  } else {
    loginError.value = authStore.error || '登录失败'
  }
}

async function handleRegister() {
  registerError.value = ''
  
  // 表单验证
  if (!regUsername.value.trim()) {
    registerError.value = '请输入用户名'
    return
  }
  if (!regName.value.trim()) {
    registerError.value = '请输入姓名'
    return
  }
  
  // 校验邮箱格式（如果有输入）
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (regEmail.value && !emailRegex.test(regEmail.value)) {
    registerError.value = '邮箱格式不正确'
    return
  }

  // 校验手机号格式（如果有输入）
  const phoneRegex = /^1[3-9]\d{9}$/
  if (regPhone.value && !phoneRegex.test(regPhone.value)) {
    registerError.value = '手机号格式不正确'
    return
  }

  if (!regPassword.value) {
    registerError.value = '请输入密码'
    return
  }
  if (regPassword.value.length < 6) {
    registerError.value = '密码至少6位'
    return
  }
  if (regPassword.value !== regConfirmPassword.value) {
    registerError.value = '两次密码输入不一致'
    return
  }
  
  const success = await authStore.register({
    username: regUsername.value,
    name: regName.value,
    email: regEmail.value,
    phone: regPhone.value,
    password: regPassword.value
  })
  
  if (success) {
    // 注册成功，切换到登录
    activeTab.value = 'login'
    username.value = regUsername.value
    // 清空注册表单
    regUsername.value = ''
    regName.value = ''
    regEmail.value = ''
    regPhone.value = ''
    regPassword.value = ''
    regConfirmPassword.value = ''
  } else {
    registerError.value = authStore.error || '注册失败'
  }
}
</script>

<template>
  <div class="login-wrapper">
    <!-- 动态背景 -->
    <div class="login-background"></div>

    <!-- 浮动装饰 -->
    <div class="floating-shapes">
      <div class="shape"></div>
      <div class="shape"></div>
      <div class="shape"></div>
      <div class="shape"></div>
    </div>

    <!-- 返回按钮 -->
    <!-- <router-link to="/" class="back-btn">
      <i class="ri-arrow-left-line"></i>
      返回首页
    </router-link> -->
    <!-- 既然 Login 是单独页面，通常不返回首页 unless home is public. Here / is dashboard protected -->

    <!-- 主题切换 -->
    <button class="theme-toggle-btn" @click="themeStore.toggleTheme" title="切换主题">
      <i :class="themeStore.effectiveTheme === 'dark' ? 'ri-moon-line' : 'ri-sun-line'"></i>
    </button>

    <!-- 登录容器 -->
    <div class="login-container">
      <div class="login-card">
        <!-- Logo -->
        <div class="login-logo">
          <div class="login-logo-icon">
            <img src="/orange.png" alt="Orange Logo" />
          </div>
          <h1>Orange</h1>
          <p>项目收款管理系统</p>
        </div>

        <!-- 表单标签 -->
        <div class="form-tabs">
          <button
            class="form-tab"
            :class="{ active: activeTab === 'login' }"
            @click="activeTab = 'login'"
          >登录</button>
          <button
            class="form-tab"
            :class="{ active: activeTab === 'register' }"
            @click="activeTab = 'register'"
          >注册</button>
        </div>

        <!-- 登录表单 -->
        <div v-if="activeTab === 'login'" class="form-panel active-panel">
          <form @submit.prevent="handleLogin">
            <div class="input-group">
              <label>用户名 / 邮箱 / 手机号</label>
              <div class="input-wrapper">
                <input v-model="username" type="text" placeholder="请输入用户名或邮箱" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off">
                <i class="ri-mail-line"></i>
              </div>
            </div>

            <div class="input-group">
              <label>密码</label>
              <div class="input-wrapper">
                <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="请输入密码" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off">
                <i class="ri-lock-line"></i>
                <button type="button" class="password-toggle" @click="togglePassword">
                  <i :class="showPassword ? 'ri-eye-line' : 'ri-eye-off-line'"></i>
                </button>
              </div>
            </div>

            <div class="form-options">
              <label class="remember-me">
                <input v-model="rememberPassword" type="checkbox">
                <span>记住密码</span>
              </label>
            </div>

            <div v-if="loginError" class="login-error">{{ loginError }}</div>

            <button type="submit" class="btn-primary-login" :disabled="authStore.loading">
              {{ authStore.loading ? '登录中...' : '登录' }}
            </button>
          </form>

          <div class="divider"><span>或</span></div>

          <div class="social-login">
            <button class="social-btn wechat">
              <i class="ri-wechat-fill"></i>
              微信
            </button>
            <button class="social-btn apple">
              <i class="ri-apple-fill"></i>
              Apple
            </button>
          </div>
        </div>

        <!-- 注册表单 -->
        <div v-if="activeTab === 'register'" class="form-panel active-panel">
          <form @submit.prevent="handleRegister">
            <div class="input-group">
              <label>用户名<span class="required">*</span></label>
              <div class="input-wrapper">
                <input v-model="regUsername" type="text" placeholder="请输入用户名" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off">
                <i class="ri-user-settings-line"></i>
              </div>
            </div>

            <div class="input-group">
              <label>姓名<span class="required">*</span></label>
              <div class="input-wrapper">
                <input v-model="regName" type="text" placeholder="请输入您的姓名" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off">
                <i class="ri-user-line"></i>
              </div>
            </div>

            <div class="input-group">
              <label>邮箱</label>
              <div class="input-wrapper">
                <input v-model="regEmail" type="email" placeholder="请输入邮箱地址" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off">
                <i class="ri-mail-line"></i>
              </div>
            </div>

            <div class="input-group">
              <label>手机号</label>
              <div class="input-wrapper">
                <input v-model="regPhone" type="tel" placeholder="请输入手机号码" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off">
                <i class="ri-phone-line"></i>
              </div>
            </div>

            <div class="input-group">
              <label>密码<span class="required">*</span></label>
              <div class="input-wrapper">
                <input v-model="regPassword" type="password" placeholder="请设置密码（至少6位）" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off">
                <i class="ri-lock-line"></i>
              </div>
            </div>

            <div class="input-group">
              <label>确认密码<span class="required">*</span></label>
              <div class="input-wrapper">
                <input v-model="regConfirmPassword" type="password" placeholder="请再次输入密码" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off">
                <i class="ri-lock-line"></i>
              </div>
            </div>

            <div v-if="registerError" class="login-error">{{ registerError }}</div>

            <button type="submit" class="btn-primary-login" :disabled="authStore.loading">
              {{ authStore.loading ? '注册中...' : '创建账号' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  position: relative;
  /* Ensure it sits on top of any global background if overlapping, though router view replacement handles this */
}

/* 动态背景 */
.login-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: linear-gradient(135deg, #FFF8E1 0%, #FFE0B2 50%, #FFCC80 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

.login-background::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 20% 30%, rgba(255, 255, 255, 0.3) 0%, transparent 50%),
    radial-gradient(ellipse 60% 40% at 80% 70%, rgba(255, 200, 100, 0.2) 0%, transparent 50%);
  pointer-events: none;
}

:global([data-theme="dark"]) .login-background {
  background: linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 50%, #3A3A3C 100%);
}

:global([data-theme="dark"]) .login-background::before {
  background:
    radial-gradient(ellipse 80% 50% at 20% 30%, rgba(255, 159, 10, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse 60% 40% at 80% 70%, rgba(255, 69, 58, 0.1) 0%, transparent 50%);
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* 浮动装饰元素 */
.floating-shapes {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.shape {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  animation: float 20s ease-in-out infinite;
}

.shape:nth-child(1) {
  width: 300px;
  height: 300px;
  top: -100px;
  left: -100px;
  animation-delay: 0s;
}

.shape:nth-child(2) {
  width: 200px;
  height: 200px;
  top: 50%;
  right: -50px;
  animation-delay: -5s;
}

.shape:nth-child(3) {
  width: 150px;
  height: 150px;
  bottom: -50px;
  left: 30%;
  animation-delay: -10s;
}

.shape:nth-child(4) {
  width: 100px;
  height: 100px;
  top: 30%;
  left: 10%;
  animation-delay: -15s;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-20px) rotate(5deg); }
  50% { transform: translateY(0) rotate(0deg); }
  75% { transform: translateY(20px) rotate(-5deg); }
}

/* 登录容器 */
.login-container {
  width: 100%;
  max-width: 440px;
  padding: 0;
  z-index: 1;
}

/* 登录卡片 - Liquid Glass 效果 */
.login-card {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset,
    0 -20px 40px rgba(255, 255, 255, 0.1) inset;
  padding: 40px 36px;
  position: relative;
  overflow: visible;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.login-card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 12px 48px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.15) inset,
    0 -20px 40px rgba(255, 255, 255, 0.15) inset;
}

.login-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, transparent 100%);
  border-radius: 24px 24px 0 0;
  pointer-events: none;
}

:global([data-theme="dark"]) .login-card {
  background: rgba(30, 30, 35, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
    0 -20px 40px rgba(255, 255, 255, 0.03) inset;
}

:global([data-theme="dark"]) .login-card::before {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, transparent 100%);
}

/* Logo 区域 */
.login-logo {
  text-align: center;
  margin-bottom: 24px;
}

.login-logo-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  transition: transform 0.3s ease;
}

.login-logo-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 8px 16px rgba(255, 159, 10, 0.3));
}

.login-logo-icon:hover {
  transform: scale(1.05) rotate(3deg);
}

.login-logo h1 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
  letter-spacing: -0.5px;
}

.login-logo p {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 表单标签切换 */
.form-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
  padding: 3px;
  margin-bottom: 20px;
}

:global([data-theme="dark"]) .form-tabs {
  background: rgba(255, 255, 255, 0.08);
}

.form-tab {
  flex: 1;
  padding: 10px 16px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.form-tab.active {
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:global([data-theme="dark"]) .form-tab.active {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.form-tab:hover:not(.active) {
  color: var(--text-primary);
}

/* Input Styles */
.input-group {
  margin-bottom: 16px;
}

.input-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.input-group label .required {
  color: #ef4444;
  margin-left: 2px;
}

.input-wrapper {
  position: relative;
}

.input-wrapper i {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  color: var(--text-tertiary, rgba(60, 60, 67, 0.3));
  transition: color 0.2s ease;
}

.input-wrapper input {
  width: 100%;
  padding: 12px 44px 12px 44px; /* Increased right padding for icon */
  font-size: 14px;
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  outline: none;
  transition: all 0.2s ease;
}

:global([data-theme="dark"]) .input-wrapper input {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.input-wrapper input:focus {
  background: rgba(255, 255, 255, 0.9);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(255, 159, 10, 0.15);
}

:global([data-theme="dark"]) .input-wrapper input:focus {
  background: rgba(255, 255, 255, 0.12);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(255, 159, 10, 0.2);
}

.password-toggle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary, rgba(60, 60, 67, 0.3));
  font-size: 18px;
  border-radius: 0 10px 10px 0;
  transition: color 0.2s;
}

.password-toggle:hover {
  color: var(--text-secondary);
}

/* Options */
.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.remember-me span {
  font-size: 13px;
  color: var(--text-secondary);
}

.forgot-password {
  font-size: 13px;
  color: var(--color-primary);
  text-decoration: none;
}

:global([data-theme="dark"]) .forgot-password {
  color: var(--color-primary);
}

/* Button */
.btn-primary-login {
  width: 100%;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #FF9F0A 0%, #FF6B00 100%);
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.btn-primary-login:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(255, 159, 10, 0.35);
}

.btn-primary-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-error {
  color: #ef4444;
  font-size: 13px;
  text-align: center;
  margin-bottom: 16px;
  padding: 8px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
}

.divider {
  display: flex;
  align-items: center;
  margin: 28px 0;
  color: var(--text-tertiary, rgba(60, 60, 67, 0.3));
  font-size: 13px;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(0, 0, 0, 0.08);
}

:global([data-theme="dark"]) .divider::before,
:global([data-theme="dark"]) .divider::after {
  background: rgba(255, 255, 255, 0.1);
}

.divider span {
  padding: 0 16px;
}

.social-login {
  display: flex;
  gap: 12px;
}

.social-btn {
  flex: 1;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

:global([data-theme="dark"]) .social-btn {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.social-btn:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}

.social-btn.wechat i { color: #07C160; }
.social-btn.apple i { color: #000; }
:global([data-theme="dark"]) .social-btn.apple i { color: #fff; }

.theme-toggle-btn {
  position: fixed;
  top: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
}

.theme-toggle-btn:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.35);
}

:global([data-theme="dark"]) .theme-toggle-btn {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
}

:global([data-theme="dark"]) .theme-toggle-btn i {
  color: #fff;
}


</style>
