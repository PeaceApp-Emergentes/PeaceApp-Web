<script>
</script>

<template>
  <nav class="toolbar">
    <ul class="left-icons">
      <li><img src="../../assets/PeaceApp.png" alt="PeaceApp" /></li> <!-- Left-aligned icon -->
    </ul>
    <ul class="right-icons">
      <li><router-link to="/user/map"><img src="../../assets/Map.png" alt="Map" /></router-link></li>
      <li><router-link to="/user/report"><img src="../../assets/Report.png" alt="Report" /></router-link></li>
      <li><router-link to="/user/notifications"><img src="../../assets/Notification.png" alt="Notification" /></router-link></li>
      <li><router-link to="/profile"><img src="../../assets/Profile.png" alt="Profile" /></router-link></li>
    </ul>
  </nav>
</template>
<style scoped>
.toolbar {
  background-color: #1C597C;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
  z-index: 1000;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.left-icons, .right-icons {
  height: 100%;
}

.toolbar .left-icons, .toolbar .right-icons {
  list-style-type: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
}

.toolbar .right-icons {
  margin-right: 40px;
}

.toolbar .left-icons {
  margin-left: 30px;
}

.toolbar .right-icons li {
  margin-left: 15px;
}

.left-icons img {
  height: 80px;
  width: auto;
}

.right-icons img {
  height: 50px;
  width: auto;
}

.toolbar a {
  display: inline-block;
}

.toolbar a:hover img {
  opacity: 0.8;
}

/* ------------------ MODO OSCURO ------------------ */
body.dark .toolbar {
  background-color: #282828;
  color: #f5f5f5;
}

body.dark .toolbar a:hover img {
  opacity: 0.9;
}

/* ------------------ RESPONSIVE ------------------ */
@media (max-width: 1000px) {
  .left-icons img {
    width: 40vw;
    height: auto;
  }

  .right-icons img {
    height: 40px;
  }

  .toolbar .right-icons {
    margin-right: 0;
  }

  .toolbar .left-icons {
    margin-left: 0;
  }
}
</style>
