<template>
  <div class="popup">
    <form @submit.prevent="updateProfile">
      <div class="flex">
        <div v-if="!isMunicipality" class="field">
          <label>{{ $t('userEdit.first_name') }}</label>
          <input class="input-style" type="text" v-model="name" required />
        </div>
        <div v-if="!isMunicipality" class="field">
          <label>{{ $t('userEdit.last_name') }}</label>
          <input class="input-style" type="text" v-model="lastname" required />
        </div>
        <div v-if="isMunicipality" class="field">
          <label>{{ $t("userForm.municipality_name") }}</label>
          <input class="input-style" type="text" v-model="municipalityName" required />
        </div>
        <div v-if="isMunicipality" class="field">
          <label>{{ $t("userForm.district") }}</label>
          <input class="input-style" type="text" v-model="district" required />
        </div>
      </div>

      <div class="flex">
        <div v-if="isMunicipality" class="field">
          <label>{{ $t("userForm.city") }}</label>
          <input class="input-style" type="text" v-model="city" required />
        </div>
        <div class="field">
          <label>{{ $t('userEdit.email') }}</label>
          <input class="input-style" type="email" v-model="email" required />
        </div>
        <div class="field">
          <label>{{ $t('userEdit.phone') }}</label>
          <input class="input-style" type="tel" v-model="phonenumber" required />
        </div>
      </div>

      <div class="flex">
        <div class="field">
          <label>{{ $t('userEdit.profileImage') }}</label>
          <input class="input-style" type="file" accept="image/*" @change="handleImageUpload" />
        </div>
      </div>

      <div class="image-container" v-if="profileImage">
        <img :src="profileImage" :alt="$t('userEdit.imagePreview')" class="preview-img" />
      </div>

      <div class="buttons">
        <button type="submit">{{ $t("userEdit.saveChanges") }}</button>
        <button type="button" @click="closePopup">{{ $t("userEdit.cancel") }}</button>
      </div>
    </form>
  </div>
</template>

<script>
import { UserApiService } from '../../services/userapi.service.js';
import CloudinaryService from '../../services/cloudinary.service.js';

export default {
  props: {
    user: Object,
    role: String,
  },
  data() {
    return {
      name: this.user.name || '',
      lastname: this.user.lastname || '',
      municipalityName: this.user.municipalityName || '',
      city: this.user.city || '',
      district: this.user.district || '',
      email: this.user.institutionalEmail || this.user.email || '',
      phonenumber: this.user.phone || this.user.phonenumber || '',
      profileImage: this.user.profileImage || this.user.profile_image || '',
      userService: new UserApiService(),
    };
  },
  computed: {
    isMunicipality() {
      return this.role === 'ROLE_MUNICIPALITY' || !!this.user.municipalityName;
    }
  },
  methods: {
    async handleImageUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const { secure_url } = await CloudinaryService.uploadImage(file);
        this.profileImage = secure_url;
      } catch (error) {
        console.error('Image upload failed:', error);
        alert(this.$t("userEdit.imageUploadFailed"));
      }
    },

    normalizeMunicipalityPhone(phone) {
      const compactPhone = String(phone || "").trim().replace(/[\s\-()]/g, "");
      if (/^9\d{8}$/.test(compactPhone)) return compactPhone;
      if (/^\+519\d{8}$/.test(compactPhone)) return compactPhone;
      if (/^01\d{7}$/.test(compactPhone)) return compactPhone;
      if (/^\d{7}$/.test(compactPhone)) return `01${compactPhone}`;
      return null;
    },

    async updateProfile() {
      const normalizedMunicipalityPhone = this.isMunicipality
        ? this.normalizeMunicipalityPhone(this.phonenumber)
        : null;
      const citizenPhone = String(this.phonenumber || "").trim();

      if (this.isMunicipality && !normalizedMunicipalityPhone) {
        alert(this.$t("userForm.invalid_municipality_phone"));
        return;
      }

      if (!this.isMunicipality && !/^9\d{8}$/.test(citizenPhone)) {
        alert(this.$t("userEdit.invalidMobilePhone"));
        return;
      }

      try {
        const profileUpdate = this.isMunicipality
          ? await this.userService.updateMunicipality(this.user.id, {
            municipalityName: this.municipalityName,
            city: this.city,
            district: this.district,
            institutionalEmail: this.email,
            phone: normalizedMunicipalityPhone,
            userId: this.user.userId,
            profileImage: this.profileImage
          })
          : await this.userService.updateUser(this.user.id, {
            name: this.name,
            lastname: this.lastname,
            email: this.email,
            phonenumber: citizenPhone,
            userId: this.user.userId,
            profileImage: this.profileImage
          });

        if (![200, 202].includes(profileUpdate.status)) {
          throw new Error(this.$t("userEdit.updateFailed"));
        }

        this.closePopup();
        window.location.reload();
      } catch (error) {
        console.error('Update failed:', error);
        alert(this.$t("userEdit.updateFailed"));
      }
    },

    closePopup() {
      this.$emit('close');
    }
  }
};
</script>

<style scoped>
.popup {
  background-color: #55B0DB;
  border-radius: 10px;
  padding: 20px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  margin: auto;
  color: #000;
}
.flex {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
.field {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.input-style {
  padding: 8px;
  border-radius: 5px;
  border: 1px solid #ccc;
  background-color: #fff;
  color: #000;
}
.password-container {
  display: flex;
  align-items: center;
}
.eye-button {
  background: none;
  border: none;
  cursor: pointer;
  margin-left: 8px;
  padding: 0;
  display: flex;
  align-items: center;
}
.eye-button svg {
  background: transparent !important;
  fill: none !important;
  stroke: #000 !important;
}
.preview-img {
  width: 100px;
  height: 100px;
  margin-top: 10px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  margin-left: auto;
  margin-right: auto;
}
.image-container {
  display: flex;
  justify-content: center;
}
.buttons {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}
button {
  padding: 10px;
  flex: 1;
  border: none;
  border-radius: 5px;
  background-color: #fff;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
  color: #000;
}
button:hover {
  background-color: #eee;
}

/* === MODO OSCURO === */
body.dark .popup {
  background-color: #1e1e1e;
  color: #f5f5f5;
}
body.dark .input-style {
  background-color: #2b2b2b;
  border: 1px solid #444;
  color: #f5f5f5;
}
body.dark .input-style:focus {
  outline: none;
  border-color: #888;
}
body.dark .password-container input.input-style {
  background-color: #2b2b2b;
  color: #f5f5f5;
  border: 1px solid #444;
}
body.dark .password-container input.input-style:focus {
  outline: none;
  border-color: #888;
}
body.dark .eye-button {
  background-color: transparent !important;
  appearance: none;
  -webkit-appearance: none;
}
body.dark .eye-button svg {
  stroke: #f5f5f5 !important;
}
body.dark .password-container {
  background-color: transparent;
}
body.dark button {
  background-color: #2a4772;
  color: #f5f5f5;
}
body.dark button:hover {
  background-color: #3a5c91;
}

/* === RESPONSIVE === */
@media (max-width: 768px) {
  .popup {
    width: 95%;
    padding: 15px;
  }
  .flex {
    flex-direction: column;
  }
  .buttons {
    flex-direction: column;
  }
  .input-style,
  button {
    width: 100%;
  }
  .preview-img {
    width: 80px;
    height: 80px;
  }
}

</style>
