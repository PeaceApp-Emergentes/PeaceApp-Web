<template>
  <header>
    <CitizenToolbar />
  </header>
  <div class="container">
    <div class="search">
      <h1 class="title">{{ $t('map.find') }}</h1>
      <div class="destinationInput">
        <div class="subtitle"><h2>{{ $t('map.question') }}</h2></div>
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
  </div>
</template>

<script>
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import CitizenToolbar from '../../toolbar/toolbarCitizen.component.vue';
import { LocationApiService } from '../../../services/locationapi.service.js';
import { ReportApiService } from '../../../services/reportapi.service.js';
import { AlertApiService } from '../../../services/alertapi.service.js';

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
      reportMap: {},
      markers: [],
      isLoading: false,
      routeError: null,
      hasRoute: false,
      routeDistance: 0,
      routeDuration: 0,
      routeInstructions: [],
      alertApi: new AlertApiService(),
      processedReports: new Set(),
      suggestions: [],
      showSuggestions: false,
    };
  },
  mounted() {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    this.getCurrentLocation();
    this.deleteExistingAlerts();
    localStorage.setItem('alertsDeletedOnce', 'true');
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
      localStorage.setItem("userLat", suggestion.center[1]);
      localStorage.setItem("userLng", suggestion.center[0]);
      this.hasRoute = true;
      this.checkNearbyReports();
    },
    async deleteExistingAlerts() {
      try {
        const userId = parseInt(localStorage.getItem("userId"));
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
          console.log("🧭 Analizando ubicación:", loc);

          if (this.processedReports.has(loc.idReport)) {
            console.log(`🔁 Reporte ${loc.idReport} ya procesado`);

          }

          const dist = this.calculateDistance(userLat, userLng, loc.latitude, loc.longitude);
          console.log(`📏 Distancia a reporte ${loc.idReport}: ${dist.toFixed(2)}m`);

          if (dist <= 100) {
            const report = reports.find(r => r.id === loc.idReport);
            if (!report) {
              console.warn(`⚠️ Reporte no encontrado para loc.idReport=${loc.idReport}`);
            }
            console.log(`✅ Reporte ${loc.idReport} dentro de rango, creando alerta...`);
            await this.createAlert(report);
            this.processedReports.add(loc.idReport);
          }
        }
      } catch (err) {
        console.error("Error in proximity check:", err);
      }
    },
    async createAlert(report) {
      console.log(`🚀 Creando alerta para reporte ID ${report.id} (${report.type})`);

      const alertData = {
        location: report.location,
        type: report.type?.toUpperCase(),
        description: report.description,
        userId: parseInt(localStorage.getItem("userId")),
        imageUrl: report.imageUrl,
        reportId: report.id
      };

      console.log("🛰️ Preparando alerta para enviar:", alertData);

      try {
        const existingAlerts = await this.alertApi.getByUserId(alertData.userId);

        if (existingAlerts?.status === 404 || !Array.isArray(existingAlerts?.data)) {
          console.log("ℹ️ No se encontraron alertas previas para este usuario.");
        } else {
          const alreadyExists = existingAlerts.data.some(alert =>
              alert.reportId === alertData.reportId &&
              alert.type === alertData.type &&
              alert.location === alertData.location
          );
          if (alreadyExists) {
            console.log("⚠️ Alerta ya existente, no se enviará:", alertData);
            return;
          }
        }

        console.log("📤 Enviando alerta al backend...");
        const res = await this.alertApi.create(alertData);
        console.log("✅ Alerta creada exitosamente:", res.data);
      } catch (error) {
        console.error("❌ Error al crear la alerta:");
        if (error.response) {
          console.error("🔸 Status:", error.response.status);
          console.error("🔸 Datos del backend:", error.response.data);
        } else {
          console.error("🔸 Error general:", error.message || error);
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
    async loadReportsAndMarkers() {
      try {
        const [locationRes, reportRes] = await Promise.all([
          this.locationApi.getAll(),
          this.reportApi.getAll()
        ]);
        const locations = locationRes.data;
        const reports = reportRes.data;
        this.clearAllMarkers();
        this.reportMap = {};
        reports.forEach(report => {
          this.reportMap[report.id] = report;
        });
        locations.forEach(loc => {
          const lat = parseFloat(loc.latitude);
          const lng = parseFloat(loc.longitude);
          if (isNaN(lat) || isNaN(lng)) return;
          const report = this.reportMap[loc.idReport || loc.idReport];
          if (!report) return;
          this.createMarker(lng, lat, report);
        });
      } catch (error) {
        console.error("Error loading markers:", error);
      }
    },
    createMarker(lng, lat, report) {
      const el = document.createElement('div');
      el.className = 'custom-marker';
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
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom'
      }).setLngLat([lng, lat]);
      marker.setPopup(this.buildPopup(report));
      marker.addTo(this.map);
      this.markers.push({ marker, report, lng, lat });
    },
    buildPopup(report) {
      const translatedType = this.translateType(report.type);
      const popupHtml = `
        <div style="font-family: sans-serif; max-width: 250px; color: black;">
          <h4 style="margin: 0 0 8px; font-size: 16px; font-weight: bold;">${report.title}</h4>
          <p style="margin: 4px 0; font-size: 14px;"><strong>${this.$t('reports.type_label')}:</strong> ${translatedType}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>${this.$t('reports.address_label')}:</strong> ${report.address}</p>
          ${report.image ? `<img src="${report.image}" alt="Imagen del reporte" style="width: 100%; margin-top: 8px; border-radius: 4px;">` : ''}
        </div>
      `;
      return new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml);
    },
    updateAllPopups() {
      this.markers.forEach(({ marker, report }) => {
        marker.setPopup(this.buildPopup(report));
      });
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
          localStorage.setItem("userLat", location[1]);
          localStorage.setItem("userLng", location[0]);
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
      const storedLat = localStorage.getItem("userLat");
      const storedLng = localStorage.getItem("userLng");
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
              localStorage.setItem("userLat", this.currentLocation.lat);
              localStorage.setItem("userLng", this.currentLocation.lng);
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
        localStorage.setItem("userLat", center.lat);
        localStorage.setItem("userLng", center.lng);
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