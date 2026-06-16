<script>
import { authUserService } from '../../services/authuser.service.js';
import { UserApiService } from "../../services/userapi.service";

export default {
  data() {
    return {
      email: '',
      userApi: new UserApiService(),
      authService: new authUserService()
    };
  },
  methods: {
    redirectLanding() {
      const Link = 'https://peaceapp-landingpage.netlify.app';
      window.location.href = Link;
    },

    async validateAndRedirect() {
      if (this.email.trim() === '') {
        alert(this.$t('main.recover.alert')); // "Por favor, ingresa tu correo."
        return;
      }

      try {
        const dummyPassword = 'owo'; // HOLY FUCK
        const loginResponse = await this.authService.signInUser(this.email, dummyPassword);

        if (loginResponse.status === 200 && loginResponse.data) {
          const user = loginResponse.data;


          localStorage.setItem("recoveryEmail", user.username); // Asumiendo que username === email

          // Redirigimos a pantalla de recuperación
          this.$router.push('/recover');
        } else {
          alert(this.$t('main.recover.notFound')); // "Correo no registrado."
        }
      } catch (error) {
        console.error('Error during dummy login', error);
        alert(this.$t('main.recover.notFound')); // "Correo no registrado."
      }
    }
  }
};

</script>

<template>
  <div class="padre">
    <div class="container">
      <div class="box1">
        <img class="logo" src="/src/assets/PeaceApp.png" alt="logo" />
        <h2 class="info">{{ $t('main.title') }}</h2>
        <button class="butInfo" @click="redirectLanding">{{ $t('main.buttonInfo') }}</button>
      </div>
      <div class="box2">
        <h3>{{ $t('main.recover.message') }}</h3>
        <div class="input-container">
          <input
              :placeholder="$t('main.email')"
              class="input-style"
              type="email"
              v-model="email"
              required
          />
        </div>
        <div class="bts">
          <button @click="validateAndRedirect">{{ $t('main.recover.send') }}</button>
          <router-link to="/">
            <button>{{ $t('main.recover.know') }}</button>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.padre {
  padding: 20vh 10vw 0 10vw;
}

.logo {
  width: 50%;
}

button {
  background-color: #C4E2F3;
  color: #161616;
  font-weight: bolder;
  border: none;
  border-radius: 0.5em;
  padding: 0.6em 1.2em;
  margin: 0.5em;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease, color 0.3s ease;
}

button:hover {
  background-color: #A1B9C6;
}

body.dark button {
  background-color: #22487A;
  color: #ffffff;
}

body.dark button:hover {
  background-color: #2b5dab;
}

.box2 {
  background-color: #55B0DB;
  font-size: 0.9rem;
  border-radius: 16px;
  padding: 20px;
  transition: background-color 0.3s ease, color 0.3s ease;
}

body.dark .box2 {
  background-color: #1e1e1e !important;
  color: #f5f5f5;
}

.info {
  padding: 50px;
}

.container {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Montserrat', sans-serif;
  color: black;
  flex-wrap: wrap;
  text-align: center;
  margin: auto;
  height: fit-content;
  width: fit-content;
}

body.dark .container {
  color: white;
}

.box1,
.box2 {
  flex: 1;
  padding: 20px;
  margin: 10px;
  height: fit-content;
}

.input-container {
  width: 100%;
  margin-top: 1rem;
}

.input-style {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 14px;
  box-sizing: border-box;
  background-color: white;
  color: black;
  transition: background-color 0.3s ease, color 0.3s ease;
}

body.dark .input-style {
  background-color: #2a2a2a;
  color: #ffffff;
  border: 1px solid #555;
}

.input-style::placeholder {
  color: #888;
}

body.dark .input-style::placeholder {
  color: #ccc;
}

.bts {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

.bts button {
  width: 180px;
  height: 45px;
  font-size: 16px;
}

@media screen and (max-width: 1000px) {
  .container {
    display: block;
    padding: 15vw 0 0 0;
    width: 100%;
  }

  .box1,
  .box2 {
    width: 95%;
    padding: 5px;
  }

  .input-container {
    width: 90%;
    margin: auto;
  }

  .padre {
    padding: 0;
  }

  .bts {
    flex-direction: column;
  }

  .logo {
    width: 100%;
    margin: 0 auto;
  }
}

body.dark, html.dark {
  background-color: #000000 !important;
  background-image: none !important;
}

body.dark #app {
  background-color: #000 !important;
}

</style>
