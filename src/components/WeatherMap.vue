<template>
  <div class="map-container">
    <div ref="mapContainer" class="map"></div>

    <!-- Overlay UI -->
    <div v-if="radarFrames.length > 0" class="map-overlay">
      <div class="timestamp">
        {{ formatTime(radarFrames[currentFrame]?.time) }}
      </div>

      <div class="progress-bar">
        <div
          class="progress"
          :style="{ width: progress + '%' }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

// 👉 Props: Strecke + Tag
const props = defineProps<{
  track: { name: string; lat: number; lon: number } | null
  selectedDay: string // "today", "tomorrow", ...
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
let map: maplibregl.Map | null = null

type RadarFrame = {
  url: string
  time: number
}

const radarFrames = ref<RadarFrame[]>([])
let currentFrame = ref(0)
let intervalId: number | null = null
let marker: maplibregl.Marker | null = null

// 👉 Progress %
const progress = computed(() => {
  if (radarFrames.value.length <= 1) return 0
  return (currentFrame.value / (radarFrames.value.length - 1)) * 100
})

// 👉 Zeit formatieren
function formatTime(ts: number) {
  const date = new Date(ts * 1000)
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  })
}

// 👉 Map initialisieren
function initMap() {
  if (!mapContainer.value) return

  map = new maplibregl.Map({
    container: mapContainer.value,
    style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    center: [10, 51],
    zoom: 6
  })
}

// 👉 Radar laden
async function loadRadar() {
  if (!props.track || props.selectedDay !== "today") return

  const res = await fetch("https://api.rainviewer.com/public/weather-maps.json")
  const data = await res.json()

  const host = data.host

  radarFrames.value = data.radar.past.map((f: any) => ({
    url: `${host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,
    time: f.time
  }))

  currentFrame.value = 0

  if (!map) return

  // 👉 Quelle + Layer nur EINMAL erstellen
  if (!map.getSource("radar")) {
    map.addSource("radar", {
      type: "raster",
      tiles: [radarFrames.value[0].url],
      tileSize: 256
    })

    map.addLayer({
      id: "radar-layer",
      type: "raster",
      source: "radar",
      paint: { "raster-opacity": 0.6 }
    })
  }

  startAnimation()
}

// 👉 Animation starten
function startAnimation() {
  if (intervalId) return

  intervalId = window.setInterval(() => {
    nextFrame()
  }, 1500)
}

// 👉 Frame wechseln
function nextFrame() {
  if (!map || radarFrames.value.length === 0) return

  currentFrame.value =
    (currentFrame.value + 1) % radarFrames.value.length

    if (!map) return

    // alte Source entfernen
    if (map.getLayer("radar-layer")) {
    map.removeLayer("radar-layer")
    }

    if (map.getSource("radar")) {
    map.removeSource("radar")
    }

    // neue Source setzen (mit neuem Frame)
    map.addSource("radar", {
    type: "raster",
    tiles: [radarFrames.value[currentFrame.value].url],
    tileSize: 256
    })

    // Layer wieder hinzufügen
    map.addLayer({
    id: "radar-layer",
    type: "raster",
    source: "radar",
    paint: { "raster-opacity": 0.6 }
    })

}

// 👉 Karte auf Strecke zentrieren
function updateMapView() {
  if (!map || !props.track) return

  map.flyTo({
    center: [props.track.lon, props.track.lat],
    zoom: 6
  })

  // Marker setzen
  if (marker) marker.remove()

  marker = new maplibregl.Marker()
    .setLngLat([props.track.lon, props.track.lat])
    .addTo(map)
}

// 👉 Lifecycle
onMounted(() => {
  initMap()

  if (!map) return

  map.on("load", async () => {
    await loadRadar()
    updateMapView()
  })
})

// 👉 Reaktion auf Änderungen
watch(
  () => props.track,
  () => {
    updateMapView()
    loadRadar()
  }
)

watch(
  () => props.selectedDay,
  () => {
    if (props.selectedDay === "today") {
      loadRadar()
    } else {
      radarFrames.value = []
    }
  }
)
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 400px;
}

.map {
  width: 100%;
  height: 100%;
}

/* Overlay */
.map-overlay {
  position: absolute;
  bottom: 10px;
  left: 10px;
  right: 10px;
  color: white;
  font-size: 14px;
}

.timestamp {
  margin-bottom: 4px;
  text-shadow: 0 0 4px black;
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: #00aaff;
  transition: width 1.5s linear;
}
</style>