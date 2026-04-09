<script setup lang="ts">
import TrackSelector from "./components/TrackSelector.vue";
import type { Track } from "./data/tracks";
import { ref, computed} from "vue";
import { fetchWeather } from "./services/weatherService";
import type { OpenMeteoResponse } from "./types/weather";
import WeatherCharts from "./components/WeatherCharts.vue";
import { processWeather } from "./utils/weatherProcessing";


const selectedTrack = ref<Track | null>(null);
const selectedDay = ref<"today" | "tomorrow" | "dayAfter">("today");
const weatherData = ref<OpenMeteoResponse | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const processedWeather = computed(() => {
  if (!weatherData.value) return null;
  return processWeather(weatherData.value, selectedDay.value);
});


async function handleTrackSelected(track: Track) {
  selectedTrack.value = track;

  try {
    const data = await fetchWeather(track.lat, track.lon);
    weatherData.value = data;
  } catch (err) {
    error.value = "Error while fetching the data";
  } finally {
    loading.value = false;
  }
}

</script>

<template>
  <h1>Formula Student Weather Dashboard</h1>

  <TrackSelector @trackSelected="handleTrackSelected" />

  <div>
    <label>Select Day:</label>
    <select v-model="selectedDay">
      <option value="today">Today</option>
      <option value="tomorrow">Tomorrow</option>
      <option value="dayAfter">Overmorrow</option>
    </select>
  </div>

  <div v-if="loading">Loading Weather Data...</div>
  <div v-if="error">{{ error }}</div>

  <div v-if="weatherData">
    <WeatherCharts v-if="processedWeather" :weather="processedWeather" />
  </div>

</template>
