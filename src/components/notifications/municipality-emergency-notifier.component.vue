<script>
import { environment } from "../../environments/environment.js";
import { AlertApiService } from "../../services/alertapi.service.js";
import { UserApiService } from "../../services/userapi.service.js";

const LAST_SEEN_KEY = "peaceapp_last_emergency_alert_id_v2";

export default {
  name: "MunicipalityEmergencyNotifier",
  data() {
    return {
      alertApi: new AlertApiService(),
      userApi: new UserApiService(),
      socket: null,
      reconnectTimer: null,
      sessionTimer: null,
      pollTimer: null,
      notification: null,
      isEnabled: false,
      notificationPermission: this.getNotificationPermission(),
      municipalityDistrict: "",
      notifiedSocketReportIds: new Set(),
      lastSeenEmergencyId: Number(sessionStorage.getItem(LAST_SEEN_KEY) || 0)
    };
  },
  computed: {
    canAskBrowserPermission() {
      return this.isEnabled && this.notificationPermission === "default";
    }
  },
  mounted() {
    this.syncSession();
    this.sessionTimer = setInterval(() => this.syncSession(), 1000);
  },
  beforeUnmount() {
    clearInterval(this.sessionTimer);
    this.stopPolling();
    this.disconnectSocket();
  },
  methods: {
    getNotificationPermission() {
      return "Notification" in window ? Notification.permission : "unsupported";
    },
    syncSession() {
      const role = sessionStorage.getItem("userRole");
      const token = sessionStorage.getItem("authToken");
      const shouldEnable = Boolean(token) && (role === "ROLE_MUNICIPALITY" || role === "ROLE_ADMIN");

      if (shouldEnable && !this.isEnabled) {
        this.isEnabled = true;
        this.loadMunicipalityDistrict();
        this.connectSocket();
        this.startPolling();
      }

      if (!shouldEnable && this.isEnabled) {
        this.isEnabled = false;
        this.notification = null;
        this.stopPolling();
        this.disconnectSocket();
      }
    },
    async loadMunicipalityDistrict() {
      if (this.municipalityDistrict) return;

      const userId = sessionStorage.getItem("iamUserId") || sessionStorage.getItem("userId");
      try {
        if (userId) {
          const response = await this.userApi.getMunicipalityByUserId(userId);
          if ([200, 201].includes(response?.status) && response.data?.district) {
            this.municipalityDistrict = response.data.district;
            sessionStorage.setItem("municipalityInfo", JSON.stringify(response.data));
            return;
          }
        }
      } catch (error) {
        console.error("Error cargando distrito para notificaciones:", error);
      }

      try {
        const stored = JSON.parse(sessionStorage.getItem("municipalityInfo") || "{}");
        this.municipalityDistrict = stored.district || "";
      } catch {
        this.municipalityDistrict = "";
      }
    },
    connectSocket() {
      if (!this.isEnabled || this.socket) return;

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      const socket = new WebSocket(environment.websocketUrl);
      this.socket = socket;

      socket.onmessage = async (event) => {
        try {
          const alert = JSON.parse(event.data);
          await this.loadMunicipalityDistrict();
          this.registerEmergency(alert);
        } catch (error) {
          console.error("Error leyendo emergencia municipal:", error);
        }
      };

      socket.onclose = () => {
        if (this.socket !== socket) return;
        this.socket = null;
        if (this.isEnabled) {
          this.reconnectTimer = setTimeout(() => this.connectSocket(), 3000);
        }
      };

      socket.onerror = () => socket.close();
    },
    disconnectSocket() {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      if (this.socket) {
        const socket = this.socket;
        this.socket = null;
        socket.onclose = null;
        socket.close();
      }
    },
    startPolling() {
      if (this.pollTimer) return;
      this.pollEmergencies();
      this.pollTimer = setInterval(() => this.pollEmergencies(), 4000);
    },
    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    },
    async pollEmergencies() {
      if (!this.isEnabled) return;

      try {
        await this.loadMunicipalityDistrict();
        const response = await this.alertApi.getAll();
        const alerts = Array.isArray(response?.data) ? response.data : [];
        const emergencies = alerts
          .filter((alert) => this.isEmergency(alert))
          .sort((a, b) => Number(a.id || 0) - Number(b.id || 0));

        if (!emergencies.length) {
          return;
        }

        const unseenEmergencies = emergencies.filter((alert) => Number(alert.id || 0) > this.lastSeenEmergencyId);
        const nextEmergency = unseenEmergencies[unseenEmergencies.length - 1];
        if (nextEmergency) this.registerEmergency(nextEmergency);
      } catch (error) {
        console.error("Error consultando emergencias municipales:", error);
      }
    },
    isEmergency(alert) {
      return alert?.isEmergency === true
        || alert?.type === "EMERGENCY"
        || (alert?.description || "").startsWith("[EMERGENCY]");
    },
    isSocketReportNotification(alert) {
      return Boolean(alert?.reportId && alert?.district);
    },
    normalizeDistrict(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    },
    belongsToMunicipalityDistrict(alert) {
      if (!this.municipalityDistrict) return true;
      if (!alert?.district && alert?.reportId) return false;
      if (!alert?.district) return true;
      return this.normalizeDistrict(alert.district) === this.normalizeDistrict(this.municipalityDistrict);
    },
    registerEmergency(alert) {
      if (!this.isEmergency(alert) && !this.isSocketReportNotification(alert)) return;
      if (!this.belongsToMunicipalityDistrict(alert)) return;

      if (this.isSocketReportNotification(alert)) {
        const reportId = Number(alert.reportId);
        if (this.notifiedSocketReportIds.has(reportId)) return;
        this.notifiedSocketReportIds.add(reportId);
        this.showEmergency(alert);
        return;
      }

      const alertId = Number(alert.id || 0);
      if (alertId && alertId <= this.lastSeenEmergencyId) return;
      if (alertId) this.markSeen(alertId);
      this.showEmergency(alert);
    },
    markSeen(alertId) {
      this.lastSeenEmergencyId = Math.max(this.lastSeenEmergencyId, Number(alertId || 0));
      sessionStorage.setItem(LAST_SEEN_KEY, String(this.lastSeenEmergencyId));
    },
    showEmergency(alert) {
      if (!alert || (!this.isEmergency(alert) && !this.isSocketReportNotification(alert))) return;
      const emergency = this.isEmergency(alert);

      this.notification = {
        id: alert.id,
        reportId: alert.reportId,
        location: alert.location || this.$t("dashboard.locationUnavailable"),
        district: alert.district || "",
        title: emergency ? this.$t("dashboard.emergencyReport") : this.$t("dashboard.newPendingReport"),
        description: (alert.description || alert.title || this.$t("dashboard.citizenReport")).replace("[EMERGENCY]", "").trim()
      };

      this.playSound();
      this.showBrowserNotification();
    },
    playSound() {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const context = new AudioContext();
        const gain = context.createGain();
        gain.gain.value = 0.08;
        gain.connect(context.destination);

        [0, 0.16].forEach((offset) => {
          const oscillator = context.createOscillator();
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(880, context.currentTime + offset);
          oscillator.connect(gain);
          oscillator.start(context.currentTime + offset);
          oscillator.stop(context.currentTime + offset + 0.11);
        });

        setTimeout(() => context.close(), 500);
      } catch (error) {
        console.warn("No se pudo reproducir sonido de emergencia:", error);
      }
    },
    showBrowserNotification() {
      if (!("Notification" in window) || Notification.permission !== "granted" || !this.notification) return;

      const browserNotification = new Notification(this.notification.title, {
        body: `${this.notification.description} - ${this.notification.district || this.notification.location}`,
        tag: `peaceapp-emergency-${this.notification.id || Date.now()}`
      });
      browserNotification.onclick = () => {
        window.focus();
        this.openDashboard();
      };
    },
    async requestBrowserPermission() {
      if ("Notification" in window && Notification.permission === "default") {
        this.notificationPermission = await Notification.requestPermission();
      }
    },
    openDashboard() {
      this.requestBrowserPermission();
      this.notification = null;
      this.$router.push({
        path: "/dashboard",
        query: { emergency: "1", ts: Date.now().toString() }
      });
    }
  }
};
</script>

<template>
  <button v-if="canAskBrowserPermission" class="notification-permission" type="button" @click="requestBrowserPermission">
    {{ $t("dashboard.enableNotifications") }}
  </button>

  <div v-if="notification" class="emergency-toast" role="alert" @click="openDashboard">
    <div class="toast-icon">!</div>
    <div class="toast-copy">
      <strong>{{ notification.title }}</strong>
      <p>{{ notification.description }}</p>
      <span>{{ $t("dashboard.zone") }}: {{ notification.district || notification.location }}</span>
    </div>
    <button type="button" class="toast-close" @click.stop="notification = null">x</button>
  </div>
</template>

<style scoped>
.notification-permission {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 2100;
  border: 0;
  border-radius: 6px;
  padding: 8px 10px;
  background: #1c597c;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.emergency-toast {
  position: fixed;
  right: 22px;
  top: 92px;
  z-index: 3000;
  width: min(390px, calc(100vw - 32px));
  display: grid;
  grid-template-columns: 44px 1fr 28px;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border: 2px solid #e53935;
  border-radius: 8px;
  background: #fff;
  color: #18252f;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
  cursor: pointer;
  animation: slideIn 180ms ease-out;
}

.toast-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #e53935;
  color: #fff;
  font-size: 28px;
  font-weight: 900;
}

.toast-copy {
  min-width: 0;
}

.toast-copy strong {
  display: block;
  color: #c0392b;
  font-size: 16px;
}

.toast-copy p,
.toast-copy span {
  display: block;
  margin: 2px 0;
  overflow-wrap: anywhere;
}

.toast-copy span {
  color: #52616b;
  font-size: 13px;
}

.toast-close {
  align-self: start;
  border: 0;
  background: transparent;
  color: #52616b;
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
