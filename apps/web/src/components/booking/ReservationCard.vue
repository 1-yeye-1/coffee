<script setup>
defineProps({ reservation: { type: Object, required: true } })
</script>

<template>
  <article class="reservation-card">
    <header><span class="reservation-card__check" aria-hidden="true">✓</span><div><small>Coffee Book Reservation</small><h2>电子预约凭证</h2></div><strong>{{ reservation.bookingNo || 'CONFIRMED' }}</strong></header>
    <div class="reservation-card__grid">
      <div><span>会员</span><strong>{{ reservation.nickname }}</strong></div>
      <div><span>日期</span><strong>{{ reservation.date }}</strong></div>
      <div><span>时间段</span><strong>{{ reservation.timeSlot }}</strong></div>
      <div><span>座位</span><strong>{{ reservation.seatCode }}</strong></div>
    </div>
    <footer><span>CREATED</span><time>{{ reservation.createdAt }}</time></footer>
  </article>
</template>

<style scoped>
.reservation-card{display:grid;padding:var(--cb-space-5);gap:var(--cb-space-5);color:var(--cb-text-primary);background:linear-gradient(145deg,color-mix(in srgb,var(--cb-color-gold) 16%,var(--cb-bg-elevated)),var(--cb-bg-elevated));border:.0625rem solid color-mix(in srgb,var(--cb-color-gold) 58%,var(--cb-border-soft));border-radius:var(--cb-radius-xl);box-shadow:var(--cb-shadow-lg);overflow:hidden}.reservation-card header{display:grid;grid-template-columns:auto 1fr auto;gap:var(--cb-space-3);align-items:center}.reservation-card header small,.reservation-card footer,.reservation-card__grid span{color:var(--cb-text-muted);font-size:var(--cb-font-size-xs);letter-spacing:.08em}.reservation-card h2{margin:0;font-size:var(--cb-font-size-xl)}.reservation-card__check{display:grid;width:2.75rem;height:2.75rem;place-items:center;color:var(--cb-color-espresso);font-weight:var(--cb-font-bold);background:var(--cb-color-gold);border-radius:var(--cb-radius-pill)}.reservation-card__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--cb-space-4)}.reservation-card__grid div{display:grid;gap:var(--cb-space-1)}.reservation-card footer{display:flex;padding-top:var(--cb-space-3);justify-content:space-between;border-top:.0625rem dashed var(--cb-border-strong)}
</style>
