<script setup lang="ts">
import { ref, computed, watch } from "vue";
import TrackSelector from "./components/TrackSelector.vue";
import WeatherCharts from "./components/WeatherCharts.vue";

import type { Track } from "./data/tracks";
import { fetchWeatherForTrack } from "./services/weatherService";
import { processWeather } from "./utils/weatherProcessing";
import type { TrackWeatherRaw, WeatherModel } from "./types/weather";

type DayOption = "today" | "tomorrow" | "dayAfter";
type WeatherMetric =
  | "temperature"
  | "precipitation"
  | "wind"
  | "asphaltTemp"
  | "directRadiation"
  | "cloudCover"
  | "radiationCoef";

const selectedTrack = ref<Track | null>(null);
const selectedDay = ref<DayOption>("today");
const selectedModel = ref<WeatherModel>("best_match");

const selectedMetrics = ref<WeatherMetric[]>([
  "temperature",
  "asphaltTemp",
  "precipitation",
]);

const weatherData = ref<TrackWeatherRaw | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const availableModels: { value: WeatherModel; label: string }[] = [
  { value: "best_match", label: "Best Match" },
  { value: "icon_d2", label: "ICON-D2" },
  { value: "icon_eu", label: "ICON-EU" },
  { value: "ecmwf_ifs04", label: "ECMWF IFS 0.4" },
  { value: "gfs_global", label: "GFS Global" },
];

const availableMetrics: { value: WeatherMetric; label: string }[] = [
  { value: "temperature", label: "Temperatur" },
  { value: "asphaltTemp", label: "Asphalttemperatur" },
  { value: "precipitation", label: "Niederschlag" },
  { value: "wind", label: "Wind" },
  { value: "directRadiation", label: "Direktstrahlung" },
  { value: "cloudCover", label: "Wolkenbedeckung" }
  //{ value: "radiationCoef", label: "Radiation Coef" },
];

const selectedModelLabel = computed(() => {
  return (
    availableModels.find((m) => m.value === selectedModel.value)?.label ??
    selectedModel.value
  );
});

const processedWeather = computed(() => {
  if (!weatherData.value) return null;
  return processWeather(weatherData.value, selectedDay.value);
});

async function loadWeather() {
  if (!selectedTrack.value) return;

  loading.value = true;
  error.value = null;
  weatherData.value = null;

  try {
    weatherData.value = await fetchWeatherForTrack(
      selectedTrack.value,
      selectedModel.value
    );
  } catch {
    error.value = "Error while fetching the data";
  } finally {
    loading.value = false;
  }
}

async function handleTrackSelected(track: Track) {
  selectedTrack.value = track;
  await loadWeather();
}

watch(selectedModel, async () => {
  if (selectedTrack.value) {
    await loadWeather();
  }
});

watch(selectedTrack, async (track) => {
  if (!track) {
    weatherData.value = null;
    return;
  }

  await loadWeather();
});

</script>

<template>
  <h1>Formula Student Weather Dashboard</h1>

  <div class="controls-grid">
    <div class="left-column">
      <div class="control-block">
        <label>Track</label>
        <TrackSelector v-model="selectedTrack" />
      </div>

      <div class="control-block">
        <label for="day-select">Day</label>
        <select id="day-select" v-model="selectedDay">
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="dayAfter">Overmorrow</option>
        </select>
      </div>

      <div class="control-block">
        <label for="model-select">Weather model</label>
        <select id="model-select" v-model="selectedModel">
          <option
            v-for="model in availableModels"
            :key="model.value"
            :value="model.value"
          >
            {{ model.label }}
          </option>
        </select>
      </div>
    </div>

    <div class="right-column">
      <label>Data series</label>

      <div class="metrics-grid">
        <label
          v-for="metric in availableMetrics"
          :key="metric.value"
          class="metric-option"
        >
          <input
            v-model="selectedMetrics"
            type="checkbox"
            :value="metric.value"
          />
          {{ metric.label }}
        </label>
      </div>
    </div>
  </div>

  <div v-if="loading">Loading weather data...</div>
  <div v-else-if="error">{{ error }}</div>

  <div v-else-if="processedWeather && selectedTrack">
    <WeatherCharts
      :weather="processedWeather"
      :selected-metrics="selectedMetrics"
      :track-name="selectedTrack?.name"
      :model-name="selectedModelLabel"
    />
  </div>
</template>

<style scoped>
.controls-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  margin-bottom: 24px;
  text-align: left;
}

.left-column {
  display: grid;
  gap: 16px;
}

.right-column {
  display: grid;
  gap: 12px;
}

.control-block {
  display: grid;
  gap: 8px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
}

.metric-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 900px) {
  .controls-grid {
    grid-template-columns: 1fr;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>