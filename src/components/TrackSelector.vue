<script setup lang="ts">
import { tracks, type Track } from "../data/tracks";
import { ref } from "vue";

const selectedTrack = ref<Track | null>(null);

// Event an Eltern-Komponente senden
const emit = defineEmits<{
  (e: "trackSelected", track: Track): void;
}>();

function onChange(event: Event) {
  const index = (event.target as HTMLSelectElement).value;
  const track = tracks[Number(index)];
  selectedTrack.value = track;
  emit("trackSelected", track);
}
</script>

<template>
  <div>
    <label>Select Racetrack:</label>
    <select @change="onChange">
      <option disabled selected>Select</option>
      <option v-for="(track, index) in tracks" :key="index" :value="index">
        {{ track.name }}
      </option>
    </select>
  </div>
</template>