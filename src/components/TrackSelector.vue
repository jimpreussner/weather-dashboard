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
    <label for="track-select">Track:</label>
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