<script setup lang="ts">
import TrackSelector from "./components/TrackSelector.vue";
import type { Track } from "./data/tracks";
import { ref, computed} from "vue";
import { fetchWeather } from "./services/weatherService";
import type { WeatherData } from "./types/weather";
import WeatherCharts from "./components/WeatherCharts.vue";
import { filterWeatherByDay } from "./utils/weatherProcessing";


const selectedTrack = ref<Track | null>(null);
const selectedDay = ref<"today" | "tomorrow" | "dayAfter">("today");
const weatherData = ref<WeatherData | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const filteredWeather = computed(() => {
  if (!weatherData.value) return null;
  return filterWeatherByDay(weatherData.value, selectedDay.value);
});


async function handleTrackSelected(track: Track) {
  selectedTrack.value = track;
  console.log("Gewählte Strecke:", track);

  try {
    const data = await fetchWeather(track.lat, track.lon);
    weatherData.value = data;
  } catch (err) {
    error.value = "Fehler beim Laden der Daten";
  } finally {
    loading.value = false;
  }
}

</script>

<template>
  <h1>Wetter Dashboard</h1>

  <TrackSelector @trackSelected="handleTrackSelected" />

  <div>
    <label>Tag wählen:</label>
    <select v-model="selectedDay">
      <option value="today">Heute</option>
      <option value="tomorrow">Morgen</option>
      <option value="dayAfter">Übermorgen</option>
    </select>

  </div>

  <div v-if="selectedTrack">
    <p>Ausgewählt: {{ selectedTrack.name }}</p>
  </div>

  <div v-if="loading">Lade Wetterdaten...</div>
  <div v-if="error">{{ error }}</div>

  <div v-if="weatherData">
    <p>Daten erfolgreich geladen ✅</p>
    <p>Erster Temperaturwert: {{ weatherData.hourly.temperature_2m[0] }} °C</p>
  </div>

  <div v-if="weatherData">
    <WeatherCharts v-if="filteredWeather" :weather="filteredWeather" />
  </div>

</template>
