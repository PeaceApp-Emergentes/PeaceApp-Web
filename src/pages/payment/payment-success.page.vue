<script>
import { authUserService } from "../../services/authuser.service.js";
import { UserApiService } from "../../services/userapi.service.js";
import { PaymentApiService } from "../../services/paymentapi.service.js";

const MUNICIPALITY_ROLE = "ROLE_MUNICIPALITY";

export default {
  name: "PaymentSuccessPage",
  data() {
    return {
      authService: new authUserService(),
      userApiService: new UserApiService(),
      paymentApiService: new PaymentApiService(),
      status: "Verificando el pago...",
      error: null
    };
  },
  async created() {
    const sessionId = this.$route.query.session_id;
    const isRenewal = this.$route.query.renew === "1" || this.$route.query.renew === 1;
    const pendingRaw = sessionStorage.getItem("pendingMunicipalitySignup");
    if (!sessionId) {
      this.error = "No se encontró información del pago.";
      return;
    }
    try {
      const sessionRes = await this.paymentApiService.getSession(sessionId);
      if (!(sessionRes?.status === 200 && sessionRes.data?.paid)) {
        this.error = "El pago no se completó. Intenta nuevamente.";
        return;
      }
      // Renovación de una municipalidad existente (ya tiene cuenta).
      if (isRenewal || !pendingRaw) {
        sessionStorage.setItem("subActive", "true");
        this.status = "¡Suscripción renovada! Redirigiendo...";
        setTimeout(() => this.$router.push({ path: "/dashboard" }), 1000);
        return;
      }
      await this.completeRegistration(JSON.parse(pendingRaw));
    } catch (e) {
      console.error("Payment success error:", e);
      this.error = "Ocurrió un error verificando el pago.";
    }
  },
  methods: {
    async completeRegistration(pending) {
      this.status = "Pago confirmado. Creando tu cuenta...";

      const signUpResponse = await this.authService.signUp({
        username: pending.username,
        password: pending.password,
        roles: [MUNICIPALITY_ROLE]
      });
      if (![200, 201].includes(signUpResponse?.status)) {
        this.error = signUpResponse?.data?.message || "No se pudo crear la cuenta.";
        return;
      }

      const loginResponse = await this.authService.signInUser(pending.username, pending.password);
      if (loginResponse?.status !== 200) {
        this.error = "Cuenta creada, pero no se pudo iniciar sesión.";
        return;
      }
      const user = loginResponse.data;
      sessionStorage.setItem("userEmail", user.username);
      sessionStorage.setItem("userRole", MUNICIPALITY_ROLE);
      sessionStorage.setItem("authToken", user.token);
      sessionStorage.setItem("iamUserId", user.id);
      sessionStorage.setItem("userId", user.id);

      const profileResponse = await this.userApiService.createMunicipality({
        municipalityName: pending.municipalityName,
        city: pending.city,
        district: pending.district,
        institutionalEmail: pending.institutionalEmail,
        phone: pending.phone,
        userId: String(user.id),
        profileImage: pending.profileImage
      });

      if ([200, 201].includes(profileResponse?.status)) {
        sessionStorage.setItem("municipalityInfo", JSON.stringify(profileResponse.data));
        sessionStorage.setItem("subActive", "true");
        sessionStorage.removeItem("pendingMunicipalitySignup");
        this.status = "¡Cuenta creada! Redirigiendo...";
        setTimeout(() => this.$router.push({ path: "/dashboard" }), 1000);
      } else {
        this.error = profileResponse?.data?.message || "No se pudo guardar el perfil.";
      }
    }
  }
};
</script>

<template>
  <div class="payment-result">
    <div v-if="!error">
      <h2>{{ status }}</h2>
      <p>Por favor espera un momento, no cierres esta ventana.</p>
    </div>
    <div v-else class="error-box">
      <h2>No se pudo completar el registro</h2>
      <p>{{ error }}</p>
      <button @click="$router.push('/')">Volver al inicio</button>
    </div>
  </div>
</template>

<style scoped>
.payment-result { min-height: 70vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px; }
.error-box { color: #c0392b; }
.payment-result button { margin-top: 16px; background: #1c597c; color: #fff; border: 0; border-radius: 6px; padding: 10px 16px; cursor: pointer; }
</style>
