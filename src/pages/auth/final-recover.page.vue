<script>
import { authUserService } from "../../services/authuser.service.js";
import { UserApiService } from "../../services/userapi.service.js";

export default {
  data() {
    return {
      password: '',
      confirmPassword: '',
      authService: new authUserService(),
      userService: new UserApiService(),
      error: null,
      success: null,
      loading: false
    };
  },
  computed: {
    isPasswordValid() {
      const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
      return regex.test(this.password);
    },
    canSubmit() {
      return (
          this.password &&
          this.confirmPassword &&
          this.isPasswordValid &&
          this.password === this.confirmPassword &&
          !this.loading
      );
    }
  },
  methods: {
    async submitPasswordChange() {
      this.error = null;
      this.success = null;
      this.loading = true;

      const recoveryEmail = localStorage.getItem("recoveryEmail");
      const authToken = localStorage.getItem("authToken");
      const userId = parseInt(localStorage.getItem("userId"));

      try {
        if (recoveryEmail) {
          const payload = {
            username: recoveryEmail,
            password: this.password
          };
          const response = await this.authService.changePassword(payload);
          if (response.status === 202) {
            this.success = this.$t('main.recover.success');
            localStorage.removeItem("recoveryEmail");
            setTimeout(() => this.$router.push('/'), 3000);
          } else {
            this.error = this.$t('main.recover.error');
          }
        } else if (authToken && userId) {
          const payload = { password: this.password };
          const response = await this.userService.changeUserPassword(userId, payload);
          if (response.status === 200 || response.status === 202) {
            this.success = this.$t('main.recover.success');
            setTimeout(() => this.$router.push('/'), 3000);
          } else {
            this.error = this.$t('main.recover.error');
          }
        } else {
          this.error = this.$t('main.recover.missingEmail');
        }
      } catch (err) {
        console.error("Error:", err);
        this.error = this.$t('main.recover.error');
      } finally {
        this.loading = false;
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
        <h2 class="info">{{ $t('main.recover.changePasswordTitle') }}</h2>
      </div>
      <div class="box2">
        <input
            class="input-style"
            :class="{ invalid: password && !isPasswordValid }"
            type="password"
            v-model="password"
            required
            :placeholder="$t('main.recover.newPassword')"
        />
        <input
            class="input-style"
            :class="{ invalid: confirmPassword && password !== confirmPassword }"
            type="password"
            v-model="confirmPassword"
            required
            :placeholder="$t('main.recover.confirmPassword')"
        />
        <button :disabled="!canSubmit" @click="submitPasswordChange">
          {{ $t('main.recover.submit') }}
        </button>

        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="success" class="success">{{ success }}</p>
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

.container {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Montserrat', sans-serif;
  color: black;
  flex-wrap: wrap;
  text-align: center;
  margin: auto;
  max-width: 900px;
  width: 100%;
  padding: 0 1rem;
  box-sizing: border-box;
}

.box1, .box2 {
  flex: 1 1 400px;
  padding: 20px;
  margin: 10px;
  height: fit-content;
  border-radius: 2%;
  min-width: 300px;
  box-sizing: border-box;
}

.box2 {
  background-color: #55B0DB;
  font-size: 0.9rem;
}

.info {
  padding: 50px;
}

.input-style {
  width: 100%;
  padding: 10px;
  border-radius: 5px;
  border: none;
  font-size: 14px;
  box-sizing: border-box;
  margin-bottom: 1rem;
}

.input-style.invalid {
  border: 2px solid red;
}

button {
  background-color: #C4E2F3;
  color: #161616;
  font-weight: bold;
  border: none;
  border-radius: 0.25em;
  padding: 0.5em 1em;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: #A1B9C6;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: red;
  margin-top: 1rem;
}

.success {
  color: green;
  margin-top: 1rem;
}

@media screen and (max-width: 1000px) {
  .container {
    display: block;
    padding: 15vw 0 0 0;
    width: 100%;
  }

  .box1, .box2 {
    width: 95%;
    padding: 5px;
  }

  .logo {
    width: 100%;
    margin: 0 auto;
  }

  .padre {
    padding: 0;
  }
}
</style>
