<script>
import { authUserService } from "./services/authuser.service.js";

export default {
  data() {
    return {
      users: [],
      userService: new authUserService(),
      userEmail: '',
      userRole: '',
      locales: [{ code: 'en', name: '🇺🇸 English', flag: 'us' },
        { code: 'es', name: '🇪🇸 Español', flag: 'es' }],
      showSelect: false,
      activeModal: null
    };
  },
  mounted() {
  },
  computed: {
    faqContent() {
      return [
        { question: this.$t("userForm.question1"), answer: this.$t("userForm.answer1") },
        { question: this.$t("userForm.question2"), answer: this.$t("userForm.answer2") },
        { question: this.$t("userForm.question3"), answer: this.$t("userForm.answer3") }
      ];
    },
    termsContent() {
      return [
        {
          title: this.$t("userForm.terms.title1"),
          content: this.$t("userForm.terms.content1")
        },
        {
          title: this.$t("userForm.terms.title2"),
          items: [
            this.$t("userForm.terms.item2_1"),
            this.$t("userForm.terms.item2_2"),
            this.$t("userForm.terms.item2_3")
          ]
        },
        {
          title: this.$t("userForm.terms.title3"),
          items: [
            this.$t("userForm.terms.item3_1"),
            this.$t("userForm.terms.item3_2"),
            this.$t("userForm.terms.item3_3")
          ]
        },
        {
          title: this.$t("userForm.terms.title4"),
          items: [
            this.$t("userForm.terms.item4_1"),
            this.$t("userForm.terms.item4_2"),
            this.$t("userForm.terms.item4_3")
          ]
        },
        {
          title: this.$t("userForm.terms.title5"),
          items: [
            this.$t("userForm.terms.item5_1"),
            this.$t("userForm.terms.item5_2"),
            this.$t("userForm.terms.item5_3")
          ]
        },
        {
          title: this.$t("userForm.terms.title6"),
          items: [
            this.$t("userForm.terms.item6_1"),
            this.$t("userForm.terms.item6_2")
          ]
        },
        {
          title: this.$t("userForm.terms.title7"),
          content: this.$t("userForm.terms.content7")
        },
        {
          title: this.$t("userForm.terms.title8"),
          items: [
            this.$t("userForm.terms.item8_1"),
            this.$t("userForm.terms.item8_2"),
            this.$t("userForm.terms.item8_3")
          ]
        },
        {
          title: this.$t("userForm.terms.title9"),
          content: this.$t("userForm.terms.content9")
        },
        {
          title: this.$t("userForm.terms.lastUpdate"),
          content: new Date().toLocaleDateString(this.$i18n.locale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
        }
      ];
    }
  },
  methods: {
    changeLanguage(event) {
      const selectedLanguage = event.target.value;
      this.$i18n.locale = selectedLanguage;
      localStorage.setItem('language', selectedLanguage);
    },
    hideSelect() {
      this.showSelect = false;
    },
    showModal(modalType) {
      this.activeModal = modalType;
    },
    closeModal() {
      this.activeModal = null;
    }
  }
};
</script>
<template>
  <main>
    <div class="container">
      <router-view />
    </div>

    <!-- Modals -->
    <div v-if="activeModal === 'faq'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <h2>{{ $t('footer.questions') }}</h2>
        <div v-for="(item, index) in faqContent" :key="index" class="faq-item">
          <h3>{{ item.question }}</h3>
          <p>{{ item.answer }}</p>
        </div>
        <button @click="closeModal" class="close-button">{{ $t('userForm.close') }}</button>
      </div>
    </div>

    <div v-if="activeModal === 'terms'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <h2>{{ $t('footer.terms') }}</h2>

        <div v-for="(section, index) in termsContent" :key="index" class="terms-section">
          <h3>{{ section.title }}</h3>

          <p v-if="section.content">{{ section.content }}</p>

          <ul v-if="section.items">
            <li v-for="(item, i) in section.items" :key="i">{{ item }}</li>
          </ul>
        </div>

        <button @click="closeModal" class="close-button">{{ $t('userForm.close') }}</button>
      </div>
    </div>

    <footer class="footer">
      <div class="footer-links">
        <span @click="showModal('faq')">{{ $t('footer.questions') }}</span>
        <span class="separator">|</span>
        <span @click="showModal('terms')">{{ $t('footer.terms') }}</span>
      </div>
      <div class="language-section">
        <select v-model="$i18n.locale" @change="changeLanguage($event)" class="locale-select" v-show="showSelect"
                ref="languageSelect" @blur="hideSelect">
          <option v-for="locale in locales" :key="locale.code" :value="locale.code"
                  :selected="$i18n.locale === locale.code">
            <flag :iso="locale.flag" v-bind:squared="false" class="flag-icon" /> {{ locale.name }}
          </option>
        </select>
        <img src="./assets/Language.png" alt="Language" @click="showSelect = !showSelect">
      </div>
    </footer>
  </main>
</template>

<style scoped>
main {
  width: 100%;
  max-width: 100%;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}
.container {
  padding-bottom: 150px;
  box-sizing: border-box;
}

/* ----------------- MODO CLARO (POR DEFECTO) ----------------- */
body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 500px;
  min-height: 100vh;
  background-color: #ffffff;
  color: #333;
}


/* FOOTER */
footer {
  align-items: center;
  display: flex;
  justify-content: space-between;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  color: #fff;
  padding: 15px 30px;
  background: linear-gradient(135deg, #3498db, #2c3e50);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.footer-links {
  display: flex;
  gap: 20px;
  cursor: pointer;
}

.footer-links span {
  position: relative;
  padding: 5px 0;
  font-weight: 500;
  transition: all 0.3s ease;
}

.footer-links span:hover {
  transform: translateY(-2px);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.footer-links span::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background-color: #fff;
  transition: width 0.3s ease;
}

.footer-links span:hover::after {
  width: 100%;
}

.separator {
  color: rgba(255, 255, 255, 0.3);
  user-select: none;
}
.language-section {
  display: flex;
  align-items: center;
  gap: 15px;
}

/* Hover */
.mapboxgl-ctrl-group button:hover {
  background-color: #2c2c3c !important;
}

.locale-select {
  padding: 8px 12px;
  font-size: 0.9em;
  border-radius: 6px;
  width: 120px;
  border: none;
  background-color: rgba(255, 255, 255, 0.9);
  color: #000;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.locale-select:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
}

img {
  height: 32px;
  width: auto;
  cursor: pointer;
  transition: transform 0.3s ease;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2));
}

img:hover {
  transform: scale(1.1);
}

/* MODALS */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
  animation: fadeIn 0.3s ease-out;
}

.modal-content {
  background-color: white;
  padding: 30px;
  border-radius: 12px;
  width: 85%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  color: #333;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  transform: translateY(0);
  animation: slideUp 0.4s ease-out;
}

.modal-content h2 {
  margin-top: 0;
  color: #2c3e50;
  font-size: 1.8em;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #3498db;
}

.faq-item {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.faq-item:last-child {
  border-bottom: none;
}

.faq-item h3 {
  margin-bottom: 8px;
  color: #3498db;
  font-size: 1.2em;
}

.faq-item p {
  margin: 0;
  line-height: 1.6;
  color: #555;
}

.terms-section {
  margin-bottom: 1.5rem;
}

.terms-section h3 {
  color: #2c3e50;
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3rem;
}

.terms-section p,
.terms-section li {
  line-height: 1.6;
  color: #555;
}

.terms-section ul {
  padding-left: 1.2rem;
  margin-top: 0.5rem;
}

.close-button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 20px;
  font-weight: 500;
  transition: all 0.3s ease;
  display: block;
  margin-left: auto;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.close-button:hover {
  background-color: #2980b9;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* ----------------- RESPONSIVE ----------------- */
@media (max-width: 768px) {
  footer {
    flex-direction: column;
    gap: 15px;
    padding: 15px;
    text-align: center;
  }

  .footer-links {
    flex-wrap: wrap;
    justify-content: center;
  }

  .modal-content {
    width: 90%;
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .footer-links span {
    font-size: 0.9em;
  }

  .locale-select {
    width: 100px;
    padding: 6px 8px;
  }

  img {
    height: 28px;
  }

  .modal-content h2 {
    font-size: 1.5em;
  }
}
</style>