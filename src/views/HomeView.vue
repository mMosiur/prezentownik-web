<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()
</script>

<template>
  <div class="landing-page">
    <section class="hero-section container text-center">
      <div class="card hero-card">
        <h1>{{ t('home.heroTitle') }}</h1>
        <p class="hero-subtitle">
          {{ t('home.heroSubtitle') }}
        </p>
        <div class="hero-actions mt-2">
          <template v-if="authStore.isAuthenticated">
            <RouterLink :to="{ name: 'dashboard' }" class="btn btn-lg">{{ t('home.goToDashboard') }}</RouterLink>
          </template>
          <template v-else>
            <RouterLink :to="{ name: 'register' }" class="btn btn-lg">{{ t('home.startForFree') }}</RouterLink>
            <RouterLink :to="{ name: 'login' }" class="btn btn-lg btn-outline ml-1">{{ t('home.login') }}</RouterLink>
          </template>
        </div>
      </div>
    </section>

    <section class="features-section container mt-2">
      <div class="features-grid">
        <div class="feature-card card">
          <div class="feature-icon">🎁</div>
          <h3>{{ t('home.feature1Title') }}</h3>
          <p>{{ t('home.feature1Desc') }}</p>
        </div>
        <div class="feature-card card">
          <div class="feature-icon">🔗</div>
          <h3>{{ t('home.feature2Title') }}</h3>
          <p>{{ t('home.feature2Desc') }}</p>
        </div>
        <div class="feature-card card">
          <div class="feature-icon">🤫</div>
          <h3>{{ t('home.feature3Title') }}</h3>
          <p>{{ t('home.feature3Desc') }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero-section {
  padding: 4rem 1rem;
}

.hero-card {
  padding: 4rem 2rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 250, 0.9) 100%);
}

h1 {
  font-size: 3rem;
  line-height: 1.2;
  margin-bottom: 1.5rem;
}

.hero-subtitle {
  font-size: 1.25rem;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.btn-lg {
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
}

.ml-1 {
  margin-left: 1rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.feature-card {
  text-align: center;
  padding: 2rem;
  transition: transform 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

@media (max-width: 768px) {
  h1 {
    font-size: 2.25rem;
  }
  
  .hero-section {
    padding: 2rem 1rem;
  }
  
  .hero-card {
    padding: 3rem 1.5rem;
  }
  
  .hero-actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .ml-1 {
    margin-left: 0;
  }
}

@media (max-width: 480px) {
  h1 {
    font-size: 1.85rem;
  }
  
  .hero-subtitle {
    font-size: 1.1rem;
  }
}
</style>
