<script>
import { AlertApiService } from "../../services/alertapi.service.js";

export default {
  data() {
    return {
      alertApi: new AlertApiService(),
      emergencyMessage: "",
      municipalityPhone: "105"
    };
  },
  computed: {
    role() {
      return sessionStorage.getItem("userRole");
    },
    canUseDashboard() {
      return this.role === "ROLE_ADMIN" || this.role === "ROLE_MUNICIPALITY";
    },
    notificationsRoute() {
      return this.canUseDashboard ? "/dashboard" : "/user/notifications";
    }
  },
  methods: {
    sendGeneralEmergency() {
      const userId = Number(sessionStorage.getItem("userId")) || 0;
      const send = async (lat, lng) => {
        const location = `${lat}, ${lng}`;
        const response = await this.alertApi.createEmergency({
          location,
          userId,
          description: this.$t("emergency.description")
        });

        if ([200, 201].includes(response?.status)) {
          this.emergencyMessage = this.$t("emergency.sent", { phone: this.municipalityPhone });
        } else {
          this.emergencyMessage = this.$t("emergency.sendError");
        }
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => send(pos.coords.latitude, pos.coords.longitude),
          () => send(sessionStorage.getItem("userLat") || 0, sessionStorage.getItem("userLng") || 0)
        );
      } else {
        send(sessionStorage.getItem("userLat") || 0, sessionStorage.getItem("userLng") || 0);
      }
    },
    whatsappUrl() {
      return `https://wa.me/${this.municipalityPhone}?text=${encodeURIComponent(this.$t("emergency.whatsappText"))}`;
    },
    smsUrl() {
      return `sms:${this.municipalityPhone}?body=${encodeURIComponent(this.$t("emergency.smsText"))}`;
    }
  }
};
</script>

<template>
  <nav class="toolbar">
    <ul class="left-icons">
      <li><img src="../../assets/PeaceApp.png" alt="PeaceApp" /></li>
    </ul>
    <ul class="right-icons">
      <li><router-link to="/map"><img src="../../assets/Map.png" alt="Map" /></router-link></li>
      <li v-if="!canUseDashboard"><button class="emergency-btn" @click="sendGeneralEmergency">{{ $t("emergency.button") }}</button></li>
      <li><router-link :to="notificationsRoute"><img src="../../assets/Notification.png" :alt="canUseDashboard ? 'Dashboard' : 'Notification'" /></router-link></li>
      <li v-if="canUseDashboard"><router-link to="/subscription"><img src="../../assets/Config.png" :alt="$t('subscription.navLink')" /></router-link></li>
      <li><router-link to="/profile"><img src="../../assets/Profile.png" alt="Profile" /></router-link></li>
    </ul>
  </nav>

  <div v-if="emergencyMessage" class="emergency-confirmation">
    <strong>{{ $t("emergency.confirmation") }}</strong>
    <p>{{ emergencyMessage }}</p>
    <div>
      <a :href="`tel:${municipalityPhone}`">{{ $t("emergency.call") }}</a>
      <a :href="whatsappUrl()" target="_blank">WhatsApp</a>
      <a :href="smsUrl()">SMS</a>
      <button @click="emergencyMessage = ''">{{ $t("emergency.close") }}</button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  background-color: #1C597C;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
  z-index: 1000;
}

.left-icons, .right-icons {
  list-style-type: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
}

.right-icons {
  margin-right: 40px;
  gap: 14px;
}

.left-icons {
  margin-left: 30px;
}

.left-icons img {
  height: 80px;
  width: auto;
}

.right-icons img {
  height: 50px;
  width: auto;
}

.dash-link,
.emergency-btn,
.emergency-confirmation a,
.emergency-confirmation button {
  background: #eef221;
  color: #161616;
  border: 0;
  border-radius: 6px;
  padding: 9px 12px;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}

.emergency-btn {
  background: #e53935;
  color: white;
}

.emergency-confirmation {
  position: fixed;
  right: 20px;
  top: 110px;
  z-index: 2000;
  width: min(360px, calc(100vw - 40px));
  background: white;
  border: 2px solid #e53935;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  color: #161616;
}

.emergency-confirmation div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

body.dark .toolbar {
  background-color: #282828;
}

@media (max-width: 1000px) {
  .left-icons img {
    width: 32vw;
    height: auto;
  }

  .right-icons {
    gap: 8px;
    margin-right: 0;
  }

  .right-icons img {
    height: 36px;
  }

  .dash-link,
  .emergency-btn {
    font-size: 12px;
    padding: 7px 8px;
  }
}
</style>
