<template>
  <header>
    <CitizenToolbar />
  </header>

  <div class="container">

    <!-- TITULO SIEMPRE ARRIBA -->
    <h1 class="page-title">{{ $t('reports.details') }}</h1>

    <div v-if="loading" class="loading">
      {{ $t("reports.loading") }}
    </div>

    <div v-else-if="report" class="report-card">

      <p><strong>{{ $t('reportForm.placeholders.title') }}</strong> {{ report.title }}</p>
      <p><strong>{{ $t('reports.type_label') }}</strong> {{ translateType(report.type) }}</p>

      <p><strong>{{ $t('reports.state_label') }}</strong> {{ translateState(report.state) }}</p>

      <p><strong>{{ $t('reports.address_label') }}</strong> {{ report.location }}</p>

      <p><strong>{{ $t('reports.description_label') }}</strong> {{ report.description }}</p>

      <p>
        <strong>{{ $t('reports.user_label') }}</strong>
        <span v-if="report.citizenFullName">{{ report.citizenFullName }}</span>
        <span v-else>{{ formatDate(report.createdAt) }}</span>
      </p>

      <div v-if="report.state === 'REJECTED' && report.rejectionReason?.trim()" class="rejection-box">
        <strong style="color: #c0392b;">{{ $t('reports.rejected_reason') }}</strong>
        <p>{{ report.rejectionReason }}</p>
      </div>


      <!-- SI NO FUE RECHAZADO → MOSTRAR IMAGEN -->
      <div v-if="hasEvidence" class="evidence-section">
        <strong>{{ $t('reports.evidence_label') }}</strong>

        <div v-if="report.imageUrl" class="image-container">
          <img :src="report.imageUrl" alt="Evidence">
        </div>

        <div v-if="report.videoUrl" class="media-block">
          <span>Video</span>
          <video :src="report.videoUrl" controls preload="metadata"></video>
          <a :href="report.videoUrl" target="_blank" rel="noopener">Abrir video</a>
        </div>

        <div v-if="report.audioUrl" class="media-block">
          <span>Audio</span>
          <audio :src="report.audioUrl" controls preload="metadata"></audio>
          <a :href="report.audioUrl" target="_blank" rel="noopener">Abrir audio</a>
        </div>
      </div>


      <!-- BOTÓN ELIMINAR -->
      <button v-if="canDelete" class="delete-btn" @click="deleteReport">
        {{ $t('reports.delete_report') }}
      </button>

    </div>
    <!-- BOTONES DE ADMIN -->
    <div v-if="isAdmin" class="admin-actions">

      <button v-if="canApprove"
              class="approve-btn"
              @click="approveReport">
        {{ $t('reports.approve') }}
      </button>

      <button v-if="canReject"
              class="reject-btn"
              @click="rejectReport">
        {{ $t('reports.reject') }}
      </button>

      <button v-if="canAttend"
              class="attend-btn"
              @click="attendReport">
        {{ $t('dashboard.markAttended') }}
      </button>

    </div>


  </div>
</template>

<script>
import { ReportApiService } from "../../services/reportapi.service.js";
import { UserApiService } from "../../services/userapi.service.js";
import CitizenToolbar from "../../components/toolbar/toolbar-citizen.component.vue";

export default {
  name: "ReportDetail",
  components: { CitizenToolbar },

  data() {
    return {
      api: new ReportApiService(),
      userService: new UserApiService(),
      report: null,
      loading: true,
      userId: localStorage.getItem("userId"),
      role: localStorage.getItem("userRole")
    };
  },

  async created() {
    await this.fetchReport();
  },

  computed: {
    canDelete() {
      const loggedUserId = Number(localStorage.getItem("userId"));
      const role = localStorage.getItem("userRole");

      return (
          this.report?.userId === loggedUserId ||
          role === "ROLE_ADMIN" ||
          role === "ROLE_MUNICIPALITY"
      );
    },

    isAdmin() {
      const role = localStorage.getItem("userRole");
      return role === "ROLE_ADMIN" || role === "ROLE_MUNICIPALITY";
    },

    // 🔵 Solo se puede aprobar si NO está rechazado
    canApprove() {
      if (!this.report) return false;
      return (
          this.report.state === "PENDING" ||
          this.report.state === "IN_REVIEW"
      );
    },

    // 🔵 Solo se puede rechazar si NO está aprobado
    canReject() {
      if (!this.report) return false;
      return this.report.state === "IN_REVIEW";
    },

    canAttend() {
      if (!this.report) return false;
      return this.report.state === "APPROVED";
    },

    hasEvidence() {
      return Boolean(this.report?.imageUrl || this.report?.videoUrl || this.report?.audioUrl);
    }
  },

  mounted() {
    console.log("🔎 Rol actual:", localStorage.getItem("userRole"));},
  methods: {
    async fetchReport() {
      try {
        const id = this.$route.params.id;
        const res = await this.api.getById(id);

        this.report = res.data;

        // 🔥 SI ES ADMIN Y EL REPORTE ESTÁ EN PENDING → MARCAR COMO "IN REVIEW"
        const role = localStorage.getItem("userRole");
        if ((role === "ROLE_ADMIN" || role === "ROLE_MUNICIPALITY") && this.report.state === "PENDING") {
          console.log("⚡ Marcando reporte como IN REVIEW...");
          await this.api.markInReview(id);
        }

        // Obtener nombre del usuario creador
        if (this.report.userId) {
          const userResp = await this.userService.getUserByEmail(this.report.userId);
          this.report.citizenFullName = userResp?.data?.fullName || null;
        }

      } catch (err) {
        console.error("Error loading report:", err);
      } finally {
        this.loading = false;
      }
    },
    async deleteReport() {
      const ok = confirm(this.$t("reports.confirm_delete"));

      if (!ok) return;

      try {
        const id = this.$route.params.id;
        const res = await this.api.delete(id);

        if (res.status === 200 || res.status === 204) {
          alert(this.$t("reports.delete_success"));
          this.$router.push("/user/report"); // ← REDIRECCIÓN
        }
      } catch (err) {
        console.error("Error deleting report:", err);
        alert(this.$t("reports.delete_error"));
      }
    },
    async approveReport() {
      if (!this.canApprove) return;
      try {
        const id = this.$route.params.id;
        const res = await this.api.approve(id);

        if (res.status === 200) {
          alert(this.$t("reports.approved_success"));
          this.report.state = "APPROVED";
        }
      } catch (err) {
        console.error("Error approving report:", err);
        alert(this.$t("reports.approved_error"));
      }
    },

    async rejectReport() {
      if (!this.canReject) return;
      const reason = prompt(this.$t("reports.reject_reason_prompt"));

      if (!reason) return;

      try {
        const id = this.$route.params.id;
        const res = await this.api.reject(id, reason);

        if (res.status === 200) {
          alert(this.$t("reports.rejected_success"));
          this.report.state = "REJECTED";
        }
      } catch (err) {
        console.error("Error rejecting report:", err);
        alert(this.$t("reports.rejected_error"));
      }
    },
    async attendReport() {
      if (!this.canAttend) return;
      try {
        const id = this.$route.params.id;
        const res = await this.api.attend(id);

        if (res.status === 200) {
          this.report.state = "ATTENDED";
          this.report.isEmergency = false;
        }
      } catch (err) {
        console.error("Error attending report:", err);
        alert(this.$t("dashboard.updateError"));
      }
    },
    translateState(state) {
      const map = {
        PENDING: this.$t('reportForm.placeholders.pending'),
        APPROVED: this.$t('reportForm.placeholders.approved'),
        ATTENDED: this.$t('reportForm.placeholders.attended'),
        REJECTED: this.$t('reportForm.placeholders.rejected'),
        IN_REVIEW: this.$t('reportForm.placeholders.in_review'),
      };
      return map[state] || state;
    },

    translateType(type) {
      const map = {
        ROBBERY: this.$t('reportForm.placeholders.robbery'),
        ACCIDENT: this.$t('reportForm.placeholders.accident'),
        DARK_AREA: this.$t('reportForm.placeholders.dark_area'),
        HARASSMENT: this.$t('reportForm.placeholders.harassment'),
        OTHER: this.$t('reportForm.placeholders.other')
      };
      return map[type] || type;
    },

    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString();
    }
  }
};
</script>

<style scoped>
h1 {
  text-align: center;
  color: white;
}
.container {
  background-color: #1F79AA;
  padding-top: 12vh;
  padding-left: 5vw;
  padding-right: 5vw;
  min-height: 100vh;
  text-align: center;
  display: block;
}

.page-title {
  font-size: 2rem;
  color: white;
  margin-bottom: 2rem;
}

.report-card {
  margin: 0 auto;
  max-width: 600px;
  background: #f9f9f9;
  color: #333;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.15);
  text-align: left;
}

.delete-btn {
  margin-top: 20px;
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
  font-weight: bold;
}

.delete-btn:hover {
  background-color: #c0392b;
}
.admin-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.approve-btn {
  flex: 1;
  background-color: #27ae60;
  color: white;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}

.approve-btn:hover {
  background-color: #1e8449;
}

.reject-btn {
  flex: 1;
  background-color: #e67e22;
  color: white;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}

.reject-btn:hover {
  background-color: #ca6f1e;
}

.attend-btn {
  flex: 1;
  background-color: #27ae60;
  color: white;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}

.attend-btn:hover {
  background-color: #1e8449;
}

.image-container img {
  width: 100%;
  border-radius: 10px;
  margin-top: 10px;
}

.evidence-section {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.media-block {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid #d7e1e7;
  border-radius: 8px;
  background: #fff;
}

.media-block span {
  font-weight: 700;
  color: #1c597c;
}

.media-block video,
.media-block audio {
  width: 100%;
}

.media-block video {
  max-height: 360px;
  border-radius: 8px;
  background: #111;
}

.media-block a {
  color: #1c597c;
  font-weight: 700;
}

.loading, .no-data {
  font-size: 1.2rem;
  margin-top: 40px;
}

body.dark .report-card {
  background: #1e1e1e;
  color: #ddd;
}
</style>
