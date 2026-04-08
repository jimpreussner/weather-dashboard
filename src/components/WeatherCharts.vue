<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import Chart from "chart.js/auto";
import type { WeatherData } from "../types/weather";

const props = defineProps<{
  weather: {
    time: string[];
    temperature: number[];
    precipitation: number[];
  };
}>();

let tempChart: Chart | null = null;
let rainChart: Chart | null = null;

// Canvas refs
const tempCanvas = ref<HTMLCanvasElement | null>(null);
const rainCanvas = ref<HTMLCanvasElement | null>(null);

function createCharts() {
  if (!tempCanvas || !rainCanvas) return;

  const labels = props.weather.time.map(t =>
    new Date(t).toLocaleString("de-DE", { hour: "2-digit", day: "2-digit", month: "2-digit" })
  );

  // Temperatur Chart
  tempChart = new Chart(tempCanvas.value!, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Temperatur (°C)",
          data: props.weather.temperature,
          borderColor: "red",
          fill: false
        }
      ]
    }
  });

  // Niederschlag Chart
  rainChart = new Chart(rainCanvas.value!, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Niederschlag (mm)",
          data: props.weather.precipitation,
          backgroundColor: "blue"
        }
      ]
    }
  });
}

onMounted(createCharts);

// Wenn neue Daten kommen → Charts neu erstellen
watch(() => props.weather, () => {
  tempChart?.destroy();
  rainChart?.destroy();
  createCharts();
});
</script>

<template>
  <div>
    <h2>Temperatur</h2>
    <canvas ref="tempCanvas"></canvas>

    <h2>Niederschlag</h2>
    <canvas ref="rainCanvas"></canvas>
  </div>
</template>