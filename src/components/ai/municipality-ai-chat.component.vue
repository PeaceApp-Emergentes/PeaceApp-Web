<script>
import { AiApiService } from "../../services/aiapi.service.js";

export default {
  name: "MunicipalityAiChat",
  data() {
    return {
      aiApi: new AiApiService(),
      open: false,
      input: "",
      sending: false,
      messages: [
        { from: "bot", text: "Hola, soy el asistente de PeaceApp. ¿En qué te ayudo sobre la plataforma o seguridad ciudadana?" }
      ],
      supportWhatsapp: "51987654321",
      supportEmail: "soporte@peaceapp.pe"
    };
  },
  computed: {
    supportWhatsappUrl() {
      return `https://wa.me/${this.supportWhatsapp}?text=${encodeURIComponent("Hola, necesito ayuda con PeaceApp.")}`;
    },
    isEnabled() {
      const role = sessionStorage.getItem("userRole");
      const token = sessionStorage.getItem("authToken");
      return Boolean(token) && (role === "ROLE_MUNICIPALITY" || role === "ROLE_ADMIN");
    }
  },
  methods: {
    async send() {
      const text = this.input.trim();
      if (!text || this.sending) return;
      this.messages.push({ from: "user", text });
      this.input = "";
      this.sending = true;
      try {
        const res = await this.aiApi.chatbot(text, "audiencia=municipalidad (app web; gestiona y monitorea reportes y emergencias)");
        const answer = res?.data?.answer || "No se pudo obtener respuesta del asistente.";
        this.messages.push({ from: "bot", text: answer });
        const actions = res?.data?.suggestedActions;
        if (Array.isArray(actions) && actions.length) {
          this.messages.push({ from: "bot", text: "Sugerencias:\n- " + actions.join("\n- ") });
        }
      } catch (e) {
        this.messages.push({ from: "bot", text: "Error al conectar con el asistente." });
      } finally {
        this.sending = false;
        this.$nextTick(() => { const c = this.$refs.body; if (c) c.scrollTop = c.scrollHeight; });
      }
    }
  }
};
</script>

<template>
  <div v-if="isEnabled" class="ai-chat">
    <button class="ai-fab" @click="open = !open">💬</button>
    <div v-if="open" class="ai-panel">
      <div class="ai-head"><span>Asistente IA</span><button class="ai-close" @click="open = false">×</button></div>
      <div class="ai-body" ref="body">
        <div v-for="(m, i) in messages" :key="i" :class="['ai-msg', m.from]">{{ m.text }}</div>
      </div>
      <form class="ai-input" @submit.prevent="send">
        <input v-model="input" :disabled="sending" placeholder="Escribe tu duda..." />
        <button type="submit" :disabled="sending">{{ sending ? "..." : "Enviar" }}</button>
      </form>
      <div class="ai-support">
        ¿Necesitas hablar con soporte?
        <a :href="supportWhatsappUrl" target="_blank" rel="noopener">WhatsApp</a>
        <a :href="'mailto:' + supportEmail">Correo</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-fab { position: fixed; right: 24px; bottom: 96px; width: 56px; height: 56px; border-radius: 50%; border: 0; background: #1c597c; color: #fff; font-size: 22px; cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,.25); z-index: 3000; }
.ai-panel { position: fixed; right: 24px; bottom: 164px; width: 340px; max-width: calc(100vw - 32px); height: 460px; max-height: calc(100vh - 140px); background: #fff; border: 1px solid #d8e1e6; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,.25); z-index: 3000; }
.ai-head { background: #1c597c; color: #fff; padding: 12px 14px; font-weight: 700; display: flex; justify-content: space-between; align-items: center; }
.ai-close { background: transparent; border: 0; color: #fff; font-size: 20px; cursor: pointer; }
.ai-body { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; background: #eef5f8; }
.ai-msg { padding: 8px 10px; border-radius: 10px; max-width: 85%; white-space: pre-wrap; font-size: 14px; }
.ai-msg.user { align-self: flex-end; background: #1c597c; color: #fff; }
.ai-msg.bot { align-self: flex-start; background: #fff; border: 1px solid #d8e1e6; color: #18252f; }
.ai-input { display: flex; gap: 6px; padding: 10px; border-top: 1px solid #d8e1e6; background: #fff; }
.ai-input input { flex: 1; padding: 9px; border: 1px solid #bccbd3; border-radius: 6px; }
.ai-input button { background: #1c597c; color: #fff; border: 0; border-radius: 6px; padding: 9px 12px; cursor: pointer; }
.ai-support { padding: 8px 10px; border-top: 1px solid #d8e1e6; font-size: 12px; color: #52616b; background: #fff; }
.ai-support a { color: #1c597c; font-weight: 700; margin-left: 6px; text-decoration: none; }
</style>
