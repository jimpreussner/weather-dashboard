<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import Chart from "chart.js/auto";

type WeatherMetric =
  | "temperature"
  | "precipitation"
  | "wind"
  | "asphaltTemp"
  | "directRadiation"
  | "cloudCover";

interface ProcessedWeatherSlice {
  time: string[];
  temperature: number[];
  precipitation: number[];
  wind: number[];
  asphaltTemp: number[];
  directRadiation: number[];
  cloudCover: number[];
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
    yAxisID: "y" | "y1" | "y2";
  }
> = {
  temperature: {
    label: "Temperature (°C)",
    color: "#e53935",
    type: "line",
    yAxisID: "y",
  },
  asphaltTemp: {
    label: "Asphalt temperature (°C)",
    color: "#fb8c00",
    type: "line",
    yAxisID: "y",
  },
  precipitation: {
    label: "Precipitation (mm)",
    color: "#1e88e5",
    type: "bar",
    yAxisID: "y1",
  },
  wind: {
    label: "Wind speed (m/s)",
    color: "#3949ab",
    type: "line",
    yAxisID: "y1",
  },
  directRadiation: {
    label: "Solar Radiation (W/m²)",
    color: "#f4511e",
    type: "line",
    yAxisID: "y2",
  },
  cloudCover: {
    label: "Cloud coverage (%)",
    color: "#546e7a",
    type: "line",
    yAxisID: "y1",
  }
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

function hasAxis(axisId: "y" | "y1" | "y2") {
  return props.selectedMetrics.some(
    (metric) => metricConfig[metric].yAxisID === axisId
  );
}

function getCurrentTimeIndex() {
  const now = new Date();
  const times = props.weather.time.map((t) => new Date(t).getTime());

  if (times.length === 0) return -1;
  if (now.getTime() < times[0] || now.getTime() > times[times.length - 1]) {
    return -1;
  }

  let closestIndex = 0;
  let smallestDiff = Infinity;

  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(times[i] - now.getTime());
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestIndex = i;
    }
  }

  return closestIndex;
}

const currentTimeLinePlugin = {
  id: "currentTimeLine",
  afterDatasetsDraw(chartInstance: Chart) {
    const xScale = chartInstance.scales.x;
    const yScale = chartInstance.scales.y;

    if (!xScale || !yScale) return;

    const index = getCurrentTimeIndex();
    if (index < 0) return;

    const x = xScale.getPixelForValue(index);
    const { ctx, chartArea } = chartInstance;

    if (x < chartArea.left || x > chartArea.right) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  },
};

function renderChart() {
  if (!chartCanvas.value) return;

  chart?.destroy();

  const labels = props.weather.time.map((t) =>
    new Date(t).toLocaleString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );

  chart = new Chart(chartCanvas.value, {
    type: "bar",
    data: {
      labels,
      datasets: buildDatasets(),
    },
    plugins: [currentTimeLinePlugin],
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
          grid: {
            display: true,
            color: "rgba(255,255,255,0.2)",
            drawTicks: true,
          },
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
          },
        },
        y: {
          type: "linear",
          position: "left",
          display: hasAxis("y"),
          grid: {
            display: true,
            color: "rgba(255,255,255,0.2)",
            drawTicks: true,
          },
          title: {
            display: hasAxis("y"),
            text: "Temperature (°C)",
          },
        },
        y1: {
          type: "linear",
          position: "right",
          display: hasAxis("y1") ? "auto" : false,
          grid: {
            drawOnChartArea: false,
            color: "rgba(255,255,255,0.2)",
          },
          title: {
            display: hasAxis("y1"),
            text: "Other Values",
          },
        },
        y2: {
          type: "linear",
          position: "right",
          display: hasAxis("y2") ? "auto" : false,
          grid: {
            drawOnChartArea: false,
            color: "rgba(255,255,255,0.08)",
          },
          title: {
            display: hasAxis("y2"),
            text: "Solar radiation (W/m²)",
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
  min-height: 450px;
}

@media (max-width: 600px) {
  .chart-wrapper {
    min-height: 400px;
  }
}
</style>