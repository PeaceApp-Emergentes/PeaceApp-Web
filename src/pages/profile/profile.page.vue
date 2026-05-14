<script>
import ToolbarCitizen from "../../components/toolbar/toolbarCitizen.component.vue";
import UserProfilePage from "../../components/profile/citizen/user-profile.page.vue";
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
      userInfo: {},
      userService: new UserApiService(),
    };
  },
  methods: {
    getUserEmail() {
      this.userEmail = localStorage.getItem('userEmail');
      console.log('localStorage:', {
        userEmail: this.userEmail,
        token: localStorage.getItem('authToken')
      });
    },

    async fetchUserInfo() {
      if (!this.userEmail) {
        console.warn("No user email found.");
        return;
      }

      try {
        console.log("Buscando usuario con email:", this.userEmail);
        const response = await this.userService.getUserByEmail(this.userEmail);
        this.userInfo = response.data || {};
        localStorage.setItem('userInfo', JSON.stringify(this.userInfo));
        console.log("User info:", this.userInfo);
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    }
  },
  created() {
    this.getUserEmail();
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
