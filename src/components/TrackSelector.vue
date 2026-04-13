<script setup lang="ts">
import { tracks, type Track } from "../data/tracks";

defineProps<{
  modelValue: Track | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [track: Track | null];
}>();

function onChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  const track = tracks.find((t) => t.name === value) ?? null;
  emit("update:modelValue", track);
}
</script>

<template>
  <div class="track-selector">
    <label for="track-select"></label>
    <select
      id="track-select"
      :value="modelValue?.name ?? ''"
      @change="onChange"
    >
      <option value="" disabled>Select a track</option>
      <option v-for="track in tracks" :key="track.name" :value="track.name">
        {{ track.name }}
      </option>
    </select>
  </div>
</template>

<style scoped>
select {
  width: 100%;
  min-height: 46px;
  padding: 0 12px;
  border: 1px solid var(--accent);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text-h);
  font: inherit;
  box-sizing: border-box;
}
</style>