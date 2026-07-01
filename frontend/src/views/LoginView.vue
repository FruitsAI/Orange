<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const themeStore = useThemeStore()
const authStore = useAuthStore()

const showPassword = ref(false)
const username = ref(localStorage.getItem('lastUsername') || '')
const password = ref('')
const rememberMe = ref(!!localStorage.getItem('lastUsername'))
const loginError = ref('')

function togglePassword() {
  showPassword.value = !showPassword.value
}

async function handleLogin() {
  loginError.value = ''

  const success = await authStore.login({
    username: username.value,
    password: password.value,
  })

  if (success) {
    if (rememberMe.value) {
      localStorage.setItem('lastUsername', username.value)
    } else {
      localStorage.removeItem('lastUsername')
    }
    router.push('/dashboard')
  } else {
    loginError.value = authStore.error || '登录失败'
  }
}
</script>

<template>
  <div class="login-wrapper">
    <div class="login-background"></div>

    <div class="floating-shapes">
      <div class="shape"></div>
      <div class="shape"></div>
      <div class="shape"></div>
      <div class="shape"></div>
    </div>

    <button class="theme-toggle-btn" @click="themeStore.toggleTheme" title="切换主题">
      <i :class="themeStore.effectiveTheme === 'dark' ? 'ri-moon-line' : 'ri-sun-line'"></i>
    </button>

    <div class="login-container">
      <div class="login-card">
        <div class="login-logo">
          <div class="login-logo-icon">
            <img src="/orange.png" alt="Orange Logo" />
          </div>
          <h1>Orange</h1>
          <p>项目收款管理系统</p>
        </div>

        <div class="form-panel active-panel">
          <form @submit.prevent="handleLogin">
            <div class="input-group">
              <label>用户名 / 邮箱 / 手机号</label>
              <div class="input-wrapper">
                <input v-model="username" type="text" placeholder="请输入用户名或邮箱" spellcheck="false" autocomplete="username" autocorrect="off" autocapitalize="off">
                <i class="ri-mail-line login-icon-override"></i>
              </div>
            </div>

            <div class="input-group">
              <label>密码</label>
              <div class="input-wrapper">
                <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="请输入密码" spellcheck="false" autocomplete="current-password" autocorrect="off" autocapitalize="off">
                <i class="ri-lock-line login-icon-override"></i>
                <button type="button" class="password-toggle" @click="togglePassword">
                  <i :class="showPassword ? 'ri-eye-line' : 'ri-eye-off-line'"></i>
                </button>
              </div>
            </div>

            <div class="form-options">
              <label class="remember-me">
                <input v-model="rememberMe" type="checkbox">
                <span>记住用户名</span>
              </label>
            </div>

            <div v-if="loginError" class="login-error">{{ loginError }}</div>

            <button type="submit" class="btn-primary-login" :disabled="authStore.loading">
              {{ authStore.loading ? '登录中...' : '登录' }}
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
  overflow: hidden;
}

/* ===== 动态背景 - 多层渐变与光晕效果 ===== */
.login-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(ellipse at 20% 80%, rgba(255, 200, 100, 0.4) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(255, 159, 10, 0.3) 0%, transparent 50%),
    radial-gradient(ellipse at 40% 40%, rgba(255, 180, 80, 0.2) 0%, transparent 40%),
    linear-gradient(135deg, #FFF8E1 0%, #FFE8C8 25%, #FFE0B2 50%, #FFD4A3 75%, #FFCC80 100%);
  background-size: 200% 200%, 200% 200%, 150% 150%, 400% 400%;
  animation: complexGradientShift 20s ease-in-out infinite;
}

.login-background::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 20% 30%, rgba(255, 255, 255, 0.4) 0%, transparent 50%),
    radial-gradient(ellipse 60% 40% at 80% 70%, rgba(255, 200, 100, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  pointer-events: none;
  animation: glowPulse 8s ease-in-out infinite;
}

.login-background::after {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  opacity: 0.03;
  pointer-events: none;
}

:global([data-theme="dark"]) .login-background {
  background:
    radial-gradient(ellipse at 20% 80%, rgba(255, 159, 10, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(255, 100, 50, 0.1) 0%, transparent 50%),
    radial-gradient(ellipse at 40% 40%, rgba(255, 69, 58, 0.08) 0%, transparent 40%),
    linear-gradient(135deg, #1C1C1E 0%, #252528 25%, #2C2C2E 50%, #323236 75%, #3A3A3C 100%);
  background-size: 200% 200%, 200% 200%, 150% 150%, 400% 400%;
}

:global([data-theme="dark"]) .login-background::before {
  background:
    radial-gradient(ellipse 80% 50% at 20% 30%, rgba(255, 159, 10, 0.2) 0%, transparent 50%),
    radial-gradient(ellipse 60% 40% at 80% 70%, rgba(255, 69, 58, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.03) 0%, transparent 70%);
}

@keyframes complexGradientShift {
  0%, 100% {
    background-position: 0% 50%, 100% 50%, 50% 0%, 0% 50%;
  }
  25% {
    background-position: 50% 100%, 50% 0%, 100% 50%, 50% 100%;
  }
  50% {
    background-position: 100% 50%, 0% 50%, 50% 100%, 100% 50%;
  }
  75% {
    background-position: 50% 0%, 50% 100%, 0% 50%, 50% 0%;
  }
}

@keyframes glowPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

/* ===== 浮动装饰元素 - 升级版 ===== */
.floating-shapes {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.shape {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 200, 100, 0.1) 100%);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow:
    0 8px 32px rgba(255, 159, 10, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.shape:nth-child(1) {
  width: 400px;
  height: 400px;
  top: -150px;
  left: -150px;
  animation: floatAdvanced 25s ease-in-out infinite, shapeGlow 6s ease-in-out infinite;
}

.shape:nth-child(2) {
  width: 280px;
  height: 280px;
  top: 40%;
  right: -80px;
  animation: floatAdvanced 20s ease-in-out infinite reverse, shapeGlow 8s ease-in-out infinite 2s;
}

.shape:nth-child(3) {
  width: 200px;
  height: 200px;
  bottom: -60px;
  left: 25%;
  animation: floatAdvanced 22s ease-in-out infinite 5s, shapeGlow 7s ease-in-out infinite 1s;
}

.shape:nth-child(4) {
  width: 140px;
  height: 140px;
  top: 20%;
  left: 8%;
  animation: floatAdvanced 18s ease-in-out infinite 3s, shapeGlow 5s ease-in-out infinite 3s;
}

@keyframes floatAdvanced {
  0%, 100% {
    transform: translateY(0) rotate(0deg) scale(1);
  }
  25% {
    transform: translateY(-30px) rotate(8deg) scale(1.02);
  }
  50% {
    transform: translateY(10px) rotate(-3deg) scale(0.98);
  }
  75% {
    transform: translateY(-15px) rotate(5deg) scale(1.01);
  }
}

@keyframes shapeGlow {
  0%, 100% {
    box-shadow:
      0 8px 32px rgba(255, 159, 10, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
  50% {
    box-shadow:
      0 12px 48px rgba(255, 159, 10, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      0 0 60px rgba(255, 200, 100, 0.15);
  }
}

/* ===== 登录容器 ===== */
.login-container {
  width: 100%;
  max-width: 440px;
  padding: 0;
  z-index: 1;
  animation: containerEntrance 0.8s cubic-bezier(0.2, 0, 0, 1) forwards;
}

@keyframes containerEntrance {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ===== 登录卡片 - 升级版 Liquid Glass ===== */
.login-card {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.2) 100%);
  backdrop-filter: blur(50px) saturate(200%);
  -webkit-backdrop-filter: blur(50px) saturate(200%);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.2) inset,
    0 -20px 40px rgba(255, 255, 255, 0.15) inset,
    0 0 100px rgba(255, 159, 10, 0.08);
  padding: 44px 40px;
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.2, 0, 0, 1);
}

.login-card:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow:
    0 35px 60px -15px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.25) inset,
    0 -20px 40px rgba(255, 255, 255, 0.2) inset,
    0 0 120px rgba(255, 159, 10, 0.12);
}

/* 卡片光泽动画效果 */
.login-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 30%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 70%
  );
  animation: cardShine 8s ease-in-out infinite;
  pointer-events: none;
}

/* 卡片顶部高光 */
.login-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60%;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.5) 0%,
    rgba(255, 255, 255, 0.2) 30%,
    transparent 100%
  );
  border-radius: 28px 28px 0 0;
  pointer-events: none;
}

@keyframes cardShine {
  0%, 100% {
    transform: translateX(-100%) translateY(-100%) rotate(45deg);
  }
  50% {
    transform: translateX(100%) translateY(100%) rotate(45deg);
  }
}

:global([data-theme="dark"]) .login-card {
  background:
    linear-gradient(135deg, rgba(40, 40, 45, 0.7) 0%, rgba(30, 30, 35, 0.5) 100%);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.08) inset,
    0 -20px 40px rgba(255, 255, 255, 0.05) inset,
    0 0 100px rgba(255, 159, 10, 0.05);
}

:global([data-theme="dark"]) .login-card:hover {
  box-shadow:
    0 35px 60px -15px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.12) inset,
    0 -20px 40px rgba(255, 255, 255, 0.08) inset,
    0 0 120px rgba(255, 159, 10, 0.08);
}

:global([data-theme="dark"]) .login-card::after {
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.05) 30%,
    transparent 100%
  );
}

/* ===== Logo 区域 - 升级版动画 ===== */
.login-logo {
  text-align: center;
  margin-bottom: 28px;
  position: relative;
  z-index: 1;
}

.login-logo-icon {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 18px;
  position: relative;
  animation: logoEntrance 0.8s cubic-bezier(0.2, 0, 0, 1) 0.2s backwards;
}

/* Logo 呼吸光晕效果 */
.login-logo-icon::before {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 159, 10, 0.3) 0%, transparent 70%);
  animation: logoGlow 3s ease-in-out infinite;
  pointer-events: none;
}

.login-logo-icon::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(255, 159, 10, 0.2);
  animation: logoRing 2s ease-out infinite;
  pointer-events: none;
}

.login-logo-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 12px 24px rgba(255, 159, 10, 0.4));
  transition: all 0.4s cubic-bezier(0.2, 0, 0, 1);
  animation: logoFloat 4s ease-in-out infinite;
}

.login-logo-icon:hover img {
  transform: scale(1.08) rotate(5deg);
  filter: drop-shadow(0 16px 32px rgba(255, 159, 10, 0.5));
}

@keyframes logoEntrance {
  from {
    opacity: 0;
    transform: scale(0.5) rotate(-20deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes logoGlow {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

@keyframes logoRing {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  100% {
    transform: scale(1.3);
    opacity: 0;
  }
}

@keyframes logoFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

.login-logo h1 {
  font-size: 26px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--text-primary) 0%, #FF9F0A 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: 6px;
  letter-spacing: -0.5px;
  animation: textEntrance 0.6s cubic-bezier(0.2, 0, 0, 1) 0.4s backwards;
}

.login-logo p {
  font-size: 14px;
  color: var(--text-secondary);
  animation: textEntrance 0.6s cubic-bezier(0.2, 0, 0, 1) 0.5s backwards;
}

@keyframes textEntrance {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ===== 表单标签切换 - 升级版滑动指示器 ===== */
.form-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 14px;
  padding: 4px;
  margin-bottom: 24px;
  position: relative;
  animation: tabEntrance 0.5s cubic-bezier(0.2, 0, 0, 1) 0.6s backwards;
}

:global([data-theme="dark"]) .form-tabs {
  background: rgba(255, 255, 255, 0.06);
}

.form-tab {
  flex: 1;
  padding: 12px 20px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.2, 0, 0, 1);
  position: relative;
  z-index: 2;
  overflow: hidden;
}

/* 滑动指示器背景 */
.form-tab::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.8) 100%);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  opacity: 0;
  transform: scale(0.9);
  transition: all 0.4s cubic-bezier(0.2, 0, 0, 1);
  z-index: -1;
}

.form-tab.active {
  color: var(--text-primary);
}

.form-tab.active::before {
  opacity: 1;
  transform: scale(1);
}

/* 激活状态的橙色强调 */
.form-tab.active::after {
  content: '';
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background: linear-gradient(90deg, #FF9F0A, #FF6B00);
  border-radius: 3px;
  animation: tabIndicator 0.4s cubic-bezier(0.2, 0, 0, 1) forwards;
}

@keyframes tabIndicator {
  from {
    width: 0;
    opacity: 0;
  }
  to {
    width: 20px;
    opacity: 1;
  }
}

:global([data-theme="dark"]) .form-tab.active {
  color: #fff;
}

:global([data-theme="dark"]) .form-tab::before {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.08) 100%);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.form-tab:hover:not(.active) {
  color: var(--text-primary);
  transform: translateY(-1px);
}

:global([data-theme="dark"]) .form-tab:hover:not(.active) {
  color: rgba(255, 255, 255, 0.9);
}

@keyframes tabEntrance {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 表单面板切换动画 - 更快的动画 */
.form-panel {
  animation: panelFadeIn 0.35s cubic-bezier(0.2, 0, 0, 1);
}

@keyframes panelFadeIn {
  from {
    opacity: 0;
    transform: translateX(15px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* ===== Input Styles - 升级版交互效果 ===== */
.input-group {
  margin-bottom: 18px;
  position: relative;
  animation: inputEntrance 0.35s cubic-bezier(0.2, 0, 0, 1) backwards;
}

/* 更快的交错动画延迟 */
.input-group:nth-child(1) { animation-delay: 0.05s; }
.input-group:nth-child(2) { animation-delay: 0.1s; }
.input-group:nth-child(3) { animation-delay: 0.15s; }
.input-group:nth-child(4) { animation-delay: 0.2s; }
.input-group:nth-child(5) { animation-delay: 0.25s; }
.input-group:nth-child(6) { animation-delay: 0.3s; }
.input-group:nth-child(7) { animation-delay: 0.35s; }

@keyframes inputEntrance {
  from {
    opacity: 0;
    transform: translateX(-15px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.input-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
  transition: all 0.3s ease;
  transform-origin: left;
}

.input-group:focus-within label {
  color: #FF9F0A;
  transform: scale(1.02);
}

.input-group label .required {
  color: #ef4444;
  margin-left: 2px;
  animation: pulseRequired 2s ease-in-out infinite;
}

@keyframes pulseRequired {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.input-wrapper {
  position: relative;
}

/* Icons are now styled via global .login-icon-override class in main.css */


.input-wrapper input {
  width: 100%;
  padding: 14px 48px 14px 48px;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.5);
  border: 2px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  outline: none;
  transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
  position: relative;
  z-index: 1;
}

/* Fix password field dots becoming squares */
.input-wrapper input[type="password"] {
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
  letter-spacing: 2px;
}

:global([data-theme="dark"]) .input-wrapper input {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.input-wrapper input::placeholder {
  color: var(--text-tertiary, rgba(60, 60, 67, 0.35));
  transition: all 0.3s ease;
}

.input-wrapper input:focus {
  background: rgba(255, 255, 255, 0.85);
  border-color: #FF9F0A;
  box-shadow:
    0 0 0 4px rgba(255, 159, 10, 0.15),
    0 4px 20px rgba(255, 159, 10, 0.1);
  transform: translateY(-2px);
}

.input-wrapper input:focus::placeholder {
  opacity: 0.5;
  transform: translateX(5px);
}

:global([data-theme="dark"]) .input-wrapper input:focus {
  background: rgba(45, 45, 50, 0.9);
  border-color: #FF9F0A;
  box-shadow:
    0 0 0 4px rgba(255, 159, 10, 0.2),
    0 4px 20px rgba(255, 159, 10, 0.15);
}

/* 输入框底部动态光效 */
.input-wrapper::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #FF9F0A, transparent);
  transition: all 0.4s cubic-bezier(0.2, 0, 0, 1);
  border-radius: 0 0 14px 14px;
}

.input-wrapper:focus-within::after {
  left: 10%;
  width: 80%;
}

.password-toggle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary, rgba(60, 60, 67, 0.4));
  font-size: 20px;
  border-radius: 0 14px 14px 0;
  transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
  z-index: 2;
}

.password-toggle:hover {
  color: #FF9F0A;
  transform: scale(1.1);
}

.password-toggle:active {
  transform: scale(0.95);
}

/* ===== Options - 升级版复选框与链接 ===== */
.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  animation: optionsEntrance 0.35s cubic-bezier(0.2, 0, 0, 1) 0.4s backwards;
}

@keyframes optionsEntrance {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.remember-me:hover {
  background: rgba(255, 159, 10, 0.05);
}

.remember-me input[type="checkbox"] {
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
  background: rgba(255, 255, 255, 0.5);
}

:global([data-theme="dark"]) .remember-me input[type="checkbox"] {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
}

.remember-me input[type="checkbox"]:checked {
  background: linear-gradient(135deg, #FF9F0A, #FF6B00);
  border-color: transparent;
  animation: checkboxPop 0.3s cubic-bezier(0.2, 0, 0, 1);
}

@keyframes checkboxPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.remember-me input[type="checkbox"]::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  color: white;
  font-size: 12px;
  font-weight: bold;
  transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);
}

.remember-me input[type="checkbox"]:checked::after {
  transform: translate(-50%, -50%) scale(1);
}

.remember-me span {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.remember-me:hover span {
  color: var(--text-primary);
}

.forgot-password {
  font-size: 13px;
  font-weight: 600;
  color: #FF9F0A;
  text-decoration: none;
  position: relative;
  transition: all 0.3s ease;
  padding: 4px 8px;
  border-radius: 6px;
}

.forgot-password::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 8px;
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, #FF9F0A, #FF6B00);
  border-radius: 2px;
  transition: width 0.3s cubic-bezier(0.2, 0, 0, 1);
}

.forgot-password:hover {
  color: #FF6B00;
  background: rgba(255, 159, 10, 0.08);
}

.forgot-password:hover::after {
  width: calc(100% - 16px);
}

:global([data-theme="dark"]) .forgot-password {
  color: #FF9F0A;
}

:global([data-theme="dark"]) .forgot-password:hover {
  color: #FFB347;
}

/* ===== 主按钮 - 升级版流动渐变与光效 ===== */
.btn-primary-login {
  width: 100%;
  padding: 16px 28px;
  font-size: 16px;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #FFB347 0%, #FF9F0A 25%, #FF8C00 50%, #FF6B00 75%, #FF5A00 100%);
  background-size: 200% 200%;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.2, 0, 0, 1);
  position: relative;
  overflow: hidden;
  animation:
    buttonEntrance 0.35s cubic-bezier(0.2, 0, 0, 1) 0.45s backwards,
    gradientFlow 4s ease infinite;
  box-shadow:
    0 4px 20px rgba(255, 159, 10, 0.3),
    0 8px 40px rgba(255, 107, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

@keyframes buttonEntrance {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes gradientFlow {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* 按钮光泽扫过效果 */
.btn-primary-login::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -100%;
  width: 50%;
  height: 200%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  transform: rotate(25deg);
  animation: buttonShine 4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes buttonShine {
  0%, 100% {
    left: -100%;
  }
  50% {
    left: 150%;
  }
}

/* 按钮底部光晕 */
.btn-primary-login::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 18px;
  background: linear-gradient(135deg, #FF9F0A, #FF6B00, #FF9F0A);
  opacity: 0;
  z-index: -1;
  filter: blur(12px);
  transition: opacity 0.4s ease;
}

.btn-primary-login:hover:not(:disabled) {
  transform: translateY(-3px) scale(1.02);
  box-shadow:
    0 8px 30px rgba(255, 159, 10, 0.4),
    0 12px 50px rgba(255, 107, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  animation-play-state: paused;
}

.btn-primary-login:hover:not(:disabled)::after {
  opacity: 0.6;
}

.btn-primary-login:active:not(:disabled) {
  transform: translateY(-1px) scale(0.98);
  transition: all 0.1s ease;
}

/* 点击波纹效果 */
.btn-primary-login .ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: scale(0);
  animation: rippleEffect 0.6s ease-out;
  pointer-events: none;
}

@keyframes rippleEffect {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

.btn-primary-login:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  animation: none;
  background: linear-gradient(135deg, #ccc 0%, #999 100%);
  box-shadow: none;
}

.btn-primary-login:disabled::before,
.btn-primary-login:disabled::after {
  display: none;
}

/* ===== 错误信息 - 升级版动画效果 ===== */
.login-error {
  color: #ef4444;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
  animation: errorShake 0.5s cubic-bezier(0.2, 0, 0, 1), errorGlow 2s ease-in-out infinite;
  position: relative;
  overflow: hidden;
}

/* 错误信息图标 */
.login-error::before {
  content: '⚠';
  margin-right: 6px;
  font-size: 14px;
}

/* 错误信息闪烁边框 */
.login-error::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  border: 2px solid transparent;
  background: linear-gradient(90deg, #ef4444, #ff6b6b, #ef4444) border-box;
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: errorBorderPulse 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes errorShake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

@keyframes errorGlow {
  0%, 100% {
    box-shadow: 0 0 0 rgba(239, 68, 68, 0);
  }
  50% {
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.15);
  }
}

@keyframes errorBorderPulse {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.8;
  }
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

/* ===== 主题切换按钮 - 升级版 ===== */
.theme-toggle-btn {
  position: fixed;
  top: 24px;
  right: 24px;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.2, 0, 0, 1);
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  animation: themeBtnEntrance 0.6s cubic-bezier(0.2, 0, 0, 1) 0.3s backwards;
  z-index: 100;
}

@keyframes themeBtnEntrance {
  from {
    opacity: 0;
    transform: translateY(-20px) rotate(-180deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotate(0deg);
  }
}

.theme-toggle-btn i {
  font-size: 22px;
  color: var(--text-primary);
  transition: all 0.4s cubic-bezier(0.2, 0, 0, 1);
}

.theme-toggle-btn:hover {
  transform: scale(1.12) rotate(15deg);
  background: rgba(255, 255, 255, 0.4);
  box-shadow:
    0 8px 30px rgba(255, 159, 10, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.2) inset;
}

.theme-toggle-btn:hover i {
  color: #FF9F0A;
  transform: rotate(-15deg);
}

.theme-toggle-btn:active {
  transform: scale(1.05) rotate(10deg);
}

:global([data-theme="dark"]) .theme-toggle-btn {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
}

:global([data-theme="dark"]) .theme-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  box-shadow:
    0 8px 30px rgba(255, 159, 10, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}

:global([data-theme="dark"]) .theme-toggle-btn i {
  color: rgba(255, 255, 255, 0.9);
}

:global([data-theme="dark"]) .theme-toggle-btn:hover i {
  color: #FF9F0A;
}


</style>
