<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()
</script>

<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero-section container text-center">
      <div class="card hero-card">
        <h1 class="hero-title">{{ t('home.heroTitle') }}</h1>
        <p class="hero-subtitle">
          {{ t('home.heroSubtitle') }}
        </p>

        <div class="hero-actions mt-2">
          <template v-if="authStore.isAuthenticated">
            <RouterLink :to="{ name: 'dashboard' }" class="btn btn-lg hero-btn-primary">
              <span>{{ t('home.goToDashboard') }}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </RouterLink>
          </template>
          <template v-else>
            <RouterLink :to="{ name: 'register' }" class="btn btn-lg hero-btn-primary">
              <span>{{ t('home.register') }}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </RouterLink>
            <RouterLink :to="{ name: 'login' }" class="btn btn-lg btn-outline hero-btn-secondary">
              <span>{{ t('home.login') }}</span>
            </RouterLink>
          </template>
        </div>

        <!-- Trust Highlights -->
        <div class="trust-strip">
          <div class="trust-item">
            <span class="trust-icon">🔒</span>
            <span>{{ t('home.trust.authorCantSee') }}</span>
          </div>
          <div class="trust-item">
            <span class="trust-icon">⚡</span>
            <span>{{ t('home.trust.noAccountGuests') }}</span>
          </div>
          <div class="trust-item">
            <span class="trust-icon">🎉</span>
            <span>{{ t('home.trust.fullSurprise') }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="how-section container mt-2">
      <div class="section-header text-center">
        <h2>{{ t('home.howItWorks.Title') }}</h2>
        <p class="section-subtitle">{{ t('home.howItWorks.Subtitle') }}</p>
      </div>

      <section class="features-section container mt-2">
        <div class="features-grid">
          <div class="feature-card card card-interactive">
            <div class="step-badge-num">1</div>
            <div class="feature-icon-box">
              <span class="feature-emoji">✨</span>
            </div>
            <h3>{{ t('home.howItWorks.step1Title') }}</h3>
            <p>{{ t('home.howItWorks.step1Desc') }}</p>
          </div>

          <div class="feature-card card card-interactive">
            <div class="step-badge-num">2</div>
            <div class="feature-icon-box">
              <span class="feature-emoji">👥</span>
            </div>
            <h3>{{ t('home.howItWorks.step2Title') }}</h3>
            <p>{{ t('home.howItWorks.step2Desc') }}</p>
          </div>

          <div class="feature-card card card-interactive">
            <div class="step-badge-num">3</div>
            <div class="feature-icon-box">
              <span class="feature-emoji">🤫</span>
            </div>
            <h3>{{ t('home.howItWorks.step3Title') }}</h3>
            <p>{{ t('home.howItWorks.step3Desc') }}</p>
          </div>
        </div>
      </section>
    </section>

  </div>
</template>

<style scoped>
.landing-page {
  padding-bottom: 2rem;
}

.hero-section {
  padding: 2.5rem 1rem 1rem;
}

.hero-card {
  padding: 3.5rem 2rem 2.5rem;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 245, 239, 0.92) 100%);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  border: 1px solid rgba(59, 119, 108, 0.2);
  position: relative;
  overflow: hidden;
}

.hero-card::before {
  content: '';
  position: absolute;
  top: -80px;
  right: -80px;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, rgba(59, 119, 108, 0.12) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 1rem;
  background: var(--color-accent-soft);
  color: var(--color-accent);
  border: 1px solid rgba(59, 119, 108, 0.25);
  border-radius: var(--radius-full);
  font-size: 0.88rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(59, 119, 108, 0.08);
}

.badge-sparkle {
  font-size: 1rem;
}

.hero-title {
  font-size: 2.85rem;
  line-height: 1.18;
  margin-bottom: 1.25rem;
  color: var(--color-heading);
  letter-spacing: -0.025em;
  font-weight: 700;
}

.hero-subtitle {
  font-size: 1.2rem;
  max-width: 640px;
  margin: 0 auto;
  line-height: 1.6;
  color: var(--color-text);
}

.hero-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 2rem;
}

.hero-btn-primary {
  box-shadow: 0 4px 18px rgba(59, 119, 108, 0.35);
}

.trust-strip {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.75rem;
  flex-wrap: wrap;
  margin-top: 2.5rem;
  padding-top: 1.75rem;
  border-top: 1px dashed var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.92rem;
  font-weight: 600;
}

.trust-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.trust-icon {
  font-size: 1.1rem;
}

/* How it works */
.section-header h2 {
  font-size: 2rem;
  color: var(--color-heading);
  margin-bottom: 0.4rem;
}

.section-subtitle {
  color: var(--color-text-muted);
  font-size: 1.05rem;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.step-card {
  text-align: center;
  padding: 2.25rem 1.5rem 1.75rem;
  margin-bottom: 0;
}

.step-badge-num {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: #ffffff;
  font-weight: 700;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(59, 119, 108, 0.3);
}

.step-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-xl);
  background: rgba(245, 159, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.25rem;
  transition: transform 0.3s ease;
}

.step-card:hover .step-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
}

.step-emoji {
  font-size: 1.75rem;
}

.step-card h3 {
  font-size: 1.3rem;
  margin-bottom: 0.65rem;
}

.step-card p {
  font-size: 0.95rem;
  color: var(--color-text);
  line-height: 1.55;
}

/* Features */
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.feature-card {
  text-align: center;
  padding: 2rem 1.5rem;
  margin-bottom: 0;
}

.feature-icon-box {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-xl);
  background: rgba(245, 159, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.25rem;
  transition: transform 0.3s ease;
}

.feature-card:hover .feature-icon-box {
  transform: scale(1.1) rotate(5deg);
}

.feature-emoji {
  font-size: 1.75rem;
}

.feature-card h3 {
  font-size: 1.3rem;
  margin-bottom: 0.65rem;
}

.feature-card p {
  color: var(--color-text);
  font-size: 0.95rem;
  line-height: 1.55;
}

/* Tablet Layout */
@media (max-width: 860px) {
  .steps-grid,
  .features-grid {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.25rem;
  }
}

/* Mobile Layout */
@media (max-width: 600px) {
  .hero-section {
    padding: 1.25rem 0.5rem 0.5rem;
  }

  .hero-card {
    padding: 2.25rem 1.25rem 1.75rem;
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1.05rem;
  }

  .hero-actions {
    flex-direction: column;
    width: 100%;
  }

  .hero-actions .btn {
    width: 100%;
  }

  .trust-strip {
    gap: 1rem;
    font-size: 0.85rem;
  }

  .steps-grid,
  .features-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .section-header h2 {
    font-size: 1.6rem;
  }
}
</style>

