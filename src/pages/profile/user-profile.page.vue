<script>
import CitizenToolbar from "../../components/toolbar/toolbar-citizen.component.vue";
import EditUser from "./user-edit-profile.page.vue";

export default {
  components: {
    CitizenToolbar,
    EditUser
  },
  props: {
    user: Object,
    role: String
  },
  data() {
    return {
      showPopup: false
    };
  },
  computed: {
    isMunicipality() {
      return this.role === 'ROLE_MUNICIPALITY' || !!this.user.municipalityName;
    },
    isAdmin() {
      return this.role === 'ROLE_ADMIN';
    },
    fullName() {
      if (this.isMunicipality) return this.user.municipalityName || 'Municipalidad';
      return `${this.user.name || ''} ${this.user.lastname || ''}`.trim();
    },
    email() {
      return this.user.institutionalEmail || this.user.email || '';
    },
    phone() {
      return this.user.phone || this.user.phonenumber || '';
    },
    profileImage() {
      return this.user.profileImage || this.user.profile_image || 'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg';
    }
  },
  methods: {
    openPopup() {
      this.showPopup = true;
    },
    logout() {
      ['authToken', 'userEmail', 'userRole', 'iamUserId', 'userId', 'userInfo', 'municipalityInfo']
        .forEach((k) => localStorage.removeItem(k));
      this.$router.push('/');
    }
  }
};
</script>

<template>
  <div>
    <header>
      <CitizenToolbar />
    </header>
    <div class="padre">
      <div class="container">
        <div class="left">
          <img :src="profileImage" alt="Usuario" class="img" />
        </div>

        <div class="right">
          <h2>{{ fullName }}</h2>
          <p><strong>Email:</strong> {{ email }}</p>
          <p><strong>{{ $t('profile.user.phone') }}:</strong> {{ phone }}</p>
          <p v-if="isMunicipality"><strong>Ciudad:</strong> {{ user.city }}</p>
          <p v-if="isMunicipality"><strong>Distrito:</strong> {{ user.district }}</p>
          <p v-if="isAdmin"><strong>Rol:</strong> Administrador</p>
        </div>

        <div class="buttons">
          <button v-if="!isAdmin" @click="openPopup">{{ $t('profile.edit') }}</button>
          <button @click="logout">{{ $t('profile.logout') }}</button>
        </div>
      </div>
    </div>

    <div class="popup-container" v-if="showPopup">
      <EditUser :user="user" :role="role" @close="showPopup = false" />
    </div>
  </div>
</template>

<style scoped>
.popup-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.left img {
  width: 200px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  border: 2px solid #ddd;
  object-fit: cover;
}

.padre {
  padding: 20vh 0 0 0;
  margin: 0 auto;
}
.show-pass {
  background: none;
  border: none;
  cursor: pointer;
  vertical-align: middle;
  padding: 0;
  margin-left: 10px;
}
.show-pass svg {
  vertical-align: middle;
}

button {
  background-color: #C4E2F3;
  color: #161616;
  font-weight: bolder;
  border: none;
  border-radius: 0.25em;
  padding: 0.5em 1em;
  margin: 0.5em;
  cursor: pointer;
  font-size: 20px;
  height: 45px;
  width: 30%;
}

button:hover {
  background-color: #A1B9C6;
}

.show-pass {
  background: none;
  border: none;
  padding: 0;
  margin-left: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}
.show-pass svg {
  width: 20px;
  height: 20px;
}


.container {
  padding: 10px;
  border-radius: 24px;
  background-color: #55B0DB;
  width: 60vw;
  height: fit-content;
  display: flex;
  flex-wrap: wrap;
  text-align: center;
  margin: auto;
}

.left {
  align-items: center;
  padding: 3vh;
  margin: 0 auto;
}

.right {
  font-family: 'Montserrat', sans-serif;
  color: black;
  text-align: justify;
  font-weight: bold;
  font-size: 18px;
  padding: 3vh;
  flex: 1;
}

.buttons {
  flex: 100%;
  padding: 0 0 3vh 0;
}

@media (max-width: 1000px) {
  .padre {
    padding: 10vh 0 0 0;
  }
  .left {
    padding: 0;
  }
  button {
    width: 90%;
  }
  .container {
    width: 90vw;
    padding: 15px 0 0 0;
    display: inline-block;
  }
  .img {
    align-items: center;
    justify-items: center;
  }
  .popup-container {
    z-index: 1000;
  }
}
/* MODO OSCURO */
body.dark .container {
  background-color: #1e1e1e;
  color: #f5f5f5;
  border: 1px solid #444;
}
</style>
