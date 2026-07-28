<template>
  <div class="login-overlay">
    <div class="login-card">
      <div class="login-logo">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect x="5" y="4" width="22" height="24" rx="3" fill="currentColor" opacity="0.15"/>
          <rect x="6.5" y="5.5" width="19" height="21" rx="2" stroke="currentColor" stroke-width="2"/>
          <line x1="11" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="11" y1="17" x2="21" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="11" y1="22" x2="16" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <h1>OPPO Notes</h1>
      </div>
      <p class="login-subtitle">{{ isRegister ? 'Create an account' : 'Sign in to continue' }}</p>

      <div v-if="authStore.error" class="login-error">{{ authStore.error }}</div>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <input
            v-model="form.username"
            type="text"
            placeholder="Username"
            class="form-input"
            autocomplete="username"
            required
          />
        </div>
        <div class="form-group">
          <input
            v-model="form.password"
            type="password"
            placeholder="Password"
            class="form-input"
            autocomplete="current-password"
            required
          />
        </div>
        <button type="submit" class="form-submit" :disabled="authStore.loading">
          {{ authStore.loading ? 'Please wait...' : (isRegister ? 'Register' : 'Sign In') }}
        </button>
      </form>

      <p class="login-toggle">
        {{ isRegister ? 'Already have an account?' : "Don't have an account?" }}
        <a href="#" @click.prevent="isRegister = !isRegister; authStore.error = ''">
          {{ isRegister ? 'Sign in' : 'Register' }}
        </a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useAuthStore } from '../stores/auth'

const emit = defineEmits(['loggedIn'])
const authStore = useAuthStore()
const isRegister = ref(false)

const form = reactive({
  username: '',
  password: '',
})

async function handleSubmit() {
  let ok
  if (isRegister.value) {
    ok = await authStore.register(form.username, form.password)
    if (ok) {
      ok = await authStore.login(form.username, form.password)
    }
  } else {
    ok = await authStore.login(form.username, form.password)
  }
  if (ok) emit('loggedIn')
}
</script>

<style scoped>
.login-overlay {
  position: fixed;
  inset: 0;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.login-card {
  background: #fafafa;
  border-radius: 16px;
  padding: 40px;
  width: 380px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.1);
}

.login-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 8px;
  color: #006aff;
}

.login-logo h1 {
  font-size: 22px;
  font-weight: 700;
  color: #000;
}

.login-subtitle {
  text-align: center;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 24px;
}

.login-error {
  background: rgba(224, 80, 80, 0.08);
  color: #e05050;
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 16px;
  text-align: center;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-input {
  width: 100%;
  height: 44px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  padding: 0 14px;
  font-size: 14px;
  background: #fff;
  color: #000;
}
.form-input:focus {
  border-color: #006aff;
  box-shadow: 0 0 0 3px rgba(0, 106, 255, 0.1);
}
.form-input::placeholder {
  color: rgba(0, 0, 0, 0.3);
}

.form-submit {
  width: 100%;
  height: 44px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  background: #006aff;
  color: #fff;
  margin-top: 4px;
}
.form-submit:hover:not(:disabled) {
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.12)), #006aff;
}
.form-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-toggle {
  text-align: center;
  margin-top: 20px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}

.login-toggle a {
  color: #006aff;
  font-weight: 500;
}
</style>
