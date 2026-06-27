<template>
  <header>
    <CitizenToolbar />
  </header>
  <div class="container">
    <div class="search">
      <h1 class="title">{{ mapTitle }}</h1>
      <div class="destinationInput">
        <div class="subtitle"><h2>{{ mapSubtitle }}</h2></div>
        <div class="pv-inputgroup">
          <pv-inputtext class="input" v-model="endLocationInput" type="text" :placeholder="$t('map.placeholder')" @input="fetchSuggestions(endLocationInput)"/>
          <ul v-if="suggestions.length" class="suggestions-list">
            <li v-for="(s, index) in suggestions" :key="index" @click="selectSuggestion(s)">
              {{ s.place_name }}
            </li>
          </ul>
          <button class="icon" @click="calculateRoute" :disabled="isLoading">
            <i class="pi" :class="{'pi-search': !isLoading, 'pi-spinner pi-spin': isLoading}" style="color: black"></i>
          </button>
        </div>
      </div>
      <div v-if="routeError" class="error-message">{{ routeError }}</div>
    </div>
    <div id="map">
      <div id="center-pin"></div>
    </div>

    <div v-if="selectedReport" class="report-popup-overlay" @click.self="selectedReport = null">
      <aside class="report-floating-popup" :class="{ emergency: isEmergencyReport(selectedReport), attended: selectedReport.state === 'ATTENDED' }">
        <button class="close-report-panel" type="button" :aria-label="$t('map.closeDetail')" @click="selectedReport = null">×</button>
        <div class="report-detail-grid">
          <div class="report-detail-main">
            <h3>
              {{ selectedReport.title || $t("reports.details") }}
              <span class="urgency-badge" :class="'urgency-' + urgencyLevel(selectedReport).toLowerCase()">{{ urgencyLabel(selectedReport) }}</span>
            </h3>
            <p>{{ selectedReport.location || selectedReport.address || $t("dashboard.noAddress") }}<template v-if="selectedReport.district"> · {{ selectedReport.district }}</template></p>
            <p>{{ translateType(selectedReport.type) }} · {{ stateLabel(selectedReport.state) }}</p>
            <p v-if="selectedReport.description">{{ selectedReport.description }}</p>
          </div>
          <dl class="report-detail-meta">
            <div>
              <dt>{{ $t("reports.realUser_label") }}</dt>
              <dd>{{ reportUserName(selectedReport) }}</dd>
            </div>
            <div>
              <dt>{{ $t("dashboard.created") }}</dt>
              <dd>{{ formatDate(selectedReport.createdAt) }}</dd>
            </div>
          </dl>
        </div>

        <button v-if="reportPrimaryMediaUrl(selectedReport)" type="button" class="evidence-button" @click="openEvidence(selectedReport)">
          <img v-if="reportImage(selectedReport)" :src="reportImage(selectedReport)" :alt="$t('dashboard.evidenceAlt')" />
          <span v-else>{{ reportMediaTypes(selectedReport).join(" + ") || $t("reports.view_evidence") }}</span>
        </button>

        <p v-if="selectedReport.rejectionReason" class="rejection-reason">{{ $t("dashboard.rejectReason", { reason: selectedReport.rejectionReason }) }}</p>

        <div v-if="isMunicipality" class="report-detail-actions">
          <button :disabled="busyReportId === selectedReport.id || selectedReport.state === 'APPROVED' || selectedReport.state === 'REJECTED' || selectedReport.state === 'ATTENDED'" @click="approve(selectedReport)">{{ $t("reports.approve") }}</button>
          <button class="attend" :disabled="busyReportId === selectedReport.id || selectedReport.state !== 'APPROVED'" @click="attend(selectedReport)">{{ $t("dashboard.markAttended") }}</button>
          <button class="reject" :disabled="busyReportId === selectedReport.id || selectedReport.state === 'REJECTED' || selectedReport.state === 'ATTENDED'" @click="reject(selectedReport)">{{ $t("reports.reject") }}</button>
          <button class="emergency-toggle" :disabled="busyReportId === selectedReport.id || selectedReport.state === 'REJECTED' || selectedReport.state === 'ATTENDED'" @click="toggleEmergency(selectedReport)">{{ isEmergencyFlag(selectedReport) ? $t("dashboard.unmarkEmergency") : $t("dashboard.markEmergency") }}</button>
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import CitizenToolbar from '../../components/toolbar/toolbar-citizen.component.vue';
import { LocationApiService } from '../../services/locationapi.service.js';
import { ReportApiService } from '../../services/reportapi.service.js';
import { AlertApiService } from '../../services/alertapi.service.js';
import { UserApiService } from '../../services/userapi.service.js';

import robTag from '@/assets/rob_tag.png';
import carTag from '@/assets/car_tag.png';
import illumTag from '@/assets/illumination_tag.png';
import acosoTag from '@/assets/acoso_tag.png';
import redMarker from '@/assets/red_marker.png';

export default {
  components: { CitizenToolbar },
  name: 'MapDirections',
  data() {
    return {
      map: null,
      endLocationInput: '',
      currentLocation: { lat: -12.0464, lng: -77.0428 },
      locationApi: new LocationApiService(),
      reportApi: new ReportApiService(),
      userApi: new UserApiService(),
      reportMap: {},
      markers: [],
      userNames: {},
      busyReportId: null,
      isLoading: false,
      routeError: null,
      hasRoute: false,
      routeDistance: 0,
      routeDuration: 0,
      routeInstructions: [],
      alertApi: new AlertApiService(),
      municipalityDistrict: '',
      processedReports: new Set(),
      suggestions: [],
      showSuggestions: false,
      selectedReport: null,
    };
  },
  computed: {
    isMunicipality() {
      const role = sessionStorage.getItem('userRole');
      return role === 'ROLE_MUNICIPALITY' || role === 'ROLE_ADMIN';
    },
    mapTitle() {
      return this.isMunicipality ? this.$t("map.reportMapTitle") : this.$t("map.securityMapTitle");
    },
    mapSubtitle() {
      return this.isMunicipality ? this.$t("map.reportMapSubtitle") : this.$t("map.securityMapSubtitle");
    }
  },
  mounted() {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    this.getCurrentLocation();
    if (this.isMunicipality) this.loadMunicipalityDistrict();
    if (!this.isMunicipality) {
      this.deleteExistingAlerts();
      sessionStorage.setItem('alertsDeletedOnce', 'true');
    }
  },
  watch: {
    '$i18n.locale'(newLocale) {
      this.updateAllPopups();
    }
  },
  methods: {
    async fetchSuggestions(query) {
      if (!query) {
        this.suggestions = [];
        return;
      }
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&autocomplete=true&limit=5`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        this.suggestions = data.features;
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    },
    selectSuggestion(suggestion) {
      this.endLocationInput = suggestion.place_name;
      this.suggestions = [];
      this.map.flyTo({ center: suggestion.center, zoom: 14 });
      this.currentLocation.lat = suggestion.center[1];
      this.currentLocation.lng = suggestion.center[0];
      sessionStorage.setItem("userLat", suggestion.center[1]);
      sessionStorage.setItem("userLng", suggestion.center[0]);
      this.hasRoute = true;
      this.checkNearbyReports();
    },
    async deleteExistingAlerts() {
      try {
        const userId = parseInt(sessionStorage.getItem("userId"));
        if (!userId) {
          console.warn("User ID not found, skipping alert deletion.");
          return;
        }

        const response = await this.alertApi.deleteByUserId(userId);
        console.log(`Alerts deleted for user ID ${userId}:`, response.status);
      } catch (err) {
        console.error("Error deleting alerts for this user:", err);
      }
    },
    calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) *
          Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c * 1000;
    },
    async checkNearbyReports() {
      if (this.isMunicipality) return;
      console.log("📡 Ejecutando checkNearbyReports()...");
      try {
        const [locRes, repRes] = await Promise.all([
          this.locationApi.getAll(),
          this.reportApi.getAll()
        ]);

        const locations = locRes.data;
        const reports = repRes.data;


        const userLat = this.currentLocation.lat;
        const userLng = this.currentLocation.lng;

        for (const loc of locations) {
          if (!loc || loc.latitude === 0 || loc.longitude === 0) continue;
          console.log("Analizando ubicación:", loc);

          if (this.processedReports.has(loc.idReport)) {
            console.log(`Reporte ${loc.idReport} ya procesado`);

          }

          const dist = this.calculateDistance(userLat, userLng, loc.latitude, loc.longitude);
          console.log(`Distancia a reporte ${loc.idReport}: ${dist.toFixed(2)}m`);

          if (dist <= 100) {
            const report = reports.find(r => r.id === loc.idReport);
            if (!report) {
              console.warn(`Reporte no encontrado para loc.idReport=${loc.idReport}`);
            }
            console.log(`Reporte ${loc.idReport} dentro de rango, creando alerta...`);
            await this.createAlert(report);
            this.processedReports.add(loc.idReport);
          }
        }
      } catch (err) {
        console.error("Error in proximity check:", err);
      }
    },
    async createAlert(report) {
      console.log(`Creando alerta para reporte ID ${report.id} (${report.type})`);

      const alertData = {
        location: report.location,
        type: report.type?.toUpperCase(),
        description: report.description,
        userId: parseInt(sessionStorage.getItem("userId")),
        imageUrl: report.imageUrl,
        reportId: report.id
      };

      console.log("Preparando alerta para enviar:", alertData);

      try {
        const existingAlerts = await this.alertApi.getByUserId(alertData.userId);

        if (existingAlerts?.status === 404 || !Array.isArray(existingAlerts?.data)) {
          console.log("No se encontraron alertas previas para este usuario.");
        } else {
          const alreadyExists = existingAlerts.data.some(alert =>
              alert.reportId === alertData.reportId &&
              alert.type === alertData.type &&
              alert.location === alertData.location
          );
          if (alreadyExists) {
            console.log("Alerta ya existente, no se enviará:", alertData);
            return;
          }
        }

        console.log("Enviando alerta al backend...");
        const res = await this.alertApi.create(alertData);
        console.log("Alerta creada exitosamente:", res.data);
      } catch (error) {
        console.error("Error al crear la alerta:");
        if (error.response) {
          console.error("Status:", error.response.status);
          console.error("Datos del backend:", error.response.data);
        } else {
          console.error("Error general:", error.message || error);
        }
      }
    },
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
    stateLabel(state) {
      const labels = {
        PENDING: this.$t("dashboard.states.PENDING"),
        IN_REVIEW: this.$t("dashboard.states.IN_REVIEW"),
        APPROVED: this.$t("dashboard.states.APPROVED"),
        ATTENDED: this.$t("dashboard.states.ATTENDED"),
        REJECTED: this.$t("dashboard.states.REJECTED")
      };
      return labels[state] || state || "Sin estado";
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
    reportImage(report) {
      return report?.imageUrl || report?.image || "";
    },
    reportPrimaryMediaUrl(report) {
      return report?.imageUrl || report?.image || report?.videoUrl || report?.audioUrl || "";
    },
    openEvidence(report) {
      const url = this.reportPrimaryMediaUrl(report);
      if (!url) return;
      window.open(url, "_blank", "noopener,noreferrer");
    },
    reportMediaTypes(report) {
      const types = [];
      if (report?.imageUrl || report?.image) types.push(this.$t("dashboard.mediaImage"));
      if (report?.videoUrl) types.push(this.$t("dashboard.mediaVideo"));
      if (report?.audioUrl) types.push(this.$t("dashboard.mediaAudio"));
      return types;
    },
    userDisplayName(user, fallbackId) {
      const fullName = [user.name, user.lastname].filter(Boolean).join(" ").trim();
      return fullName || user.email || this.$t("dashboard.userFallback", { id: fallbackId });
    },
    reportUserName(report) {
      return this.userNames[report?.userId] || this.$t("dashboard.userFallback", { id: report?.userId || this.$t("dashboard.notAvailable") });
    },
    async loadUserNames(reports) {
      const missingUserIds = [...new Set((reports || []).map((report) => report.userId).filter(Boolean))]
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
    normalizeDistrict(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    },
    sameDistrict(value, expected) {
      return Boolean(value && expected) && this.normalizeDistrict(value) === this.normalizeDistrict(expected);
    },
    isEmergencyFlag(report) {
      return report?.state !== "REJECTED" && report?.state !== "ATTENDED" && report?.isEmergency === true;
    },
    isEmergencyReport(report) {
      return report?.state !== "REJECTED" && report?.state !== "ATTENDED" && (report?.isEmergency === true || report?.hasAlert === true);
    },
    urgencyLevel(report) {
      return this.isEmergencyReport(report) ? "EMERGENCY" : "NORMAL";
    },
    urgencyLabel(report) {
      return this.isEmergencyReport(report)
        ? this.$t("dashboard.urgencyEmergency")
        : this.$t("dashboard.urgencyNormal");
    },
    async runReportAction(report, action) {
      this.busyReportId = report.id;
      try {
        const response = await action();
        if (![200, 201, 202, 204].includes(response?.status)) {
          throw new Error(response?.data?.message || response?.data || this.$t("dashboard.updateError"));
        }
        await this.loadReportsAndMarkers();
        this.selectedReport = this.reportMap[report.id] || null;
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
    async toggleEmergency(report) {
      if (report.state === "REJECTED" || report.state === "ATTENDED") return;
      await this.runReportAction(report, () => this.reportApi.setEmergency(report.id, !this.isEmergencyFlag(report)));
    },
    async loadReportsAndMarkers() {
      try {
        if (this.isMunicipality) await this.loadMunicipalityDistrict();
        const [locationRes, reportRes, alertRes] = await Promise.all([
          this.locationApi.getAll(),
          this.reportApi.getAll(),
          this.alertApi.getAll()
        ]);
        const locations = locationRes.data;
        const reports = Array.isArray(reportRes.data) ? reportRes.data : [];
        const alerts = Array.isArray(alertRes?.data) ? alertRes.data : [];
        const alertReportIds = new Set(alerts.map((alert) => Number(alert.reportId)).filter(Boolean));
        const visibleReports = this.isMunicipality
          ? reports.filter((report) => report.state !== "REJECTED" && this.sameDistrict(report.district, this.municipalityDistrict))
          : reports;

        this.clearAllMarkers();
        this.reportMap = {};
        await this.loadUserNames(visibleReports);
        visibleReports.forEach(report => {
          this.reportMap[report.id] = {
            ...report,
            hasAlert: alertReportIds.has(Number(report.id))
          };
        });
        const markedReportIds = new Set();

        if (this.isMunicipality) {
          visibleReports.forEach((report) => {
            const coordinates = this.reportCoordinates(report);
            if (!coordinates) return;
            const enrichedReport = this.reportMap[report.id];
            this.createMarker(coordinates.lng, coordinates.lat, enrichedReport);
            markedReportIds.add(Number(report.id));
          });
        } else {
          locations.forEach(loc => {
            const lat = parseFloat(loc.latitude);
            const lng = parseFloat(loc.longitude);
            if (isNaN(lat) || isNaN(lng)) return;
            const report = this.reportMap[loc.idReport || loc.idReport];
            if (!report) return;
            this.createMarker(lng, lat, report);
            markedReportIds.add(Number(report.id));
          });
        }

        if (this.isMunicipality) {
          alerts.forEach((alert) => {
            const report = this.reportMap[Number(alert.reportId)];
            if (!report || markedReportIds.has(Number(report.id))) return;
            const coordinates = this.parseCoordinateText(alert.location);
            if (!coordinates) return;
            this.createMarker(coordinates.lng, coordinates.lat, { ...report, hasAlert: true });
            markedReportIds.add(Number(report.id));
          });
        }
        await this.focusRouteReport(locations, visibleReports);
      } catch (error) {
        console.error("Error loading markers:", error);
      }
    },
    async focusRouteReport(locations, reports) {
      const reportId = Number(this.$route.query.reportId);
      const queryLocation = this.$route.query.location;
      if (!reportId && !queryLocation) return;

      if (reportId) {
        const loc = locations.find((item) => Number(item.idReport) === reportId);
        const report = reports.find((item) => Number(item.id) === reportId);
        const coordinates = this.reportCoordinates(report) || this.locationCoordinates(loc);
        const lat = coordinates?.lat;
        const lng = coordinates?.lng;

        if (this.isValidCoordinate(lat, lng)) {
          this.focusCoordinates(lat, lng);
          this.selectedReport = report || this.reportMap[reportId] || null;
          return;
        }
      }

      if (queryLocation) {
        await this.focusLocationText(queryLocation);
      }
    },
    async focusLocationText(location) {
      const coordinates = this.parseCoordinateText(location);
      if (coordinates) {
        this.focusCoordinates(coordinates.lat, coordinates.lng);
        return;
      }

      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxgl.accessToken}&limit=1`
        );
        const data = await response.json();
        const center = data.features?.[0]?.center;
        if (!center) return;
        this.focusCoordinates(center[1], center[0]);
      } catch (error) {
        console.error("Error focusing emergency location:", error);
      }
    },
    parseCoordinateText(value) {
      if (!value || typeof value !== "string") return null;
      const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
      if (!match) return null;

      const first = Number(match[1]);
      const second = Number(match[2]);

      if (this.isValidCoordinate(first, second)) return { lat: first, lng: second };
      if (this.isValidCoordinate(second, first)) return { lat: second, lng: first };
      return null;
    },
    reportCoordinates(report) {
      if (!report) return null;
      const lat = Number(report.latitude);
      const lng = Number(report.longitude);
      if (this.isValidCoordinate(lat, lng)) return { lat, lng };
      if (this.isValidCoordinate(lng, lat)) return { lat: lng, lng: lat };
      return this.parseCoordinateText(report.location || report.address || "");
    },
    locationCoordinates(location) {
      if (!location) return null;
      const lat = Number(location.latitude);
      const lng = Number(location.longitude);
      if (this.isValidCoordinate(lat, lng)) return { lat, lng };
      if (this.isValidCoordinate(lng, lat)) return { lat: lng, lng: lat };
      return null;
    },
    isValidCoordinate(lat, lng) {
      return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    },
    focusCoordinates(lat, lng) {
      this.currentLocation = { lat, lng };
      sessionStorage.setItem("userLat", lat);
      sessionStorage.setItem("userLng", lng);
      this.map.flyTo({ center: [lng, lat], zoom: 16, essential: true });
    },
    createMarker(lng, lat, report) {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      if (this.isEmergencyReport(report)) el.classList.add('emergency-marker');
      if (report.state === 'ATTENDED') el.classList.add('attended-marker');
      const typeToImage = {
        ROBBERY: robTag,
        ACCIDENT: carTag,
        DARK_AREA: illumTag,
        HARASSMENT: acosoTag,
        OTHER: redMarker
      };
      const imageUrl = typeToImage[report.type] || redMarker;
      el.style.backgroundImage = `url('${imageUrl}')`;
      el.style.width = '50px';
      el.style.height = '50px';
      el.style.backgroundSize = 'contain';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.cursor = 'pointer';
      el.style.position = 'relative';
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom'
      }).setLngLat([lng, lat]);
      el.addEventListener('click', () => {
        this.selectedReport = report;
      });
      marker.addTo(this.map);
      this.markers.push({ marker, report, lng, lat });
    },
    buildPopup(report) {
      const translatedType = this.translateType(report.type);
      const image = report.imageUrl || report.image;
      const location = report.location || report.address || '';
      const popupHtml = `
        <article class="report-map-popup">
          <h4>${report.title || this.$t('reports.details')}</h4>
          <p><strong>${this.$t('reports.type_label')}:</strong> ${translatedType}</p>
          <p><strong>${this.$t('reports.address_label')}:</strong> ${location}</p>
          ${image ? `<img src="${image}" alt="${this.$t('dashboard.evidenceAlt')}">` : ''}
        </article>
      `;
      return new mapboxgl.Popup({
        offset: 25,
        maxWidth: '340px',
        closeButton: true
      }).setHTML(popupHtml);
    },
    updateAllPopups() {
      if (this.selectedReport) {
        const freshReport = this.reportMap[this.selectedReport.id];
        this.selectedReport = freshReport || this.selectedReport;
      }
    },
    clearAllMarkers() {
      this.markers.forEach(({ marker }) => marker.remove());
      this.markers = [];
    },
    async calculateRoute() {
      if (!this.endLocationInput) {
        this.routeError = this.$t('map.errors.enterDestination');
        return;
      }
      this.isLoading = true;
      this.routeError = null;
      try {
        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(this.endLocationInput)}.json?access_token=${mapboxgl.accessToken}`
        );
        const data = await response.json();
        if (data.features.length > 0) {
          const location = data.features[0].center;
          this.map.flyTo({ center: location, zoom: 14 });
          this.currentLocation.lat = location[1];
          this.currentLocation.lng = location[0];
          sessionStorage.setItem("userLat", location[1]);
          sessionStorage.setItem("userLng", location[0]);
          this.hasRoute = true;
          await this.checkNearbyReports();
        } else {
          this.routeError = this.$t('map.errors.locationNotFound');
        }
      } catch (error) {
        console.error("Error while searching for location:", error);
        this.routeError = this.$t('map.errors.routeCalculationFailed');
      } finally {
        this.isLoading = false;
      }
    },
    clearRoute() {
      this.hasRoute = false;
      this.map.flyTo({
        center: [this.currentLocation.lng, this.currentLocation.lat],
        zoom: 14
      });
    },
    getCurrentLocation() {
      const storedLat = sessionStorage.getItem("userLat");
      const storedLng = sessionStorage.getItem("userLng");
      if (storedLat && storedLng) {
        this.currentLocation = {
          lat: parseFloat(storedLat),
          lng: parseFloat(storedLng)
        };
        this.initMap();
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
              this.currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              sessionStorage.setItem("userLat", this.currentLocation.lat);
              sessionStorage.setItem("userLng", this.currentLocation.lng);
              this.initMap();
            },
            () => this.initMap()
        );
      } else {
        this.initMap();
      }
    },
    initMap() {
      this.map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [this.currentLocation.lng, this.currentLocation.lat],
        zoom: 14
      });
      this.map.on('load', () => {
        this.loadReportsAndMarkers();
        this.checkNearbyReports();
        this.map.resize();
      });
      this.map.on('moveend', async () => {
        const center = this.map.getCenter();
        this.currentLocation.lat = center.lat;
        this.currentLocation.lng = center.lng;
        sessionStorage.setItem("userLat", center.lat);
        sessionStorage.setItem("userLng", center.lng);
        await this.checkNearbyReports();
      });
      this.map.addControl(new mapboxgl.NavigationControl());
      this.map.addControl(
          new mapboxgl.GeolocateControl({
            positionOptions: {
              enableHighAccuracy: true
            },
            trackUserLocation: true
          })
      );
    }
  },
  beforeUnmount() {
    if (this.map) {
      this.map.remove();
    }
  }
};
</script>

<style scoped>
/* Contenedor oscuro */
.mapboxgl-ctrl-group {
  background-color: #1e1e2f !important; /* fondo contenedor */
  border: 1px solid #333 !important;
  border-radius: 4px;
}

/* Botones oscuros */
.mapboxgl-ctrl-group button {
  background-color: #1e1e2f !important; /* fondo botón */
  color: white !important;
  border: none;
}

/* Íconos dentro del botón (invertir color si es necesario) */
.mapboxgl-ctrl-icon {
  filter: invert(1); /* blanco sobre fondo oscuro */
}

/* Hover */
.mapboxgl-ctrl-group button:hover {
  background-color: #2c2c3c !important;
}


.suggestions-list {
  list-style: none;
  padding: 0;
  margin: 290px 0 auto;
  width: 80%;
  max-width: 600px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 5px;
  position: absolute;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  max-height: 230px; /* altura para 5 items aprox */
  min-height: 230px; /* asegura tamaño fijo aunque haya menos */
  overflow-y: auto;
}

.suggestions-list li {
  padding: 10px;
  cursor: pointer;
  color: black;
  background-color: white;
}

.suggestions-list li:hover {
  background-color: #eee;
}

.p-autocomplete .p-autocomplete-panel .p-autocomplete-items .p-autocomplete-item {
  color: black !important;
}

:global(.custom-marker) {
  border-radius: 999px;
}

:global(.custom-marker.emergency-marker) {
  box-shadow: 0 0 0 3px #e53935, 0 0 12px rgba(229, 57, 53, 0.75);
}

:global(.custom-marker.attended-marker) {
  box-shadow: 0 0 0 3px #27ae60, 0 0 12px rgba(39, 174, 96, 0.75);
}

:deep(html),
:deep(body),
:deep(#app),
:deep(main),
:deep(.container) {
  margin: 0 !important;
  padding: 0 !important;
  width: 100vw !important;
  max-width: 100vw !important;
  box-sizing: border-box;
}

.container {
  margin: 100px auto 0;
  width: 100vw !important;
  max-width: 100vw !important;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

#map {
  width: 90vw !important;
  height: 500px;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  display: block;
  line-height: 0;
  position: relative;
  overflow: hidden;
}

.report-popup-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.35);
  box-sizing: border-box;
}

.report-floating-popup {
  position: relative;
  width: min(760px, 100%);
  max-height: min(82vh, 620px);
  padding: 22px;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.18);
  box-sizing: border-box;
  font-family: Inter, system-ui, sans-serif;
  line-height: 1.45;
  overflow-y: auto;
}

.report-floating-popup.emergency {
  border: 3px solid #e53935;
  box-shadow: 0 0 0 4px rgba(229, 57, 53, 0.12), 0 8px 22px rgba(0, 0, 0, 0.18);
}

.report-floating-popup.attended {
  border-left: 8px solid #27ae60;
}

.report-detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(190px, 0.65fr);
  gap: 18px;
  align-items: center;
}

.report-detail-main {
  min-width: 0;
  text-align: center;
}

.report-detail-meta {
  display: grid;
  gap: 14px;
  margin: 0;
  text-align: center;
}

.report-detail-meta dt {
  color: #52616b;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.report-detail-meta dd {
  margin: 6px 0 0;
  overflow-wrap: anywhere;
}

.report-floating-popup h3 {
  margin: 0 34px 14px 0;
  color: #0f172a;
  font-size: 22px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.report-floating-popup p {
  margin: 10px 0;
  color: #1f2937;
  font-size: 15px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.evidence-button {
  display: grid;
  place-items: center;
  width: 100%;
  height: 240px;
  margin-top: 16px;
  padding: 0;
  border: 1px solid #d8e1e6;
  border-radius: 7px;
  background: #eef5f8;
  color: #1c597c;
  font-weight: 800;
  cursor: pointer;
  overflow: hidden;
}

.evidence-button img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.report-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.report-detail-actions button {
  background: #1c597c;
  color: white;
  border: 0;
  border-radius: 6px;
  padding: 9px 12px;
  cursor: pointer;
}

.report-detail-actions button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.report-detail-actions .reject {
  background: #c0392b;
}

.report-detail-actions .attend {
  background: #27ae60;
}

.report-detail-actions .emergency-toggle {
  background: #e08a00;
}

.urgency-badge {
  display: inline-block;
  vertical-align: middle;
  margin-left: 8px;
  font-size: 12px;
  font-weight: 800;
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

.rejection-reason {
  color: #c0392b;
  font-weight: 800;
}

.close-report-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  min-height: 32px;
  padding: 0;
  border-radius: 50%;
  background: #e8f3fb;
  color: #1f2937;
  font-size: 22px;
  line-height: 1;
}

.close-report-panel:hover {
  background: #c4e2f3;
}

:global(.mapboxgl-popup) {
  max-width: min(340px, calc(100vw - 32px)) !important;
}

:global(.mapboxgl-popup-content) {
  padding: 16px 18px 14px !important;
  border-radius: 8px !important;
  line-height: 1.45 !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22) !important;
}

:global(.mapboxgl-popup-close-button) {
  width: 28px;
  height: 28px;
  min-height: 28px;
  padding: 0;
  margin: 4px;
  color: #334155;
  background: transparent;
  font-size: 20px;
  line-height: 1;
}

:global(.mapboxgl-popup-close-button:hover) {
  color: #0f172a;
  background: #e8f3fb;
}

:global(.report-map-popup) {
  width: 300px;
  max-width: calc(100vw - 68px);
  color: #111827;
  font-family: Inter, system-ui, sans-serif;
}

:global(.report-map-popup h4) {
  margin: 0 26px 10px 0;
  font-size: 17px;
  line-height: 1.25;
  font-weight: 800;
  color: #0f172a;
  overflow-wrap: anywhere;
}

:global(.report-map-popup p) {
  margin: 8px 0;
  font-size: 14px;
  line-height: 1.45;
  color: #1f2937;
  overflow-wrap: anywhere;
}

:global(.report-map-popup img) {
  display: block;
  width: 100%;
  max-height: 170px;
  margin-top: 12px;
  border-radius: 6px;
  object-fit: cover;
}

/* MODO OSCURO: Estilo de botones del mapa */
body.dark .mapboxgl-ctrl-group,
body.dark .maplibregl-ctrl-group {
  background-color: #222 !important;
  border: 1px solid #444 !important;
}

body.dark .mapboxgl-ctrl button,
body.dark .maplibregl-ctrl button {
  background-color: #222 !important;
  color: white !important;
  filter: brightness(200%) !important;
}

body.dark .mapboxgl-ctrl button:hover,
body.dark .maplibregl-ctrl button:hover {
  background-color: #444 !important;
}

body.dark .mapboxgl-ctrl button > svg,
body.dark .maplibregl-ctrl button > svg {
  filter: invert(1) !important;
}

/* Centro del mapa */
#center-pin {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 36px;
  height: 36px;
  background-image: url('/src/assets/pin.png');
  background-size: contain;
  background-repeat: no-repeat;
  z-index: 5;
  pointer-events: none;
}

/* Estilos generales */
.search {
  display: block;
  text-align: center;
  color: white;
  width: 100%;
  margin: 0 auto 20px;
}

.title {
  font-size: 36px;
  margin-bottom: 20px;
}

.subtitle h2 {
  font-size: 24px;
  margin-bottom: 20px;
}

.pv-inputgroup {
  display: flex;
  align-items: center;
  border: 2px solid #333;
  background-color: white;
  border-radius: 5px;
  width: 80%;
  max-width: 600px;
  margin: 0 auto 20px;
  overflow: hidden;
}

body.dark .pv-inputgroup {
  border-color: #aaa;
  background-color: #333;
}

.input {
  border: none;
  padding: 12px;
  width: 90%;
  font-size: 16px;
  outline: none;
}

body.dark .input {
  background-color: #333;
  color: #fff;
}

.icon {
  background-color: white;
  border: none;
  padding: 12px;
  width: 10%;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

body.dark .icon {
  background-color: #333;
}

.icon:hover {
  background-color: #f0f0f0;
}

body.dark .icon:hover {
  background-color: #444;
}

.icon:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.clear-route {
  background-color: #ff4444;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 10px 20px;
  cursor: pointer;
  margin-top: 10px;
  transition: background-color 0.2s;
  font-size: 14px;
}

.clear-route:hover {
  background-color: #cc0000;
}

#sidebar {
  background-color: #f0f0f0;
  width: 98%;
  max-width: 1600px;
  margin: 0 auto;
  border-radius: 8px;
  padding: 15px;
  margin-top: 20px;
  color: #333;
}

body.dark #sidebar {
  background-color: #222;
  color: #eee;
}

#sidebar h3 {
  margin-top: 0;
  color: #2c3e50;
  font-size: 18px;
}

body.dark #sidebar h3 {
  color: #ccc;
}

.route-info {
  background-color: #e0e0e0;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
  font-size: 14px;
}

body.dark .route-info {
  background-color: #333;
  color: #eee;
}

.instruction {
  padding: 8px 0;
  border-bottom: 1px solid #ddd;
  font-size: 14px;
}

body.dark .instruction {
  border-bottom: 1px solid #444;
}

.instruction:last-child {
  border-bottom: none;
}

.error-message {
  color: #ff4444;
  margin-top: 10px;
  background-color: rgba(255, 68, 68, 0.1);
  padding: 10px;
  border-radius: 5px;
  font-size: 14px;
}

body.dark .error-message {
  background-color: rgba(255, 100, 100, 0.1);
}

body.dark .report-floating-popup {
  background: #1e1e1e;
  color: #f5f5f5;
  border: 1px solid #444;
}

body.dark .report-floating-popup h3,
body.dark .report-floating-popup p {
  color: #f5f5f5;
}

body.dark .close-report-panel {
  background: #2a4772;
  color: #ffffff;
}

/* Responsive */
@media (max-width: 768px) {
  .container {
    padding-top: 80px;
  }

  #map {
    height: 400px;
  }

  .title {
    font-size: 28px;
  }

  .subtitle h2 {
    font-size: 20px;
  }

  .pv-inputgroup {
    width: 95%;
  }

  #sidebar {
    width: 95%;
  }

  .report-detail-grid {
    grid-template-columns: 1fr;
  }

  .report-detail-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .evidence-button {
    height: 190px;
  }
}

@media (max-width: 480px) {
  #map {
    height: 300px;
  }

  .title {
    font-size: 24px;
  }

  .input {
    padding: 10px;
    font-size: 14px;
  }

  #sidebar {
    max-height: 200px;
  }
}

</style>

