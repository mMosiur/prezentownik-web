<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <div class="landing-page">
    <section class="hero-section container text-center">
      <div class="card hero-card">
        <h1>Podaruj to, co naprawdę cieszy</h1>
        <p class="hero-subtitle">
          Twórz listy prezentów, dziel się nimi z bliskimi i miej pewność, 
          że każdy upominek będzie trafiony. Prosto, elegancko i bez duplikacji.
        </p>
        <div class="hero-actions mt-2">
          <template v-if="authStore.isAuthenticated">
            <RouterLink :to="{ name: 'dashboard' }" class="btn btn-lg">Przejdź do moich list</RouterLink>
          </template>
          <template v-else>
            <RouterLink :to="{ name: 'register' }" class="btn btn-lg">Zacznij za darmo</RouterLink>
            <RouterLink :to="{ name: 'login' }" class="btn btn-lg btn-outline ml-1">Zaloguj się</RouterLink>
          </template>
        </div>
      </div>
    </section>

    <section class="features-section container mt-2">
      <div class="features-grid">
        <div class="feature-card card">
          <div class="feature-icon">🎁</div>
          <h3>Twórz bez ograniczeń</h3>
          <p>Dodawaj pomysły na prezenty do listy. Ty decydujesz, czego potrzebujesz.</p>
        </div>
        <div class="feature-card card">
          <div class="feature-icon">🔗</div>
          <h3>Dziel się łatwo</h3>
          <p>Wyślij jeden link bliskim. Nie muszą mieć konta, aby zarezerwować prezent i nie zdublować się z innymi.</p>
        </div>
        <div class="feature-card card">
          <div class="feature-icon">🤫</div>
          <h3>Zachowaj niespodziankę</h3>
          <p>Jako właściciel listy nie widzisz, kto i co zarezerwował. Dowiesz się dopiero przy rozpakowywaniu!</p>
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
