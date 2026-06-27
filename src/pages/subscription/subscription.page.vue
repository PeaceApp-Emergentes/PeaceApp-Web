<script>
import ToolbarCitizen from "../../components/toolbar/toolbar-citizen.component.vue";
import { PaymentApiService } from "../../services/paymentapi.service.js";

export default {
  name: "SubscriptionPage",
  components: { ToolbarCitizen },
  data() {
    return {
      paymentApi: new PaymentApiService(),
      email: "",
      loading: true,
      working: false,
      error: "",
      sub: null,
      confirmCancel: false,
    };
  },
  computed: {
    statusLabel() {
      if (!this.sub || !this.sub.found) return this.$t("subscription.statusNone");
      if (this.sub.cancelAtPeriodEnd) return this.$t("subscription.statusCanceling");
      const map = {
        active: this.$t("subscription.statusActive"),
        trialing: this.$t("subscription.statusActive"),
        past_due: this.$t("subscription.statusPastDue"),
        canceled: this.$t("subscription.statusCanceled"),
        unpaid: this.$t("subscription.statusPastDue"),
      };
      return map[this.sub.status] || this.sub.status;
    },
    statusClass() {
      if (!this.sub || !this.sub.found) return "badge-neutral";
      if (this.sub.cancelAtPeriodEnd) return "badge-warn";
      if (this.sub.active) return "badge-ok";
      return "badge-bad";
    },
    priceLabel() {
      if (!this.sub || this.sub.amount == null) return "—";
      const amount = (this.sub.amount / 100).toFixed(2);
      const cur = (this.sub.currency || "").toUpperCase();
      const each = this.sub.interval === "year" ? this.$t("subscription.perYear") : this.$t("subscription.perMonth");
      return `${cur} ${amount} ${each}`;
    },
    renewLabel() {
      if (!this.sub || !this.sub.currentPeriodEnd) return "—";
      const d = new Date(this.sub.currentPeriodEnd * 1000);
      return d.toLocaleDateString();
    },
  },
  methods: {
    async load() {
      this.loading = true;
      this.error = "";
      this.email = sessionStorage.getItem("userEmail") || "";
      if (!this.email) {
        this.error = this.$t("subscription.noEmail");
        this.loading = false;
        return;
      }
      const res = await this.paymentApi.getSubscription(this.email);
      if (res && [200, 201].includes(res.status)) {
        this.sub = res.data;
        sessionStorage.setItem("subActive", this.sub && this.sub.active ? "true" : "false");
      } else {
        this.error = (res && res.data && res.data.message) || this.$t("subscription.loadError");
      }
      this.loading = false;
    },
    async doCancel() {
      this.working = true;
      this.confirmCancel = false;
      const res = await this.paymentApi.cancelSubscription(this.email);
      if (res && [200, 201].includes(res.status)) this.sub = res.data;
      else this.error = (res && res.data && res.data.message) || this.$t("subscription.cancelError");
      this.working = false;
    },
    async doReactivate() {
      this.working = true;
      const res = await this.paymentApi.reactivateSubscription(this.email);
      if (res && [200, 201].includes(res.status)) this.sub = res.data;
      else this.error = (res && res.data && res.data.message) || this.$t("subscription.reactivateError");
      this.working = false;
    },
    async renew() {
      this.working = true;
      this.error = "";
      const origin = window.location.origin;
      const res = await this.paymentApi.createCheckoutSession({
        institutionalEmail: this.email,
        municipalityName: (this.sub && this.sub.municipalityName) || "",
        successUrl: `${origin}/payment-success?renew=1`,
        cancelUrl: `${origin}/subscription`,
      });
      if (res && [200, 201].includes(res.status) && res.data && res.data.url) {
        window.location.href = res.data.url;
      } else {
        this.error = (res && res.data && res.data.message) || this.$t("subscription.renewError");
        this.working = false;
      }
    },
  },
  created() {
    this.load();
  },
};
</script>

<template>
  <div class="container">
    <ToolbarCitizen />
    <div class="card">
      <h1>{{ $t("subscription.title") }}</h1>

      <p v-if="loading" class="muted">{{ $t("subscription.loading") }}</p>

      <div v-else>
        <p v-if="error" class="error">{{ error }}</p>

        <div v-if="sub && sub.found" class="detail">
          <div class="row">
            <span>{{ $t("subscription.municipality") }}</span>
            <strong>{{ sub.municipalityName || "—" }}</strong>
          </div>
          <div class="row">
            <span>{{ $t("subscription.status") }}</span>
            <span class="badge" :class="statusClass">{{ statusLabel }}</span>
          </div>
          <div class="row">
            <span>{{ $t("subscription.plan") }}</span>
            <strong>{{ priceLabel }}</strong>
          </div>
          <div class="row">
            <span>{{ sub.cancelAtPeriodEnd ? $t("subscription.accessUntil") : $t("subscription.nextCharge") }}</span>
            <strong>{{ renewLabel }}</strong>
          </div>

          <p v-if="sub.cancelAtPeriodEnd" class="notice warn">{{ $t("subscription.cancelingNotice", { date: renewLabel }) }}</p>

          <div class="actions">
            <button
              v-if="!sub.cancelAtPeriodEnd && sub.active"
              class="danger"
              :disabled="working"
              @click="confirmCancel = true">
              {{ $t("subscription.cancelBtn") }}
            </button>
            <button
              v-else-if="sub.cancelAtPeriodEnd"
              class="primary"
              :disabled="working"
              @click="doReactivate">
              {{ $t("subscription.reactivateBtn") }}
            </button>
            <button
              v-else-if="!sub.active"
              class="primary"
              :disabled="working"
              @click="renew">
              {{ $t("subscription.renewBtn") }}
            </button>
            <button class="ghost" :disabled="working" @click="load">{{ $t("subscription.refresh") }}</button>
          </div>
        </div>

        <div v-else-if="!error" class="empty">
          <p>{{ $t("subscription.empty") }}</p>
          <div class="actions">
            <button class="primary" :disabled="working" @click="renew">{{ $t("subscription.renewBtn") }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="confirmCancel" class="overlay" @click.self="confirmCancel = false">
      <div class="modal">
        <h3>{{ $t("subscription.confirmTitle") }}</h3>
        <p>{{ $t("subscription.confirmBody", { date: renewLabel }) }}</p>
        <div class="actions">
          <button class="danger" :disabled="working" @click="doCancel">{{ $t("subscription.confirmYes") }}</button>
          <button class="ghost" :disabled="working" @click="confirmCancel = false">{{ $t("subscription.confirmNo") }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container { padding: 12vh 5vw 4vh; display: flex; justify-content: center; }
.card {
  background: #fff; border-radius: 12px; padding: 28px;
  width: min(620px, 100%); box-shadow: 0 8px 28px rgba(0,0,0,.12);
}
h1 { margin: 0 0 18px; color: #1C597C; }
.muted, .empty { color: #666; }
.error { color: #c62828; font-weight: 600; }
.detail .row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 0; border-bottom: 1px solid #eee; gap: 12px;
}
.detail .row span:first-child { color: #555; }
.badge { padding: 5px 12px; border-radius: 999px; font-weight: 800; font-size: 13px; }
.badge-ok { background: #e6f4ea; color: #1e7e34; }
.badge-warn { background: #fff4e5; color: #b26a00; }
.badge-bad { background: #fdecea; color: #c62828; }
.badge-neutral { background: #eee; color: #555; }
.notice { border-radius: 8px; padding: 12px; margin-top: 14px; }
.notice.warn { background: #fff4e5; color: #8a5300; }
.actions { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }
button { border: 0; border-radius: 8px; padding: 11px 18px; font-weight: 800; cursor: pointer; }
button:disabled { opacity: .6; cursor: default; }
.danger { background: #e53935; color: #fff; }
.primary { background: #1C597C; color: #fff; }
.ghost { background: #f0f0f0; color: #222; }
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center; z-index: 3000;
}
.modal { background: #fff; border-radius: 12px; padding: 26px; width: min(440px, 90vw); }
.modal h3 { margin: 0 0 10px; color: #1C597C; }
</style>
