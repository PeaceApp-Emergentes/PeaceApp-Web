<script>
import { authUserService } from "../../services/authuser.service.js";
import { UserApiService } from "../../services/userapi.service.js";
import { PaymentApiService } from "../../services/paymentapi.service.js";

// Registro exclusivo para MUNICIPALIDADES (la app web es solo para municipalidades).
// Solo se piden los datos necesarios para el negocio municipal.
const MUNICIPALITY_ROLE = "ROLE_MUNICIPALITY";
const DEFAULT_PROFILE_IMAGE =
  "https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg";

// Distritos de Lima Metropolitana y Callao, ordenados alfabéticamente por provincia.
const DISTRICTS_BY_PROVINCE = {
  "Lima": [
    "Ancón",
    "Ate",
    "Barranco",
    "Breña",
    "Carabayllo",
    "Chaclacayo",
    "Chorrillos",
    "Cieneguilla",
    "Comas",
    "El Agustino",
    "Independencia",
    "Jesús María",
    "La Molina",
    "La Victoria",
    "Lima (Cercado)",
    "Lince",
    "Los Olivos",
    "Lurigancho-Chosica",
    "Lurín",
    "Magdalena del Mar",
    "Miraflores",
    "Pachacámac",
    "Pucusana",
    "Pueblo Libre",
    "Puente Piedra",
    "Punta Hermosa",
    "Punta Negra",
    "Rímac",
    "San Bartolo",
    "San Borja",
    "San Isidro",
    "San Juan de Lurigancho",
    "San Juan de Miraflores",
    "San Luis",
    "San Martín de Porres",
    "San Miguel",
    "Santa Anita",
    "Santa María del Mar",
    "Santa Rosa",
    "Santiago de Surco",
    "Surquillo",
    "Villa El Salvador",
    "Villa María del Triunfo"
  ],
  "Callao": [
    "Bellavista",
    "Callao (Cercado)",
    "Carmen de la Legua Reynoso",
    "La Perla",
    "La Punta",
    "Mi Perú",
    "Ventanilla"
  ]
};

export default {
  data() {
    return {
      authService: new authUserService(),
      userApiService: new UserApiService(),
      paymentApiService: new PaymentApiService(),
      confirmPassword: "",
      isSubmitting: false,
      districtSearch: "",
      isDistrictDropdownOpen: false,
      formData: {
        municipalityName: "",
        city: "",
        district: "",
        institutionalEmail: "",
        phonenumber: "",
        password: "",
        profileImage: DEFAULT_PROFILE_IMAGE
      },
      error: null,
      success: null
    };
  },
  computed: {
    /** Provincias disponibles (Lima y Callao). */
    availableProvinces() {
      return Object.keys(DISTRICTS_BY_PROVINCE);
    },
    /** Distritos filtrados según la provincia seleccionada y el texto de búsqueda. */
    filteredDistricts() {
      if (!this.formData.city) return [];
      const all = DISTRICTS_BY_PROVINCE[this.formData.city] || [];
      if (!this.districtSearch) return all;
      const search = this.districtSearch.toLowerCase();
      return all.filter(d => d.toLowerCase().includes(search));
    }
  },
  methods: {
    onCityChange() {
      // Al cambiar la provincia, reseteamos el distrito seleccionado.
      this.formData.district = "";
      this.districtSearch = "";
    },

    openDistrictDropdown() {
      if (!this.formData.city) {
        this.error = this.$t("userForm.select_city_first");
        return;
      }
      this.isDistrictDropdownOpen = true;
      this.$nextTick(() => {
        const input = this.$refs.districtSearchInput;
        if (input) input.focus();
      });
    },

    selectDistrict(district) {
      this.formData.district = district;
      this.districtSearch = "";
      this.isDistrictDropdownOpen = false;
    },

    closeDistrictDropdown() {
      // Timeout para permitir que el click en una opción se registre antes de cerrar.
      setTimeout(() => {
        this.isDistrictDropdownOpen = false;
      }, 200);
    },

    normalizeMunicipalityPhone(phone) {
      const compactPhone = String(phone || "").trim().replace(/[\s\-()]/g, "");
      if (/^9\d{8}$/.test(compactPhone)) return compactPhone;
      if (/^\+519\d{8}$/.test(compactPhone)) return compactPhone;
      if (/^01\d{7}$/.test(compactPhone)) return compactPhone;
      if (/^\d{7}$/.test(compactPhone)) return `01${compactPhone}`;
      return null;
    },

    validateInputs() {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

      if (!this.formData.municipalityName || !this.formData.city || !this.formData.district) {
        this.error = this.$t("userForm.complete_municipality_data");
        return false;
      }
      if (!emailRegex.test(this.formData.institutionalEmail)) {
        this.error = this.$t("userForm.invalid_institutional_email");
        return false;
      }
      const normalizedPhone = this.normalizeMunicipalityPhone(this.formData.phonenumber);
      if (!normalizedPhone) {
        this.error = this.$t("userForm.invalid_municipality_phone");
        return false;
      }
      this.formData.phonenumber = normalizedPhone;
      if (!passwordRegex.test(this.formData.password)) {
        this.error = this.$t("userForm.invalid_password");
        return false;
      }
      if (this.formData.password !== this.confirmPassword) {
        this.error = this.$t("userForm.password_mismatch");
        return false;
      }
      return true;
    },

    async createMunicipalityAccount() {
      if (this.isSubmitting) return;
      this.isSubmitting = true;
      this.error = null;
      this.success = null;

      if (!this.validateInputs()) {
        this.isSubmitting = false;
        return;
      }

      // El correo institucional es el usuario de la cuenta municipal.
      const username = this.formData.institutionalEmail.trim();

      // Guardar los datos del registro para crear la cuenta DESPUES del pago.
      const pending = {
        username,
        password: this.formData.password,
        municipalityName: this.formData.municipalityName.trim(),
        city: this.formData.city.trim(),
        district: this.formData.district.trim(),
        institutionalEmail: username,
        phone: this.normalizeMunicipalityPhone(this.formData.phonenumber),
        profileImage: this.formData.profileImage
      };
      sessionStorage.setItem("pendingMunicipalitySignup", JSON.stringify(pending));

      try {
        // Crear la sesion de pago (suscripcion mensual) y redirigir a Stripe Checkout.
        const origin = window.location.origin;
        const checkoutResponse = await this.paymentApiService.createCheckoutSession({
          institutionalEmail: username,
          municipalityName: pending.municipalityName,
          successUrl: `${origin}/payment-success`,
          cancelUrl: `${origin}/payment-cancel`
        });

        const url = checkoutResponse?.data?.url;
        if (url) {
          window.location.href = url;
        } else {
          this.error = checkoutResponse?.data?.message || "No se pudo iniciar el pago. Intenta nuevamente.";
          this.isSubmitting = false;
        }
      } catch (error) {
        console.error("Payment error:", error);
        this.error = error?.response?.data?.message || "No se pudo iniciar el pago.";
        this.isSubmitting = false;
      }
    },

    submit() {
      this.createMunicipalityAccount();
    },

    restrictToDigits(event) {
      if (!/^\d$/.test(event.key)) event.preventDefault();
    }
  }
};
</script>

<template>
  <form class="form" @submit.prevent="submit">
    <p class="message">
      {{ $t("userForm.municipality_message") }}
    </p>

    <!-- Fila 1: Nombre de municipalidad -->
    <div class="flex">
      <input :placeholder="$t('userForm.municipality_name')" class="input-style" type="text" required v-model="formData.municipalityName" />
    </div>

    <!-- Fila 2: Provincia / Ciudad + Distrito (combo boxes) -->
    <div class="flex">
      <div class="select-wrapper">
        <label class="select-label">{{ $t("userForm.province_city") }}</label>
        <select class="input-style select-style" v-model="formData.city" @change="onCityChange" required>
          <option value="" disabled>{{ $t("userForm.select_province") }}</option>
          <option v-for="province in availableProvinces" :key="province" :value="province">
            {{ province }}
          </option>
        </select>
      </div>

      <div class="select-wrapper">
        <label class="select-label">{{ $t("userForm.district") }}</label>
        <div class="district-combobox" @click="openDistrictDropdown">
          <input
            type="text"
            class="input-style combobox-input"
            :placeholder="formData.district || $t('userForm.select_district')"
            v-model="districtSearch"
            ref="districtSearchInput"
            @focus="openDistrictDropdown"
            @blur="closeDistrictDropdown"
            autocomplete="off"
          />
          <span class="combobox-arrow">&#9662;</span>
          <!-- Valor real para validación -->
          <input type="hidden" :value="formData.district" required />
        </div>
        <ul class="district-dropdown" v-show="isDistrictDropdownOpen && filteredDistricts.length > 0">
          <li
            v-for="district in filteredDistricts"
            :key="district"
            class="district-option"
            :class="{ selected: formData.district === district }"
            @mousedown.prevent="selectDistrict(district)"
          >
            {{ district }}
          </li>
        </ul>
        <p v-if="isDistrictDropdownOpen && filteredDistricts.length === 0 && districtSearch" class="no-results">
          {{ $t("userForm.no_districts") }}
        </p>
      </div>
    </div>

    <!-- Fila 3: Email institucional + Teléfono -->
    <div class="flex">
      <input :placeholder="$t('userForm.institutional_email')" class="input-style" type="email" required v-model="formData.institutionalEmail" />
      <input :placeholder="$t('userForm.municipality_phone')" class="input-style" type="tel" required maxlength="12" v-model="formData.phonenumber" />
    </div>

    <!-- Fila 4: Contraseñas -->
    <div class="flex">
      <input :placeholder="$t('userForm.password')" class="input-style" type="password" required v-model="formData.password" />
      <input :placeholder="$t('userForm.confirm_password')" class="input-style" type="password" required v-model="confirmPassword" />
    </div>

    <label class="material-checkbox">
      <input type="checkbox" required />
      <span class="checkmark"></span>
      {{ $t('userForm.term') }}
    </label>

    <button class="submit-btn" type="submit" :disabled="isSubmitting">
      {{ isSubmitting ? $t("userForm.creating") : $t('userForm.submit') }}
    </button>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="success" class="success">{{ success }}</p>
  </form>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  max-width: 560px;
  width: min(560px, calc(100vw - 40px));
  margin: 0 auto;
  padding: 22px;
  border-radius: 16px;
  align-items: center;
  background-color: #55B0DB;
  box-sizing: border-box;
}

.form button {
  height: auto;
  margin: 0;
}

.role-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: min(360px, 100%);
  gap: 8px;
  margin: 0 auto 18px;
}

.role-switch button,
.submit-btn {
  font-size: 15px;
  padding: 10px 14px;
  border: 0;
  background-color: #c4e2f3;
  color: #161616;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
  width: 100%;
  max-width: none;
  margin: 0;
  line-height: 1.2;
  height: 40px;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

.role-switch button.active,
.submit-btn {
  background-color: #1c597c;
  color: white;
}

.role-switch button:hover {
  background-color: #d9edf8;
}

.role-switch button.active:hover,
.submit-btn:hover {
  background-color: #174a67;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.submit-btn {
  width: min(220px, 100%);
  margin-top: 12px;
}

.message {
  color: #2f2f2f;
  font-size: 14px;
  text-align: center;
  margin-bottom: 10px;
}

.flex {
  display: flex;
  gap: 30px;
  width: 100%;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.input-style {
  flex: 1;
  width: 100%;
  min-width: 180px;
  margin: 0;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 14px;
  box-sizing: border-box;
  height: 38px;
}

/* Select / Combobox Styles */
.select-wrapper {
  flex: 1;
  min-width: 180px;
  position: relative;
}

.select-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #1a3d52;
  margin-bottom: 4px;
  letter-spacing: 0.3px;
}

.select-style {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23555' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 30px;
  cursor: pointer;
  background-color: #fff;
}

.select-style:focus {
  outline: none;
  border-color: #1c597c;
  box-shadow: 0 0 0 2px rgba(28, 89, 124, 0.25);
}

.district-combobox {
  position: relative;
  cursor: pointer;
}

.combobox-input {
  cursor: pointer;
  padding-right: 30px !important;
  background-color: #fff;
}

.combobox-input:focus {
  outline: none;
  border-color: #1c597c;
  box-shadow: 0 0 0 2px rgba(28, 89, 124, 0.25);
}

.combobox-input::placeholder {
  color: #333;
  opacity: 1;
}

.combobox-arrow {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #555;
  pointer-events: none;
}

.district-dropdown {
  position: absolute;
  z-index: 100;
  width: 100%;
  max-height: 220px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #b0cfdf;
  border-top: none;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  list-style: none;
  margin: 0;
  padding: 0;
}

.district-option {
  padding: 9px 14px;
  font-size: 13.5px;
  color: #222;
  cursor: pointer;
  transition: background 0.15s;
}

.district-option:hover {
  background: #dceef7;
}

.district-option.selected {
  background: #1c597c;
  color: #fff;
  font-weight: 600;
}

.no-results {
  font-size: 12px;
  color: #8a0018;
  margin-top: 4px;
}

/* End Select / Combobox */

.material-checkbox {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #333;
  margin-top: 8px;
}

.material-checkbox input[type="checkbox"] {
  margin-right: 8px;
}

.error {
  color: #8a0018;
  margin-top: 10px;
  font-size: 13px;
  text-align: center;
}

.success {
  color: #0f6b2f;
  margin-top: 10px;
  font-size: 13px;
  text-align: center;
}

@media (max-width: 768px) {
  .flex {
    flex-direction: column;
  }
}
</style>


