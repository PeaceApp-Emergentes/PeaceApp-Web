<script>
import { authUserService } from "../../services/authuser.service.js";
import { UserApiService } from "../../services/userapi.service.js";

export default {
  data() {
    return {
      authService: new authUserService(),
      userApiService: new UserApiService(),
      confirmPassword: '',
      isSubmitting: false,
      formData: {
        name: '',
        lastname: '',
        email: '',
        password: '',
        phonenumber: '',
        profileImage: 'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg'
      },
      error: null,
      success: null
    };
  },
  methods: {
    validateInputs() {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\d{9}$/;
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

      if (!emailRegex.test(this.formData.email)) {
        this.error = "Invalid email format.";
        return false;
      }
      if (!phoneRegex.test(this.formData.phonenumber)) {
        this.error = "Phone number must be exactly 9 digits.";
        return false;
      }
      if (!passwordRegex.test(this.formData.password)) {
        this.error =
            "Password must be at least 8 characters, with uppercase, lowercase, number, and special character.";
        return false;
      }
      if (this.formData.password !== this.confirmPassword) {
        this.error = "Passwords do not match.";
        return false;
      }
      return true;
    },

    async createUser() {
      if (this.isSubmitting) return;
      this.isSubmitting = true;
      this.error = null;
      this.success = null;

      if (!this.validateInputs()) {
        this.isSubmitting = false;
        return;
      }
      try {
        const signUpData = {
          username: this.formData.email,
          password: this.formData.password,
          role: "ROLE_USER"
        };

        const signUpResponse = await this.authService.signUp(signUpData);
        if (![200, 201].includes(signUpResponse.status)) {
          this.error = "Failed to create account.";
          return;
        }

        const loginResponse = await this.authService.signInUser(
            this.formData.email,
            this.formData.password
        );

        if (loginResponse.status !== 200) {
          this.error = "Login failed after registration.";
          return;
        }

        const user = loginResponse.data;
        localStorage.setItem("userEmail", user.username);
        localStorage.setItem("userRole", "ROLE_USER");
        localStorage.setItem("authToken", user.token);
        localStorage.setItem("userId", user.id);

        const userData = {
          name: this.formData.name,
          lastname: this.formData.lastname,
          email: this.formData.email,
          password: this.formData.password,
          phonenumber: this.formData.phonenumber,
          userId: user.id,
          profile_image: this.formData.profileImage
        };

        const profileResponse = await this.userApiService.createUser(userData);
        if ([200, 201].includes(profileResponse.status)) {
          this.success = "Account created successfully!";
          setTimeout(() => this.$router.push({ path: "/profile" }), 3000);
        } else {
          this.error = "Failed to save user profile.";
        }
      } catch (error) {
        console.error("Registration error:", error);
        this.error = error?.response?.data?.message || "Unexpected error occurred.";
      }
    },

    async submit() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
              localStorage.setItem("userLat", pos.coords.latitude);
              localStorage.setItem("userLng", pos.coords.longitude);
              this.createUser();
            },
            () => {
              this.createUser();
            }
        );
      } else {
        this.createUser();
      }
    },

    restrictToDigits(event) {
      const key = event.key;
      if (!/^\d$/.test(key)) {
        event.preventDefault();
      }
    }
  }
};
</script>

<template>
  <form class="form" @submit.prevent="submit()">
    <p class="message">{{ $t('userForm.message') }}</p>

    <div class="flex">
      <input :placeholder="$t('userForm.firstname')" class="input-style" type="text" required v-model="formData.name" />
      <input :placeholder="$t('userForm.lastname')" class="input-style" type="text" required v-model="formData.lastname" />
    </div>

    <div class="flex">
      <input :placeholder="$t('userForm.email')" class="input-style" type="email" required v-model="formData.email" />
      <input
          :placeholder="$t('userForm.phone')"
          class="input-style"
          type="text"
          required
          maxlength="9"
          @keypress="restrictToDigits"
          v-model="formData.phonenumber"
      />
    </div>

    <div class="flex">
      <input :placeholder="$t('userForm.password')" class="input-style" type="password" required v-model="formData.password" />
      <input :placeholder="$t('userForm.confirm_password')" class="input-style" type="password" required v-model="confirmPassword" />
    </div>

    <label class="material-checkbox">
      <input type="checkbox" required />
      <span class="checkmark"></span>
      {{ $t('userForm.term') }}
    </label>

    <button type="submit">{{ $t('userForm.submit') }}</button>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="success" class="success">{{ success }}</p>
  </form>
</template>
<style scoped>
button {
  font-size: 16px;
  padding: 10px 20px;
  border: none;
  background-color: #3498db;
  color: white;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s;
  width: 100%;
  max-width: 200px;
  margin-top: 10px;
}

button:hover {
  background-color: #2980b9;
}

body.dark button {
  background-color: #22487A;
  color: white;
}

body.dark button:hover {
  background-color: #2b5dab;
}

.form {
  display: flex;
  flex-direction: column;
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  border-radius: 20px;
  position: relative;
  align-items: center;
  justify-content: center;
  background-color: #55B0DB;
  box-sizing: border-box;
  transition: background-color 0.3s ease, color 0.3s ease;
}

body.dark .form {
  background-color: #1e1e1e;
  color: #f5f5f5;
}

.message {
  color: rgba(88, 87, 87, 0.822);
  font-size: 14px;
  text-align: center;
  margin-bottom: 10px;
}

body.dark .message {
  color: #ccc;
}

.flex {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.input-style {
  flex: 1;
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #ccc;
  font-size: 14px;
  box-sizing: border-box;
  transition: background-color 0.3s ease, color 0.3s ease;
}

body.dark .input-style {
  background-color: #2a2a2a;
  color: #f5f5f5;
  border: 1px solid #444;
}

.input-style::placeholder {
  color: #999;
}

body.dark .input-style::placeholder {
  color: #aaa;
}

.material-checkbox {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #444;
  margin-top: 10px;
}

body.dark .material-checkbox {
  color: #ccc;
}

.material-checkbox input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.checkmark {
  position: relative;
  display: inline-block;
  width: 20px;
  height: 20px;
  margin-right: 12px;
  border: 2px solid #454B00;
  border-radius: 4px;
  transition: all 0.3s;
}

.material-checkbox input[type="checkbox"]:checked ~ .checkmark {
  background-color: #2F3300;
  border-color: #454B00;
}

.material-checkbox input[type="checkbox"]:checked ~ .checkmark:after {
  content: "";
  position: absolute;
  top: 2px;
  left: 6px;
  width: 4px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.material-checkbox input[type="checkbox"]:focus ~ .checkmark {
  box-shadow: 0 0 0 2px #1C597C;
}

.material-checkbox:hover input[type="checkbox"] ~ .checkmark {
  border-color: #1F79AA;
}

.material-checkbox input[type="checkbox"]:disabled ~ .checkmark {
  opacity: 0.5;
  cursor: not-allowed;
}

.material-checkbox input[type="checkbox"]:disabled ~ .checkmark:hover {
  border-color: #4d4d4d;
}

.error {
  color: #b00020;
  margin-top: 10px;
  font-size: 13px;
  text-align: center;
}

.success {
  color: #2e7d32;
  margin-top: 10px;
  font-size: 13px;
  text-align: center;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .form {
    padding: 15px;
    width: 95%;
  }

  .flex {
    flex-direction: column;
    gap: 8px;
  }

  .input-style {
    width: 100%;
  }

  button {
    width: 100%;
    max-width: none;
  }

  .material-checkbox {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .form {
    padding: 10px;
  }

  .message {
    font-size: 13px;
  }

  .input-style {
    font-size: 13px;
  }

  button {
    font-size: 14px;
    padding: 8px;
  }
}
</style>
