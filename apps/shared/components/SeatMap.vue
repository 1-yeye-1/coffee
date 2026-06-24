<script setup>
import { computed } from 'vue'

const props = defineProps({
  seats: { type: Array, default: () => [] },
  mode: { type: String, default: 'select' },
  selectedSeatId: { type: [Number, String, null], default: null },
  draggingSeatId: { type: [Number, String, null], default: null },
  disabled: { type: Boolean, default: false },
  minWidth: { type: String, default: '40rem' },
  height: { type: String, default: '30rem' },
})

const emit = defineEmits([
  'seat-click',
  'seat-pointerdown',
  'seat-pointermove',
  'seat-pointerup',
  'seat-pointercancel',
  'seat-pointerenter',
  'seat-pointerleave',
])

const isEditMode = computed(() => props.mode === 'edit')

function seatKey(seat) {
  return seat.seatId ?? seat.id ?? seat.code
}

function normalizedStatus(seat) {
  if (Number(seatKey(seat)) === Number(props.selectedSeatId)) return 'selected'
  return seat.status || 'available'
}

function seatStyle(seat) {
  return {
    left: `${Number(seat.x ?? 50)}%`,
    top: `${Number(seat.y ?? 50)}%`,
    width: `${Number(seat.width || 64)}px`,
    height: `${Number(seat.height || 52)}px`,
  }
}

function statusLabel(status) {
  if (status === 'available') return '可预约'
  if (status === 'reserved') return '已预约'
  if (status === 'maintenance') return '不可用'
  if (status === 'selected') return '已选择'
  return '未知'
}

function canSelect(seat) {
  return !props.disabled && seat.status === 'available'
}

function canDrag(seat) {
  return isEditMode.value && !props.disabled && seat.status !== 'reserved'
}
</script>

<template>
  <div class="seat-map-shell">
    <div
      class="coffee-seat-map"
      :class="[`coffee-seat-map--${mode}`, { 'is-disabled': disabled }]"
      :style="{ '--seat-map-min-width': minWidth, '--seat-map-height': height }"
      data-cursor="drag"
      data-draggable="true"
    >
      <div class="map-zone map-zone--entrance">入口</div>
      <div class="map-zone map-zone--bar">吧台 / 收银台</div>
      <div class="map-zone map-zone--window">靠窗区</div>
      <div class="map-zone map-zone--reading">阅读区</div>
      <div class="map-zone map-zone--quiet">安静角落</div>
      <div class="map-zone map-zone--plant map-zone--plant-a">绿植</div>
      <div class="map-zone map-zone--plant map-zone--plant-b">装饰区</div>
      <div class="map-path map-path--main" aria-hidden="true" />

      <button
        v-for="seat in seats"
        :key="seatKey(seat)"
        type="button"
        class="map-seat"
        :data-cursor="isEditMode ? 'drag' : canSelect(seat) ? 'book' : 'disabled'"
        :data-draggable="canDrag(seat) ? 'true' : undefined"
        :class="[
          `is-${normalizedStatus(seat)}`,
          { 'is-selected': Number(seatKey(seat)) === Number(selectedSeatId), 'is-dragging': Number(seatKey(seat)) === Number(draggingSeatId), 'is-editable': canDrag(seat) },
        ]"
        :style="seatStyle(seat)"
        :aria-disabled="isEditMode ? String(disabled || seat.status === 'reserved') : String(!canSelect(seat))"
        :tabindex="isEditMode || canSelect(seat) ? 0 : -1"
        :title="`${seat.name || seat.code} · ${seat.area || '阅读区'} · ${seat.capacity || 1}人 · ${statusLabel(seat.status)}`"
        @click="emit('seat-click', seat, $event)"
        @pointerdown="emit('seat-pointerdown', seat, $event)"
        @pointermove="emit('seat-pointermove', seat, $event)"
        @pointerup="emit('seat-pointerup', seat, $event)"
        @pointercancel="emit('seat-pointercancel', seat, $event)"
        @pointerenter="emit('seat-pointerenter', seat, $event)"
        @pointerleave="emit('seat-pointerleave', seat, $event)"
      >
        <span class="map-seat__content">
          <strong>{{ seat.code }}</strong>
          <small>{{ seat.capacity || 1 }}人</small>
        </span>
      </button>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.seat-map-shell {
  overflow-x: auto;
  padding-bottom: .25rem;
  -webkit-overflow-scrolling: touch;
}

.coffee-seat-map {
  position: relative;
  min-width: var(--seat-map-min-width);
  height: var(--seat-map-height);
  overflow: hidden;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--cb-border-soft) 28%, transparent) 1px, transparent 1px),
    linear-gradient(0deg, color-mix(in srgb, var(--cb-border-soft) 24%, transparent) 1px, transparent 1px),
    linear-gradient(135deg, var(--cb-bg-soft), var(--cb-bg-page));
  background-size: 2rem 2rem, 2rem 2rem, auto;
  border: .125rem solid var(--cb-border-strong);
  border-radius: var(--cb-radius-xl);
  box-shadow: inset 0 0 0 .25rem color-mix(in srgb, var(--cb-bg-surface) 55%, transparent);
}

.map-zone {
  position: absolute;
  display: grid;
  place-items: center;
  padding: .35rem .6rem;
  color: var(--cb-text-secondary);
  font-size: var(--cb-font-size-xs);
  font-weight: var(--cb-font-bold);
  background: color-mix(in srgb, var(--cb-bg-surface) 78%, transparent);
  border: .0625rem dashed var(--cb-border-strong);
  border-radius: var(--cb-radius-md);
  pointer-events: none;
}

.map-zone--entrance { left: 3%; bottom: 4%; width: 18%; height: 12%; }
.map-zone--bar { right: 4%; bottom: 5%; width: 33%; height: 18%; }
.map-zone--window { left: 3%; top: 4%; width: 44%; height: 12%; }
.map-zone--reading { left: 24%; top: 28%; width: 34%; height: 42%; }
.map-zone--quiet { right: 5%; top: 8%; width: 24%; height: 24%; }
.map-zone--plant { width: 6rem; height: 3rem; color: var(--cb-success); border-style: solid; border-radius: 999px; }
.map-zone--plant-a { left: 6%; top: 58%; }
.map-zone--plant-b { right: 8%; top: 38%; }

.map-path {
  position: absolute;
  pointer-events: none;
}

.map-path--main {
  left: 6%;
  right: 8%;
  top: 72%;
  height: 1.4rem;
  background: color-mix(in srgb, var(--cb-color-gold) 12%, transparent);
  border-block: .0625rem solid color-mix(in srgb, var(--cb-color-gold) 32%, transparent);
}

.map-seat {
  position: absolute;
  z-index: 2;
  display: grid;
  place-content: center;
  color: var(--cb-text-primary);
  background: color-mix(in srgb, var(--cb-success) 18%, var(--cb-bg-surface));
  border: .125rem solid var(--cb-success);
  border-radius: var(--cb-radius-lg);
  transform: translate(-50%, -50%);
  transition: opacity var(--cb-duration-normal), box-shadow var(--cb-duration-normal), border-color var(--cb-duration-fast), background var(--cb-duration-fast);
  touch-action: none;
  user-select: none;
}

.coffee-seat-map--edit .map-seat.is-editable {
  cursor: grab;
}

.coffee-seat-map--edit .map-seat.is-editable:active,
.map-seat.is-dragging {
  z-index: 4;
  cursor: grabbing;
  box-shadow: 0 0 0 .3rem color-mix(in srgb, var(--cb-color-gold) 24%, transparent), var(--cb-shadow-lg);
}

.map-seat:hover:not([aria-disabled="true"]) {
  box-shadow: var(--cb-shadow-md);
}

.map-seat__content {
  display: grid;
  place-items: center;
  line-height: 1.1;
}

.map-seat small {
  font-size: var(--cb-font-size-xs);
}

.map-seat.is-reserved {
  color: var(--cb-text-muted);
  background: repeating-linear-gradient(135deg, var(--cb-bg-soft) 0, var(--cb-bg-soft) .35rem, color-mix(in srgb, var(--cb-border-strong) 28%, var(--cb-bg-soft)) .35rem, color-mix(in srgb, var(--cb-border-strong) 28%, var(--cb-bg-soft)) .7rem);
  border-color: var(--cb-border-strong);
  cursor: not-allowed;
}

.map-seat.is-maintenance {
  color: var(--cb-text-muted);
  background: repeating-linear-gradient(45deg, var(--cb-bg-soft) 0, var(--cb-bg-soft) .3rem, color-mix(in srgb, var(--cb-warning) 16%, var(--cb-bg-soft)) .3rem, color-mix(in srgb, var(--cb-warning) 16%, var(--cb-bg-soft)) .6rem);
  border-color: var(--cb-warning);
  cursor: not-allowed;
}

.map-seat.is-selected {
  z-index: 3;
  color: var(--cb-color-espresso);
  background: var(--cb-color-gold);
  border-color: var(--cb-color-caramel);
  box-shadow: 0 0 0 .25rem color-mix(in srgb, var(--cb-color-gold) 28%, transparent), var(--cb-shadow-md);
}

.coffee-seat-map.is-disabled .map-seat {
  opacity: .72;
}

@media (max-width: 40rem) {
  .coffee-seat-map {
    min-width: 36rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .map-seat {
    transition: none !important;
  }
}
</style>
