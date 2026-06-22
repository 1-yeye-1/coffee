<script setup>
defineProps({ seat: { type: Object, default: null } })

const statusLabel = { available: 'Available', reserved: 'Reserved', maintenance: 'Maintenance', selected: 'Selected' }
const isWindowSeat = (seat) => /窗|window/i.test(seat?.area || seat?.name || '')
const hasOutlet = (seat) => seat?.hasOutlet ?? /窗|吧台|工作|window|bar|work/i.test(seat?.area || seat?.name || '')
</script>

<template>
  <aside v-if="seat" class="seat-tooltip" role="tooltip">
    <div><strong>{{ seat.code }}</strong><span :class="`is-${seat.displayStatus || seat.status}`">{{ statusLabel[seat.displayStatus || seat.status] }}</span></div>
    <dl>
      <div><dt>位置</dt><dd>{{ isWindowSeat(seat) ? '靠窗' : '非靠窗' }}</dd></div>
      <div><dt>容量</dt><dd>{{ seat.capacity }} 人</dd></div>
      <div><dt>插座</dt><dd>{{ hasOutlet(seat) ? '有' : '无' }}</dd></div>
    </dl>
  </aside>
</template>

<style scoped>
.seat-tooltip{position:absolute;z-index:8;width:12rem;padding:var(--cb-space-3);color:var(--cb-text-primary);background:color-mix(in srgb,var(--cb-bg-elevated) 94%,transparent);border:.0625rem solid var(--cb-border-strong);border-radius:var(--cb-radius-lg);box-shadow:var(--cb-shadow-lg);pointer-events:none;backdrop-filter:blur(.7rem);transform:translate(-50%,calc(-100% - 1rem))}.seat-tooltip>div,.seat-tooltip dl div{display:flex;justify-content:space-between;gap:var(--cb-space-3)}.seat-tooltip>div span{color:var(--cb-success);font-size:var(--cb-font-size-xs);font-weight:var(--cb-font-bold)}.seat-tooltip>div .is-reserved,.seat-tooltip>div .is-maintenance{color:var(--cb-warning)}.seat-tooltip dl{display:grid;margin:var(--cb-space-2) 0 0;gap:var(--cb-space-1);font-size:var(--cb-font-size-xs)}.seat-tooltip dt{color:var(--cb-text-muted)}.seat-tooltip dd{margin:0}
</style>
