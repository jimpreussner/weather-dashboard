<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import Chart from "chart.js/auto";
import type { OpenMeteoResponse } from "../types/weather";

const props = defineProps<{
  weather: {
    time: string[];
    temperature: number[];
    precipitation: number[];
    wind: number[];
    asphaltTemp: number[];
    directRadiation: number[];
  };
}>();

let tempChart: Chart | null = null;
let rainChart: Chart | null = null;
let asphaltChart: Chart | null = null;
let radiationChart: Chart | null = null;
let windChart: Chart | null = null;

// Canvas refs
const tempCanvas = ref<HTMLCanvasElement | null>(null);
const rainCanvas = ref<HTMLCanvasElement | null>(null);
const asphaltCanvas = ref<HTMLCanvasElement | null>(null);
const radiationCanvas = ref<HTMLCanvasElement | null>(null);
const windCanvas = ref<HTMLCanvasElement | null>(null);

function createCharts() {
  if (!tempCanvas || !rainCanvas) return;

  const labels = props.weather.time.map(t =>
    new Date(t).toLocaleString("de-DE", { minute:"2-digit", hour:"2-digit", day: "2-digit", month: "2-digit" })
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

  // Asphalt Temp
  asphaltChart = new Chart(asphaltCanvas.value!, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Asphalt Temperatur (°C)",
          data: props.weather.asphaltTemp,
          borderColor: "orange",
          fill: false
        }
      ]
    }
  });

  // Solar Radiation
  radiationChart = new Chart(radiationCanvas.value!, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Sonneneinstrahlung (W/m^2)",
          data: props.weather.directRadiation,
          backgroundColor: "red"
        }
      ]
    }
  });

  // Wind
  windChart = new Chart(windCanvas.value!, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Windgeschwindigkeit (m/s)",
          data: props.weather.wind,
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
  asphaltChart?.destroy();
  radiationChart?.destroy();
  windChart?.destroy();
  createCharts();
});
</script>

<template>
  <div>
    <h2>Temperatur</h2>
    <canvas ref="tempCanvas"></canvas>

    <h2>Niederschlag</h2>
    <canvas ref="rainCanvas"></canvas>

    <h2>Asphalttemperatur</h2>
    <canvas ref="asphaltCanvas"></canvas>

    <h2>Sonneneinstrahlung</h2>
    <canvas ref="radiationCanvas"></canvas>

    <h2>Windgeschwindigkeit</h2>
    <canvas ref="windCanvas"></canvas>
  </div>
</template>