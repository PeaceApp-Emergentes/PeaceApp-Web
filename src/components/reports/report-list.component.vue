<template>
  <div class="parent-container">
    <div class="list-container">
      <AuthorityReportListComponent />
    </div>
    <div class="header-container">
      <router-link to="/user/create-report-form" class="btn btn-primary">{{ $t('reports.button') }}</router-link>
    </div>
  </div>
</template>

<script>
import UserReportListComponent from "./user-report-list.component.vue";
export default {
  name: "ReportListComponent",
  components: {
    AuthorityReportListComponent: UserReportListComponent
  },
};
</script>

<style scoped>
/* === Estilos normales === */
.parent-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.header-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 1200px;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.list-container {
  width: 100%;
  max-width: 1200px;
}

.btn {
  background-color: #C4E2F3;
  color: #161616;
  font-weight: bolder;
  border: none;
  border-radius: 0.25em;
  padding: 0.5em 1em;
  margin: 0.5em;
  cursor: pointer;
  font-size: 20px;
  text-decoration: none;
}

.btn:hover {
  background-color: #A1B9C6;
}

/* === MODO OSCURO === */
body.dark .header-container {
  background-color: #1e1e1e;
  color: #f5f5f5;
}

body.dark .btn {
  background-color: #444;
  color: #f5f5f5;
}

body.dark .btn:hover {
  background-color: #666;
}

</style>
