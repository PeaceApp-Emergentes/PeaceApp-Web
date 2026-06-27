<script>
import ToolbarCitizen from "../../components/toolbar/toolbar-citizen.component.vue";
import { ReportApiService } from "../../services/reportapi.service.js";
import { AlertApiService } from "../../services/alertapi.service.js";
import { UserApiService } from "../../services/userapi.service.js";
import { AiApiService } from "../../services/aiapi.service.js";

export default {
  name: "MunicipalityDashboardPage",
  components: { ToolbarCitizen },
  data() {
    return {
      reportApi: new ReportApiService(),
      alertApi: new AlertApiService(),
      userApi: new UserApiService(),
      reports: [],
      alerts: [],
      userNames: {},
      municipalityDistrict: "",
      typeFilter: "",
      stateFilter: "",
      districtFilter: "",
      dateFrom: "",
      dateTo: "",
      urgencyFilter: "",
      sortBy: "urgency",
      busyReportId: null,
      aiApi: new AiApiService(),
      aiAnalysis: {},
      aiModalReportId: null
    };
  },
  computed: {
    districtReports() {
      if (!this.municipalityDistrict) return this.reports;
      return this.reports.filter((report) => this.sameDistrict(report.district, this.municipalityDistrict));
    },
    filteredReports() {
      const from = this.dateFrom ? new Date(this.dateFrom + "T00:00:00") : null;
      const to = this.dateTo ? new Date(this.dateTo + "T23:59:59") : null;
      const filtered = this.districtReports.filter((report) => {
        const typeOk = !this.typeFilter || report.type === this.typeFilter;
        const stateOk = !this.stateFilter || report.state === this.stateFilter;
        const searchOk = !this.districtFilter || this.reportSearchText(report).includes(this.normalizeSearch(this.districtFilter));
        const created = report.createdAt ? new Date(report.createdAt) : null;
        const fromOk = !from || (created && created >= from);
        const toOk = !to || (created && created <= to);
        const urgencyOk = !this.urgencyFilter || this.urgencyLevel(report) === this.urgencyFilter;
        return typeOk && stateOk && searchOk && fromOk && toOk && urgencyOk;
      });
      return this.sortReports(filtered);
    },
    emergencies() {
      return this.alerts.filter((alert) => {
        const emergency = alert.isEmergency === true || alert.type === "EMERGENCY" || (alert.description || "").startsWith("[EMERGENCY]");
        const districtOk = !this.municipalityDistrict
          || (alert.district && this.sameDistrict(alert.district, this.municipalityDistrict))
          || (!alert.reportId && !alert.district);
        return emergency && districtOk;
      });
    },
    stats() {
      const reports = this.districtReports;
      const total = reports.length;
      const pending = reports.filter((r) => r.state === "PENDING").length;
      const review = reports.filter((r) => r.state === "IN_REVIEW").length;
      const approved = reports.filter((r) => r.state === "APPROVED").length;
      const attended = reports.filter((r) => r.state === "ATTENDED").length;
      const rejected = reports.filter((r) => r.state === "REJECTED").length;
      return { total, pending, review, approved, attended, rejected, emergencies: this.emergencies.length };
    }
  },
  async mounted() {
    await this.refresh();
  },
  watch: {
    "$route.query.ts"() {
      this.refresh();
    },
    "$route.query.emergency"() {
      this.refresh();
    }
  },
  methods: {
    async refresh() {
      await this.loadMunicipalityDistrict();
      await Promise.all([this.loadReports(), this.refreshEmergencies()]);
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
        console.error("Error cargando distrito municipal:", error);
      }

      try {
        const stored = JSON.parse(sessionStorage.getItem("municipalityInfo") || "{}");
        this.municipalityDistrict = stored.district || "";
      } catch {
        this.municipalityDistrict = "";
      }
    },
    async loadReports() {
      const response = this.municipalityDistrict
        ? await this.reportApi.getByDistrict(this.municipalityDistrict)
        : await this.reportApi.getAll();
      this.reports = Array.isArray(response?.data) ? response.data : [];
      await this.loadUserNames();
    },
    async loadUserNames() {
      const missingUserIds = [...new Set(this.reports.map((report) => report.userId).filter(Boolean))]
        .filter((userId) => !this.userNames[userId]);

      await Promise.all(missingUserIds.map(async (userId) => {
        const response = await this.userApi.getUserById(userId);
        const user = response?.data;
        this.userNames = {
          ...this.userNames,
          [userId]: user ? this.userDisplayName(user, userId) : this.$t("dashboard.userFallback", { id: userId })
        };
      }));
    },
    async refreshEmergencies() {
      const response = await this.alertApi.getAll();
      this.alerts = Array.isArray(response?.data) ? response.data : [];
    },
    async runReportAction(report, action) {
      this.busyReportId = report.id;
      try {
        const response = await action();
        if (![200, 201, 202, 204].includes(response?.status)) {
          throw new Error(response?.data?.message || response?.data || this.$t("dashboard.updateError"));
        }
        await this.loadReports();
      } catch (error) {
        console.error("Error actualizando reporte:", error);
        alert(error.message || this.$t("dashboard.updateError"));
      } finally {
        this.busyReportId = null;
      }
    },
    async approve(report) {
      if (report.state === "REJECTED" || report.state === "APPROVED" || report.state === "ATTENDED") return;
      await this.runReportAction(report, async () => {
        if (report.state === "PENDING") {
          const reviewResponse = await this.reportApi.markInReview(report.id);
          if (![200, 201, 202, 204].includes(reviewResponse?.status)) return reviewResponse;
        }
        return this.reportApi.approve(report.id);
      });
    },
    async reject(report) {
      if (report.state === "REJECTED" || report.state === "ATTENDED") return;
      const reason = prompt(this.$t("dashboard.rejectPrompt"));
      if (!reason) return;
      await this.runReportAction(report, () => this.reportApi.reject(report.id, reason));
    },
    async attend(report) {
      if (report.state !== "APPROVED") return;
      await this.runReportAction(report, () => this.reportApi.attend(report.id));
    },
    openEmergencyMap(alert) {
      this.$router.push({
        path: "/map",
        query: {
          reportId: alert.reportId,
          location: alert.location
        }
      });
    },
    openReportMap(report) {
      this.$router.push({
        path: "/map",
        query: {
          reportId: report.id,
          location: report.location
        }
      });
    },
    whatsappUrl(alert) {
      const text = `PeaceApp: ${alert.description || ""} ${this.$t("reports.location_label")} ${alert.location}`;
      return `https://wa.me/?text=${encodeURIComponent(text)}`;
    },
    reportImage(report) {
      return report.imageUrl || report.image || "";
    },
    reportPrimaryMediaUrl(report) {
      return report.imageUrl || report.image || report.videoUrl || report.audioUrl || "";
    },
    openEvidence(report) {
      const url = this.reportPrimaryMediaUrl(report);
      if (!url) return;
      window.open(url, "_blank", "noopener,noreferrer");
    },
    reportMediaTypes(report) {
      const types = [];
      if (report.imageUrl || report.image) types.push(this.$t("dashboard.mediaImage"));
      if (report.videoUrl) types.push(this.$t("dashboard.mediaVideo"));
      if (report.audioUrl) types.push(this.$t("dashboard.mediaAudio"));
      return types;
    },
    formatDate(value) {
      if (!value) return this.$t("dashboard.notAvailable");
      return new Date(value).toLocaleString(this.$i18n.locale || "es", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    },
    userDisplayName(user, fallbackId) {
      const fullName = [user.name, user.lastname].filter(Boolean).join(" ").trim();
      return fullName || user.email || this.$t("dashboard.userFallback", { id: fallbackId });
    },
    reportUserName(report) {
      return this.userNames[report.userId] || this.$t("dashboard.userFallback", { id: report.userId });
    },
    isEmergencyReport(report) {
      return report.state !== "REJECTED" && report.state !== "ATTENDED" && this.emergencies.some((e) => e.reportId === report.id);
    },
    // Urgencia real: marca de emergencia del reporte (el ciudadano la elige; la municipalidad la cambia).
    isEmergencyFlag(report) {
      return report.state !== "REJECTED" && report.state !== "ATTENDED" && report.isEmergency === true;
    },
    urgencyScore(report) {
      return this.isEmergencyFlag(report) ? 1 : 0;
    },
    urgencyLevel(report) {
      return this.isEmergencyFlag(report) ? "EMERGENCY" : "NORMAL";
    },
    urgencyLabel(report) {
      return this.isEmergencyFlag(report)
        ? this.$t("dashboard.urgencyEmergency")
        : this.$t("dashboard.urgencyNormal");
    },
    async toggleEmergency(report) {
      if (report.state === "REJECTED" || report.state === "ATTENDED") return;
      await this.runReportAction(report, () => this.reportApi.setEmergency(report.id, !this.isEmergencyFlag(report)));
    },
    aiCacheKey(id) {
      return "peaceapp_ai_analysis_" + id;
    },
    aiButtonLabel(report) {
      const a = this.aiAnalysis[report.id];
      if (a && a.loading) return "Analizando con IA...";
      if ((a && (a.text || a.image)) || localStorage.getItem(this.aiCacheKey(report.id))) return "Ver análisis IA";
      return "Analizar con IA";
    },
    async analyzeReport(report) {
      const id = report.id;
      // Cache en memoria o localStorage para no volver a consumir la IA.
      if (!this.aiAnalysis[id]) {
        const stored = localStorage.getItem(this.aiCacheKey(id));
        if (stored) {
          try { this.aiAnalysis[id] = JSON.parse(stored); } catch (e) { /* ignore */ }
        }
      }
      const cached = this.aiAnalysis[id];
      if (cached && !cached.loading && (cached.text || cached.image || cached.error)) {
        this.aiModalReportId = id;
        return;
      }

      this.aiAnalysis[id] = { loading: true, text: null, image: null, error: null };
      this.aiModalReportId = id;
      const a = this.aiAnalysis[id];
      try {
        const textRes = await this.aiApi.classifyIncident(
          `${report.title || ""}. ${report.description || ""}`.trim(),
          report.location || "",
          report.district || ""
        );
        if (textRes && textRes.status === 200) a.text = textRes.data;

        const imgUrl = report.imageUrl || report.image;
        if (imgUrl) {
          const imgRes = await this.aiApi.analyzeEvidence(imgUrl, "IMAGE", report.description || "");
          if (imgRes && imgRes.status === 200) a.image = imgRes.data;
        }

        if (!a.text && !a.image) a.error = "No se pudo obtener el análisis de IA. Verifica el servicio.";
      } catch (e) {
        console.error("AI analysis error", e);
        a.error = "Error al analizar con IA.";
      } finally {
        a.loading = false;
        try {
          localStorage.setItem(this.aiCacheKey(id), JSON.stringify({ loading: false, text: a.text, image: a.image, error: a.error }));
        } catch (e) { /* ignore */ }
      }
    },
    sortReports(list) {
      const time = (r) => (r.createdAt ? new Date(r.createdAt).getTime() : 0);
      const copy = [...list];
      if (this.sortBy === "recent") return copy.sort((a, b) => time(b) - time(a));
      if (this.sortBy === "oldest") return copy.sort((a, b) => time(a) - time(b));
      // "urgency": primero por urgencia, luego más reciente
      return copy.sort((a, b) => this.urgencyScore(b) - this.urgencyScore(a) || time(b) - time(a));
    },
    normalizeSearch(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    },
    sameDistrict(value, expected) {
      return Boolean(value && expected) && this.normalizeSearch(value) === this.normalizeSearch(expected);
    },
    reportSearchText(report) {
      const fields = [
        report.id,
        report.title,
        report.description,
        report.location,
        report.district,
        report.rejectionReason,
        report.type,
        this.typeLabel(report.type),
        report.state,
        this.stateLabel(report.state),
        this.urgencyLabel(report),
        report.createdAt,
        report.userId,
        this.reportUserName(report)
      ];

      return this.normalizeSearch(fields.filter(Boolean).join(" "));
    },
    clearFilters() {
      this.typeFilter = "";
      this.stateFilter = "";
      this.districtFilter = "";
      this.dateFrom = "";
      this.dateTo = "";
      this.urgencyFilter = "";
      this.sortBy = "urgency";
    },
    stateLabel(state) {
      const labels = {
        PENDING: this.$t("dashboard.states.PENDING"),
        IN_REVIEW: this.$t("dashboard.states.IN_REVIEW"),
        APPROVED: this.$t("dashboard.states.APPROVED"),
        ATTENDED: this.$t("dashboard.states.ATTENDED"),
        REJECTED: this.$t("dashboard.states.REJECTED")
      };
      return labels[state] || state;
    },
    typeLabel(type) {
      const labels = {
        ROBBERY: this.$t("reportForm.placeholders.robbery"),
        ACCIDENT: this.$t("reportForm.placeholders.accident"),
        DARK_AREA: this.$t("reportForm.placeholders.dark_area"),
        HARASSMENT: this.$t("reportForm.placeholders.harassment"),
        OTHER: this.$t("reportForm.placeholders.other")
      };
      return labels[type] || type;
    }
  }
};
</script>

<template>
  <ToolbarCitizen />
  <main class="dashboard">
    <section class="hero">
      <h1>{{ $t("dashboard.title") }}</h1>
      <button @click="refresh">{{ $t("dashboard.refresh") }}</button>
    </section>

    <section class="stats">
      <article><strong>{{ stats.total }}</strong><span>{{ $t("dashboard.total") }}</span></article>
      <article><strong>{{ stats.pending }}</strong><span>{{ $t("dashboard.pending") }}</span></article>
      <article><strong>{{ stats.review }}</strong><span>{{ $t("dashboard.inReview") }}</span></article>
      <article><strong>{{ stats.approved }}</strong><span>{{ $t("dashboard.approved") }}</span></article>
      <article><strong>{{ stats.attended }}</strong><span>{{ $t("dashboard.attended") }}</span></article>
      <article><strong>{{ stats.rejected }}</strong><span>{{ $t("dashboard.rejected") }}</span></article>
      <article class="danger"><strong>{{ stats.emergencies }}</strong><span>{{ $t("dashboard.emergencies") }}</span></article>
    </section>

    <section class="filters">
      <select v-model="typeFilter">
        <option value="">{{ $t("dashboard.allTypes") }}</option>
        <option value="ROBBERY">{{ typeLabel("ROBBERY") }}</option>
        <option value="ACCIDENT">{{ typeLabel("ACCIDENT") }}</option>
        <option value="DARK_AREA">{{ typeLabel("DARK_AREA") }}</option>
        <option value="HARASSMENT">{{ typeLabel("HARASSMENT") }}</option>
        <option value="OTHER">{{ typeLabel("OTHER") }}</option>
      </select>
      <select v-model="stateFilter">
        <option value="">{{ $t("dashboard.allStates") }}</option>
        <option value="PENDING">{{ $t("dashboard.states.PENDING") }}</option>
        <option value="IN_REVIEW">{{ $t("dashboard.states.IN_REVIEW") }}</option>
        <option value="APPROVED">{{ $t("dashboard.states.APPROVED") }}</option>
        <option value="ATTENDED">{{ $t("dashboard.states.ATTENDED") }}</option>
        <option value="REJECTED">{{ $t("dashboard.states.REJECTED") }}</option>
      </select>
      <input v-model="districtFilter" :placeholder="$t('dashboard.districtFilter')" />
      <select v-model="urgencyFilter">
        <option value="">{{ $t("dashboard.allUrgencies") }}</option>
        <option value="EMERGENCY">{{ $t("dashboard.urgencyEmergency") }}</option>
        <option value="NORMAL">{{ $t("dashboard.urgencyNormal") }}</option>
      </select>
      <label class="date-field">{{ $t("dashboard.dateFrom") }}
        <input type="date" v-model="dateFrom" />
      </label>
      <label class="date-field">{{ $t("dashboard.dateTo") }}
        <input type="date" v-model="dateTo" />
      </label>
      <select v-model="sortBy">
        <option value="urgency">{{ $t("dashboard.sortUrgency") }}</option>
        <option value="recent">{{ $t("dashboard.sortRecent") }}</option>
        <option value="oldest">{{ $t("dashboard.sortOldest") }}</option>
      </select>
      <button type="button" class="clear-btn" @click="clearFilters">{{ $t("dashboard.clearFilters") }}</button>
    </section>

    <section v-if="emergencies.length" class="emergencies">
      <h2>{{ $t("dashboard.activeEmergencies") }}</h2>
      <article v-for="alert in emergencies" :key="alert.id" class="emergency-card">
        <strong>{{ alert.location }}</strong>
        <p>{{ alert.description }}</p>
        <button @click="openEmergencyMap(alert)">{{ $t("dashboard.viewMap") }}</button>
        <a :href="whatsappUrl(alert)" target="_blank">{{ $t("dashboard.coordinateWhatsapp") }}</a>
      </article>
    </section>

    <section class="report-list">
      <article v-for="report in filteredReports" :key="report.id" class="report-card" :class="{ emergency: isEmergencyReport(report), attended: report.state === 'ATTENDED' }">
        <button v-if="reportImage(report)" type="button" class="report-media-button" @click="openEvidence(report)">
          <img class="report-thumb" :src="reportImage(report)" :alt="$t('dashboard.evidenceAlt')" />
        </button>
        <button v-else-if="reportPrimaryMediaUrl(report)" type="button" class="report-media-button report-media-thumb" @click="openEvidence(report)">
          <strong>{{ reportMediaTypes(report).join(" + ") }}</strong>
          <span>{{ $t("reports.view_evidence") }}</span>
        </button>
        <div class="report-content">
          <div class="report-main-info">
            <h2>
            {{ report.title }}
            <span class="urgency-badge" :class="'urgency-' + urgencyLevel(report).toLowerCase()">{{ urgencyLabel(report) }}</span>
            </h2>
            <p>{{ report.location }}<template v-if="report.district"> · {{ report.district }}</template></p>
          <p>{{ typeLabel(report.type) }} · {{ stateLabel(report.state) }}</p>
            <p>{{ report.description }}</p>
          </div>
          <dl class="report-meta">
            <div>
              <dt>{{ $t("reports.realUser_label") }}</dt>
              <dd>{{ reportUserName(report) }}</dd>
            </div>
            <div>
              <dt>{{ $t("dashboard.created") }}</dt>
              <dd>{{ formatDate(report.createdAt) }}</dd>
            </div>
          </dl>
          <p v-if="report.rejectionReason" class="rejection-reason">{{ $t("dashboard.rejectReason", { reason: report.rejectionReason }) }}</p>
        </div>
        <div class="actions">
          <button class="map-action" type="button" @click="openReportMap(report)">{{ $t("dashboard.viewMap") }}</button>
          <button :disabled="busyReportId === report.id || report.state === 'APPROVED' || report.state === 'REJECTED' || report.state === 'ATTENDED'" @click="approve(report)">{{ $t("reports.approve") }}</button>
          <button class="attend" :disabled="busyReportId === report.id || report.state !== 'APPROVED'" @click="attend(report)">{{ $t("dashboard.markAttended") }}</button>
          <button class="reject" :disabled="busyReportId === report.id || report.state === 'REJECTED' || report.state === 'ATTENDED'" @click="reject(report)">{{ $t("reports.reject") }}</button>
          <button class="emergency-toggle" :disabled="busyReportId === report.id || report.state === 'REJECTED' || report.state === 'ATTENDED'" @click="toggleEmergency(report)">{{ isEmergencyFlag(report) ? $t("dashboard.unmarkEmergency") : $t("dashboard.markEmergency") }}</button>
          <button class="ai-action" type="button" :disabled="aiAnalysis[report.id] && aiAnalysis[report.id].loading" @click="analyzeReport(report)">{{ aiButtonLabel(report) }}</button>
        </div>
      </article>
    </section>

    <div v-if="aiModalReportId" class="ai-modal-overlay" @click.self="aiModalReportId = null">
      <div class="ai-modal">
        <button class="ai-modal-close" @click="aiModalReportId = null">×</button>
        <h3>Análisis IA del reporte</h3>
        <div v-if="aiAnalysis[aiModalReportId] && aiAnalysis[aiModalReportId].loading" class="ai-loading">Analizando con IA...</div>
        <template v-else-if="aiAnalysis[aiModalReportId]">
          <div v-if="aiAnalysis[aiModalReportId].error" class="ai-invalid">{{ aiAnalysis[aiModalReportId].error }}</div>
          <div v-if="aiAnalysis[aiModalReportId].text" class="ai-block">
            <strong>Título y descripción</strong>
            <p :class="aiAnalysis[aiModalReportId].text.valid === false ? 'ai-invalid' : 'ai-ok'">
              {{ aiAnalysis[aiModalReportId].text.valid === false ? "⚠ El título/descripción no describen un incidente válido." : "Título y descripción válidos." }}
            </p>
            <p>Tipo sugerido: {{ aiAnalysis[aiModalReportId].text.incidentType }} · Severidad: {{ aiAnalysis[aiModalReportId].text.severity }}</p>
            <p>{{ aiAnalysis[aiModalReportId].text.summary }}</p>
          </div>
          <div v-if="aiAnalysis[aiModalReportId].image" class="ai-block">
            <strong>Imagen</strong>
            <p :class="aiAnalysis[aiModalReportId].image.validImage ? 'ai-ok' : 'ai-invalid'">
              {{ aiAnalysis[aiModalReportId].image.validImage ? "Imagen válida como evidencia" : "⚠ La imagen no parece evidencia válida" }}
            </p>
            <p>Tipo detectado: {{ aiAnalysis[aiModalReportId].image.detectedType }}</p>
            <p>{{ aiAnalysis[aiModalReportId].image.summary }}</p>
          </div>
        </template>
      </div>
    </div>
  </main>
</template>

<style scoped>
.dashboard {
  padding: 120px 5vw 40px;
  min-height: 100vh;
  background: #eef5f8;
  color: #18252f;
}

.hero,
.filters,
.stats,
.actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.hero {
  justify-content: space-between;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  margin: 20px 0;
}

.stats article,
.report-card,
.emergency-card {
  background: white;
  border: 1px solid #d8e1e6;
  border-radius: 8px;
  padding: 14px;
}

.stats strong {
  display: block;
  font-size: 28px;
}

.danger strong,
.emergency-card strong {
  color: #c0392b;
}

.filters input,
.filters select {
  padding: 10px;
  border: 1px solid #bccbd3;
  border-radius: 6px;
}

.report-list {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}

.report-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.report-thumb {
  width: 150px;
  height: 112px;
  flex: 0 0 150px;
  border-radius: 7px;
  object-fit: cover;
  background: #d8e1e6;
}

.report-media-button {
  width: 150px;
  height: 112px;
  flex: 0 0 150px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  cursor: pointer;
}

.report-media-button .report-thumb {
  width: 100%;
  height: 100%;
  flex: none;
  display: block;
}

.report-media-button:focus-visible {
  outline: 3px solid #1c597c;
  outline-offset: 3px;
}

.report-media-thumb {
  width: 150px;
  height: 112px;
  flex: 0 0 150px;
  display: grid;
  place-content: center;
  gap: 6px;
  text-align: center;
  border-radius: 7px;
  background: #e8f2f7;
  color: #1c597c;
  border: 1px solid #c8dbe5;
  padding: 10px;
  box-sizing: border-box;
}

.report-media-thumb strong,
.report-media-thumb span {
  overflow-wrap: anywhere;
}

.report-media-thumb span {
  font-size: 12px;
  color: #52616b;
}

.report-content {
  min-width: 0;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(180px, 0.65fr);
  gap: 18px;
  align-items: center;
}

.report-main-info {
  min-width: 0;
  text-align: center;
}

.report-content h2 {
  margin: 0 0 8px;
  font-size: 20px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.report-content p {
  margin: 5px 0;
  overflow-wrap: anywhere;
}

.report-meta {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  margin: 0;
  align-content: center;
}

.report-meta div {
  min-width: 0;
  text-align: center;
}

.report-meta dt {
  color: #52616b;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.report-meta dd {
  margin: 6px 0 0;
  color: #18252f;
  overflow-wrap: anywhere;
}

.rejection-reason {
  grid-column: 1 / -1;
  color: #c0392b;
  font-weight: 700;
}

.date-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #3a4a55;
}

.date-field input {
  padding: 8px;
  border: 1px solid #bccbd3;
  border-radius: 6px;
}

.clear-btn {
  background: #6b7c86;
}

.urgency-badge {
  display: inline-block;
  vertical-align: middle;
  margin-left: 8px;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
  color: #fff;
}

.urgency-emergency {
  background: #c0392b;
}

.urgency-normal {
  background: #6b7c86;
}

.emergency-toggle {
  background: #e08a00;
}

.map-action {
  background: #257180;
}

.attend {
  background: #27ae60;
}

.report-card.emergency {
  border: 3px solid #e53935;
  box-shadow: 0 0 0 4px rgba(229, 57, 53, 0.12);
}

.report-card.attended {
  border-left: 6px solid #27ae60;
}

button,
a {
  background: #1c597c;
  color: white;
  border: 0;
  border-radius: 6px;
  padding: 9px 12px;
  text-decoration: none;
  cursor: pointer;
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.reject {
  background: #c0392b;
}

.emergencies {
  margin: 20px 0;
}

.emergency-card {
  border-left: 6px solid #e53935;
  margin-bottom: 10px;
}

@media (max-width: 760px) {
  .report-card {
    flex-direction: column;
    align-items: stretch;
  }

  .report-thumb {
    width: 100%;
    height: 180px;
    flex-basis: auto;
  }

  .report-media-button {
    width: 100%;
    height: 180px;
    flex-basis: auto;
  }

  .report-media-thumb {
    width: 100%;
    height: 120px;
    flex-basis: auto;
  }

  .report-meta {
    grid-template-columns: 1fr;
  }
}
.ai-action { background: #6a3fb5; }
.ai-log-card { margin-top: 10px; padding: 12px; border: 1px solid #d8e1e6; border-radius: 8px; background: #f7f9fb; grid-column: 1 / -1; }
.ai-block { margin-bottom: 8px; }
.ai-ok { color: #1e7e34; font-weight: 700; }
.ai-invalid { color: #c0392b; font-weight: 700; }
.ai-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 4000; padding: 16px; }
.ai-modal { position: relative; background: #fff; border-radius: 12px; padding: 24px; max-width: 560px; width: 100%; max-height: 85vh; overflow-y: auto; box-shadow: 0 16px 48px rgba(0,0,0,.3); }
.ai-modal-close { position: absolute; top: 10px; right: 14px; background: transparent; border: 0; font-size: 24px; cursor: pointer; color: #555; }
.ai-modal h3 { margin: 0 0 14px; }
.ai-loading { padding: 12px; color: #555; }
</style>
