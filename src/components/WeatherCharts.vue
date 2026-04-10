<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import Chart from "chart.js/auto";

type WeatherMetric =
  | "temperature"
  | "precipitation"
  | "wind"
  | "asphaltTemp"
  | "directRadiation"
  | "cloudCover"
  | "radiationCoef";

interface ProcessedWeatherSlice {
  time: string[];
  temperature: number[];
  precipitation: number[];
  wind: number[];
  asphaltTemp: number[];
  directRadiation: number[];
  cloudCover: number[];
  radiationCoef: number[];
}

const props = defineProps<{
  weather: ProcessedWeatherSlice;
  selectedMetrics: WeatherMetric[];
  trackName?: string;
  modelName?: string;
}>();

const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

const metricConfig: Record<
  WeatherMetric,
  {
    label: string;
    color: string;
    type: "line" | "bar";
    yAxisID: "y" | "y1";
  }
> = {
  temperature: {
    label: "Temperatur (°C)",
    color: "#e53935",
    type: "line",
    yAxisID: "y",
  },
  asphaltTemp: {
    label: "Asphalttemperatur (°C)",
    color: "#fb8c00",
    type: "line",
    yAxisID: "y",
  },
  precipitation: {
    label: "Niederschlag (mm)",
    color: "#1e88e5",
    type: "bar",
    yAxisID: "y1",
  },
  wind: {
    label: "Windgeschwindigkeit (m/s)",
    color: "#3949ab",
    type: "line",
    yAxisID: "y1",
  },
  directRadiation: {
    label: "Direktstrahlung (W/m²)",
    color: "#f4511e",
    type: "line",
    yAxisID: "y1",
  },
  cloudCover: {
    label: "Wolkenbedeckung (%)",
    color: "#546e7a",
    type: "line",
    yAxisID: "y1",
  },
  radiationCoef: {
    label: "Radiation Coef",
    color: "#8e24aa",
    type: "line",
    yAxisID: "y1",
  },
};

function buildDatasets() {
  return props.selectedMetrics.map((metric) => {
    const cfg = metricConfig[metric];
    const values = props.weather[metric];

    return {
      type: cfg.type,
      label: cfg.label,
      data: values,
      borderColor: cfg.color,
      backgroundColor: cfg.type === "bar" ? `${cfg.color}99` : cfg.color,
      yAxisID: cfg.yAxisID,
      tension: 0.25,
      fill: false,
      pointRadius: 0,
      borderWidth: 2,
      order: cfg.type === "line" ? 1 : 2,
    };
  });
}

function renderChart() {
  if (!chartCanvas.value) return;

  chart?.destroy();

  const labels = props.weather.time.map((t) =>
    new Date(t).toLocaleString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    })
  );

  chart = new Chart(chartCanvas.value, {
    type: "bar",
    data: {
      labels,
      datasets: buildDatasets(),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: [props.trackName, props.modelName].filter(Boolean).join(" — "),
        },
        legend: {
          position: "top",
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            autoSkip: true,
          },
        },
        y: {
          type: "linear",
          position: "left",
          title: {
            display: true,
            text: "Temperatur",
          },
        },
        y1: {
          type: "linear",
          position: "right",
          grid: {
            drawOnChartArea: false,
          },
          title: {
            display: true,
            text: "Weitere Werte",
          },
        },
      },
    },
  });
}

onMounted(renderChart);

watch(
  () => [props.weather, props.selectedMetrics, props.trackName, props.modelName],
  () => {
    renderChart();
  },
  { deep: true }
);
</script>

<template>
  <div class="chart-wrapper">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<style scoped>
.chart-wrapper {
  position: relative;
  width: 100%;
  min-height: 420px;
}
</style>