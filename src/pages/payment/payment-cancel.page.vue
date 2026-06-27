<script>
export default { name: "PaymentCancelPage" };
</script>

<template>
  <div class="payment-result">
    <h2>Pago cancelado</h2>
    <p>No se realizó el pago, así que tu cuenta no fue creada. Puedes intentarlo de nuevo cuando quieras.</p>
    <button @click="$router.push('/')">Volver al registro</button>
  </div>
</template>

<style scoped>
.payment-result { min-height: 70vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px; }
.payment-result button { margin-top: 16px; background: #1c597c; color: #fff; border: 0; border-radius: 6px; padding: 10px 16px; cursor: pointer; }
</style>
