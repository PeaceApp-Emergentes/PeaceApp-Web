<template>
  <header>
    <CitizenToolbar />
  </header>
  <div class="container-fluid">
    <div class="page-container">
      <div class="form-container">
        <h1>{{ $t('reportForm.title') }}</h1>
        <p>{{ $t('reportForm.subtitle') }}</p>
        <form @submit.prevent="createReport" class="form-flex">
          <div class="column">
            <div class="form-group">
              <label class="label-black">{{ $t('reportForm.type') }}</label>
              <select class="input-style" v-model="reportData.type" required>
                <option disabled value="">{{ $t('reportForm.placeholders.type') }}</option>
                <option value="robbery">{{ $t('reportForm.placeholders.robbery') }}</option>
                <option value="accident">{{ $t('reportForm.placeholders.accident') }}</option>
                <option value="dark_area">{{ $t('reportForm.placeholders.dark_area') }}</option>
                <option value="harassment">{{ $t('reportForm.placeholders.harassment') }}</option>
                <option value="other">{{ $t('reportForm.placeholders.other') }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="label-black">{{ $t('reportForm.location') }}</label>
              <input v-model="reportData.address" type="text" :placeholder="$t('reportForm.placeholders.location')" required class="input-style" readonly />
            </div>

            <div class="form-group">
              <label class="label-black">{{ $t('reportForm.title') }}</label>
              <input v-model="reportData.title" type="text" :placeholder="$t('reportForm.placeholders.title')" required class="input-style" />
            </div>

            <div class="form-group">
              <label class="label-black">{{ $t('reportForm.description') }}</label>
              <textarea
                  :placeholder="$t('reportForm.placeholders.description')"
                  class="input-style description-area"
                  rows="3"
                  required
                  v-model="reportData.detail"
                  maxlength="500"
              ></textarea>
            </div>

            <div class="form-group">
              <div class="evidence-container">
                <label class="label-black">{{ $t('reportForm.evidence') }}</label>
                <label for="file-upload" class="upload-button">{{ $t('reportForm.upload') }}</label>
                <input type="file" id="file-upload" class="file-input" @change="handleFileUpload" />
                <div class="image-container" v-if="reportData.image">
                  <img :src="reportData.image" alt="Preview" class="preview-img" />
                </div>
              </div>
            </div>
          </div>

          <div class="column">
            <div id="report-map" class="map-image">
              <div id="center-pin"></div>
            </div>
            <div class="button-container">
              <button type="submit">{{ $t('reportForm.send') }}</button>
            </div>
          </div>

        </form>

        <div v-if="successMessage" :class="{ 'success-message-overlay': true, show: showSuccessMessage }">
          <div class="success-message">
            {{ successMessage }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ReportApiService } from "../../services/reportapi.service.js";
import CitizenToolbar from "../../components/toolbar/toolbarCitizen.component.vue";
import CloudinaryService from "../../services/cloudinary.service.js";
import { nextTick } from "vue";
import mapboxgl from "mapbox-gl";

export default {
  components: { CitizenToolbar },
  name: "report-component",
  data() {
    return {
      reportData: {
        title: "",
        detail: "",
        type: "",
        user_id: 0,
        image: "",
        address: "",
        latitude: null,
        longitude: null
      },
      api: new ReportApiService(),
      successMessage: "",
      showSuccessMessage: false,
      map: null,
      marker: null,
      coordinates: { lat: null, lng: null }
    };
  },
  mounted() {
    nextTick(() => {
      this.initMap();
    });
  },
  methods: {
    async createReport() {
      this.reportData.user_id = parseInt(localStorage.getItem("userId")) || 0;

      if (!this.reportData.image) {
        return alert(this.$t('reportForm.alertImage'));
      }
      if (!this.reportData.address) {
        return alert(this.$t('reportForm.alertAddress'));
      }

      this.reportData.address = this.reportData.address.replace(/,/g, '');

      try {
        // 🔹 Armar payload que coincida con el backend
        const payload = {
          title: this.reportData.title,
          description: this.reportData.detail,
          location: this.reportData.address,
          type: this.reportData.type.toUpperCase(),
          userId: this.reportData.user_id,
          imageUrl: this.reportData.image,
          latitude: this.reportData.latitude?.toString(),
          longitude: this.reportData.longitude?.toString()
        };

        const reportResponse = await this.api.create(payload);
        const reportId = reportResponse?.data?.id;
        if (!reportId) throw new Error(this.$t('reportForm.errorNoReportId'));
        this.successMessage = this.$t('reportForm.successCreated');
        this.showSuccessMessage = true;
        setTimeout(() => {
          this.showSuccessMessage = false;
          this.$router.push({ name: "reports" });
        }, 3000);
      } catch (error) {
        console.error(this.$t('reportForm.errorCreateOrLocation'), error);
      }
    },

    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      try {
        const { secure_url } = await CloudinaryService.uploadImage(file);
        this.reportData.image = secure_url;
      } catch (error) {
        console.error(this.$t('reportForm.errorUploadImage'), error);
        alert(this.$t('reportForm.alertUploadImage'));
      }
    },

    initMap() {
      mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

      const storedLat = localStorage.getItem("userLat");
      const storedLng = localStorage.getItem("userLng");

      let userLocation;

      if (storedLat && storedLng) {
        // Usar ubicación almacenada
        userLocation = [parseFloat(storedLng), parseFloat(storedLat)];
        this.setupMap(userLocation);
      } else {
        // Obtener ubicación del navegador
        navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;

              // Guardar en localStorage
              localStorage.setItem("userLat", lat);
              localStorage.setItem("userLng", lng);

              userLocation = [lng, lat];
              this.setupMap(userLocation);
            },
            (error) => {
              console.error("No se pudo obtener la ubicación:", error);
              const fallback = [-77.0428, -12.0464];
              this.setupMap(fallback);
            }
        );
      }
    },
    setupMap(centerCoords) {
      this.map = new mapboxgl.Map({
        container: "report-map",
        style: "mapbox://styles/mapbox/streets-v11",
        center: centerCoords,
        zoom: 14,
        attributionControl: false
      });

      this.updateAddress(centerCoords);

      this.map.on("moveend", () => {
        const center = this.map.getCenter();
        this.updateAddress([center.lng, center.lat]);
      });
    },

    async updateAddress([lng, lat]) {
      try {
        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`
        );
        const data = await response.json();
        const place = data.features[0]?.place_name || `${lat}, ${lng}`;
        this.reportData.address = place;
        this.reportData.latitude = lat;
        this.reportData.longitude = lng;
      } catch (error) {
        console.error("Reverse geocoding failed:", error);
        this.reportData.address = `${lat}, ${lng}`;
        this.reportData.latitude = lat;
        this.reportData.longitude = lng;
      }
    }
  }
};
</script>




<style scoped>
.map-image {
  width: 100%;
  height: 400px;
  border-radius: 10px;
  margin: 20px 0;
}

.page-container {
  display: flex;
  align-items: center;
  width: fit-content; /* Ensure it spans the entire width */
  color: white;
  margin: auto;
}
.page-container p {
  text-align: center;
  margin: 0 auto; /* Centers the <p> element horizontally */
  font-size: clamp(18px, 5vw, 32px);
  transition: background-color 0.3s;
}
.row {
  display: flex;
}
.column-half{
  flex: 1;
}
.column-half:last-child{
  margin-left: 20px;
}
#report-map {
  position: relative;
}

#center-pin {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -100%);
  width: 36px;
  height: 36px;
  background-image: url('../../assets/pin.png');
  background-size: contain;
  background-repeat: no-repeat;
  z-index: 5;
  pointer-events: none;
}


.column-half input,
.column-half select{
  width:100%;
}

.description-area {
  max-width: 100%;
  width: 100%;
  min-height: 100px;
  max-height: 200px;
  padding: 0.8em;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: clamp(12px, 1.2vw, 16px);
  resize: vertical; /* Allows resizing only vertically */
  box-sizing: border-box;
  overflow-y: auto;
  word-break: break-word;
}
.preview-img {
  width: 100px;
  height: 100px;
  margin-top: 10px;
  border-radius: 10px;
  object-fit: cover;
  display: block;
}
.image-container {
  display: flex;
  justify-content: center;
}
.evidence-container {
  display: flex;
  align-items: center; /* Aligns items vertically in the center */
  justify-content: start; /* Aligns items to the start of the container */
  gap: 20px; /* Provides space between the label and the button */
}

.label-black {
  margin-bottom: 0; /* Removes the bottom margin to align with the button */
}

.upload-button {
  padding: 5px 60px;  /* Increase padding to make the button larger */
  font-size: 18px;  /* Increase font size for better readability */
  background-color: white;
  border-radius: 8px;  /* Slightly larger border-radius for a more rounded look */
  cursor: pointer;
  transition: background-color 0.3s;
  color:black;
}

.upload-button:hover {
  background-color: #A5A5A5;
}

.file-input {
  width: 0;
  height: 0;
  opacity: 0;
  position: absolute;
  pointer-events: none;
}

.column-half {
  width: fit-content;/* Each column takes up equal space */
}
.form-flex {
  display: flex;
  justify-content: space-between;
}

.column {
  flex: 1;
  padding: 0 20px;
}

.form-group.date-time-container {
  display: flex;
  align-items: center;
  justify-content: space-between; /* Ensure equal spacing between date and time inputs */
  margin-bottom: 20px;
}

#date,
#time {
  flex: 1;
  margin-right: 10px;
}
.date-time-container {
  display: flex;
  align-items: center;
}
.label-black {
  color: black;
  text-align: left;
  font-weight: bold;
  font-size: 1.5rem; /* Responsive font size */
}

input, select, textarea {
  width: 100%; /* Full width to be responsive within its container */
  padding: 0.8em; /* Responsive padding */
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: clamp(12px, 1.2vw, 16px);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}
#description {
  width: 100%; /* Full width by default */
  height: 200px; /* Auto height to adjust based on content */
  padding: 0.8em; /* Responsive padding */
  border: 1px solid black;
  font-size: clamp(12px, 1.2vw, 16px);
  transition: background-color 0.3s ease, border-color 0.3s ease;
  resize: none; /* Allow vertical resizing */
  margin: 0;
}
.form-container {
  background-color: #6DC9FF;
  border-radius: 24px;
  flex: 1;
  padding: 40px;
}
/* Media Query for smaller screens */
.form-group {
  margin-bottom: 20px; /* Add bottom margin to the form groups */
}
.date-time-container {
  display: flex;
  align-items: center;
  margin: 0;
}

.date-time-container .label-black {
  width: 80px;
  margin-right: 20px;
}
.button-container button {
  padding: 10px 40px;
  font-size: 20px;
  background-color: #C4E2F3;
  color: #161616;
  font-weight: bolder;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin: 0 auto;
  display: block;
}



h1 {
  color: white;
  font-size: clamp(24px, 5vw, 40px);
  transition: font-size 0.3s ease;
  margin-top: -20px; /* Add negative margin to move the <h1> element up */
}
.form-group {
  margin-bottom: 20px;
  flex: 1;
}

.form-group input, .date-time-container input{
  margin: 10px 0;
}
.date-time-container input{
  height: 40px;
}
label {
  display: block;
  font-weight: bold;
}

button {
  padding: 10px 80px;
  background-color: #C4E2F3;
  color: #161616;
  font-weight: bolder;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 20px;
}
button:hover {
  background-color: #A1B9C6;
}
.container-fluid {
  margin-top: 120px;
  padding: 0 10vw 0 10vw;
}


@media (max-width: 1000px) {
  .form-container input, .form-container select, .form-container textarea, .form-container button {
    font-size: clamp(10px, 2.5vw, 12px); /* Smaller font sizes for all form elements */
  }
  .form-container label {
    font-size: clamp(10px, 2.5vw, 12px); /* Smaller yet readable font sizes for labels */
  }

  .form-group {
    margin-bottom: 10px; /* Reduced margin for tighter layout */
  }
  .button-container button {
    padding: 10px 80px;
    font-size: 20px;
    background-color: #C4E2F3;
    color: #161616;
    font-weight: bolder;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    margin: 0 auto;
    display: block;
  }

  .date-time-container #date,
  .date-time-container #time {
    flex: none; /* Disable flex grow to manage width manually */
    width: 49%; /* Reduce the width of each input */
    padding: 0.6em; /* Smaller padding */
    margin-right: 10px; /* Smaller margin between date and time inputs */
    font-size: clamp(10px, 2.5vw, 12px); /* Smaller font size */
  }
  /* Styles for screens up to 1100px wide */
  .page-container {
    padding: 0.01rem; /* Minimal padding to maintain layout integrity */
  }

  .column-half #district,
  .column-half #location {
    width: 100%; /* Reduce the width of each input */
    padding: 0.7em; /* Smaller padding */
    margin-right: 5px; /* Smaller margin for the district input */
    font-size: clamp(10px, 2.5vw, 12px); /* Smaller font size */
  }
  .column-half:last-child #location {
    margin-right: 0; /* Remove margin for the last input to fit the reduced width */
  }
  .row {
    justify-content: space-between; /* Ensure inputs are closer but neatly aligned */
  }
  .column {
    padding: 0 20px; /* Slightly reduce padding */
    width: 100%; /* Make columns full width */
  }

  .form-group {
    margin-bottom: 15px; /* Adjust spacing */
  }

  .page-container p {
    text-align: center;
    margin: 0 auto; /* Centers the <p> element horizontally */
    font-size: clamp(12px, 3vw, 28px); /* Responsive font sizing */
  }

  .form-flex {
    flex-direction: column;
  }

  .column-half {
    padding: 0; /* Remove column padding */
    display: block; /* Stack inputs vertically */
  }

  .form-group.date-time-container {
    flex-direction: column; /* Stack date and time inputs vertically */
    align-items: stretch; /* Stretch inputs to fill the width */
  }

  .evidence-container {
    flex-direction: column; /* Stack evidence label and button vertically */
  }
  .form-container {
    padding: 25px;
  }
  .container-fluid{
    padding: 10vh 0 0 0; /* Adjust padding for smaller screens */
  }
}

.success-message-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5); /* Black background with transparency */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000; /* Ensure it appears above other elements */
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.5s ease-in-out, visibility 0.5s ease-in-out;
}

.success-message {
  background-color: #d4edda; /* Light green background */
  color: #155724; /* Dark green color for text */
  border: 1px solid #c3e6cb; /* Border to match the background */
  padding: 20px 40px; /* Padding around the text */
  border-radius: 8px; /* Rounded corners */
  font-size: 16px; /* Font size */
  text-align: center; /* Center the text */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Subtle shadow for depth */
}

.success-message-overlay.show {
  opacity: 1;
  visibility: visible;
}

/* MODO OSCURO GENERAL */
body.dark {
  background-color: #121212;
  color: #f5f5f5;
}

body.dark .form-container {
  background-color: #1e1e1e;
  color: #f5f5f5;
}

body.dark .label-black {
  color: #ffffff;
}

body.dark input,
body.dark select,
body.dark textarea {
  background-color: #2a2a2a;
  color: #f5f5f5;
  border: 1px solid #555;
}

body.dark input::placeholder,
body.dark textarea::placeholder {
  color: #bbb;
}

body.dark .description-area {
  background-color: #2a2a2a;
  color: #f5f5f5;
  border-color: #555;
}

body.dark .upload-button {
  background-color: #444;
  color: #f5f5f5;
}

body.dark .upload-button:hover {
  background-color: #666;
}

body.dark .button-container button,
body.dark button {
  background-color: #444;
  color: #fff;
}

body.dark button:hover {
  background-color: #666;
}

body.dark .success-message {
  background-color: #274f35;
  color: #d4edda;
  border-color: #1f4030;
}

body.dark .page-container p {
  color: #e0e0e0;
}

/* Mapa pin no necesita cambios, pero el contenedor podría */
body.dark .map-image {
  border: 1px solid #444;
}

</style>
