<script>
import ToolbarCitizen from "../../components/toolbar/toolbar-citizen.component.vue";
import UserProfilePage from "./user-profile.page.vue";
import { UserApiService } from "../../services/userapi.service.js";

export default {
  name: "ProfilePage",
  components: {
    ToolbarCitizen,
    UserProfilePage,
  },
  data() {
    return {
      userEmail: '',
      userRole: '',
      iamUserId: '',
      userInfo: {},
      userService: new UserApiService(),
    };
  },
  methods: {
    getSessionData() {
      this.userEmail = localStorage.getItem('userEmail');
      this.userRole = localStorage.getItem('userRole') || 'ROLE_USER';
      this.iamUserId = localStorage.getItem('iamUserId') || localStorage.getItem('userId');
    },

    async fetchUserInfo() {
      if (!this.userEmail && !this.iamUserId) {
        console.warn("No session profile data found.");
        return;
      }

      try {
        let response = null;

        if (this.userRole === 'ROLE_MUNICIPALITY') {
          response = await this.userService.getMunicipalityByUserId(this.iamUserId);
        } else if (this.userRole === 'ROLE_ADMIN') {
          response = await this.userService.getUserByEmail(this.userEmail);
          if (![200, 201].includes(response?.status)) {
            this.userInfo = {
              id: this.iamUserId,
              name: 'Administrador',
              email: this.userEmail,
              role: this.userRole
            };
            localStorage.setItem('userInfo', JSON.stringify(this.userInfo));
            return;
          }
        } else {
          response = await this.userService.getUserByEmail(this.userEmail);
        }

        if (![200, 201].includes(response?.status)) {
          throw new Error(response?.data?.message || 'No se pudo cargar el perfil.');
        }

        this.userInfo = {
          ...(response.data || {}),
          role: this.userRole
        };
        localStorage.setItem('userInfo', JSON.stringify(this.userInfo));
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    }
  },
  created() {
    this.getSessionData();
    this.fetchUserInfo();
  }
};
</script>

<template>
  <div class="container">
    <ToolbarCitizen />
    <UserProfilePage
        v-if="userInfo && Object.keys(userInfo).length"
        :user="userInfo"
        :role="userRole"
    />
    <p v-else style="color: gray; text-align: center;">Cargando perfil...</p>
  </div>
</template>

<style scoped>
button {
  background-color: #EEF221;
  color: #161616;
  font-weight: bolder;
  border: none;
  border-radius: 0.25em;
  padding: 0.5em 1em;
  margin: 0.5em;
  cursor: pointer;
  font-size: 20px;
  height: 45px;
}

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 10vh 5vw 0 5vw;
  width: 100%;
  box-sizing: border-box;
}
</style>
