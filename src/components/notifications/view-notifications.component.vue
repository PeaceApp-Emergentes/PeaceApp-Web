<template>
  <div class="container">
    <ToolbarCitizen />
    <h1 class="title">{{ $t('reports.alert') }}</h1>

    <ul class="alert-grid">
      <li v-for="(alert, index) in sortedAlerts" :key="index" class="alert-card">
        <h2>{{ translateType(alert.type) }}</h2>
        <p><strong>{{ $t('reports.address_label') }}:</strong> {{ alert.location }}</p>
        <p><strong>{{ $t('reports.description_label') }}:</strong> {{ alert.description }}</p>
        <p v-if="alert.createdAt"><strong>{{ $t('reports.date') }}:</strong> {{ formatDate(alert.createdAt) }}</p>
        <img
            v-if="alert.imageUrl"
            :src="alert.imageUrl"
            alt="Alert image"
            class="alert-image"
        />
      </li>
    </ul>
  </div>
</template>

<script>
import ToolbarCitizen from "../toolbar/toolbarCitizen.component.vue";
import { AlertApiService } from "../../services/alertapi.service.js";

export default {
  name: "AlertList",
  components: { ToolbarCitizen },
  data() {
    return {
      alerts: [],
      alertService: new AlertApiService()
    };
  },
  computed: {
    sortedAlerts() {
      return [...this.alerts].sort((a, b) => a.id - b.id);
    }
  },
  methods: {
    translateType(type) {
      const types = {
        ROBBERY: this.$t('reportForm.placeholders.robbery'),
        ACCIDENT: this.$t('reportForm.placeholders.accident'),
        DARK_AREA: this.$t('reportForm.placeholders.dark_area'),
        HARASSMENT: this.$t('reportForm.placeholders.harassment'),
        OTHER: this.$t('reportForm.placeholders.other')
      };
      return types[type] || type;
    },
    formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    }
  },
  async mounted() {
    try {
      const userId = parseInt(localStorage.getItem("userId"));
      const response = await this.alertService.getByUserId(userId);
      if (response?.data) {
        this.alerts = response.data;
      }
    } catch (error) {
      console.error(this.$t('alerts.errorLoading'), error);
    }
  }
};
</script>

<style scoped>
.container {
  padding: 5vh 2vw;
  min-height: 100vh;
}

.title {
  text-align: center;
  color: white;
  margin-bottom: 30px;
}

.alert-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.alert-card {
  background-color: #ffffff;
  border: 1px solid #ccc;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
  color: #000;
}

.alert-card:hover {
  transform: translateY(-5px);
}

.alert-image {
  max-width: 100%;
  border-radius: 6px;
  margin-top: 12px;
}

/* === MODO OSCURO === */
body.dark .container {
  background-color: #121212;
}

body.dark .title {
  color: #f5f5f5;
}

body.dark .alert-card {
  background-color: #1e1e1e;
  color: #f5f5f5;
  border: 1px solid #444;
  box-shadow: 0 2px 10px rgba(255, 255, 255, 0.05);
}

body.dark .alert-card:hover {
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
}
</style>
