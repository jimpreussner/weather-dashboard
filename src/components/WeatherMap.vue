<template>
  <div class="radar-section">
    <div class="map-container">
      <div ref="mapContainer" class="map"></div>

      <div v-if="radarFrames.length > 0" class="map-controls top-right">
        <button class="map-btn" type="button" @click="togglePlayback">
          {{ isPlaying ? "Pause" : "Play" }}
        </button>

        <button
          class="map-btn"
          type="button"
          :class="{ active: lockToTrack }"
          @click="toggleLock"
        >
          {{ lockToTrack ? "Fixed" : "Movable" }}
        </button>
      </div>

      <div v-if="radarFrames.length > 0" class="map-overlay bottom">
        <div class="overlay-card">
          <div class="overlay-head">
            <div class="timestamp">
              {{ formatTime(radarFrames[currentFrame]?.time) }}
            </div>
            <div class="frame-count">
              {{ currentFrame + 1 }} / {{ radarFrames.length }}
            </div>
          </div>

          <input
            class="timeline-slider"
            type="range"
            min="0"
            :max="Math.max(radarFrames.length - 1, 0)"
            step="1"
            :value="currentFrame"
            @input="onSliderInput"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

const props = defineProps<{
  track: { name: string; lat: number; lon: number } | null
  selectedDay: string
}>()

type RadarFrame = {
  url: string
  time: number
}

const mapContainer = ref<HTMLDivElement | null>(null)
const radarFrames = ref<RadarFrame[]>([])
const currentFrame = ref(0)
const lockToTrack = ref(true)
const isPlaying = ref(true)

let map: maplibregl.Map | null = null
let marker: maplibregl.Marker | null = null
let intervalId: number | null = null
let abortController: AbortController | null = null

function formatTime(ts?: number) {
  if (!ts) return "--:--"
  const date = new Date(ts * 1000)
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function initMap() {
  if (!mapContainer.value) return

  map = new maplibregl.Map({
    container: mapContainer.value,
    style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    center: props.track ? [props.track.lon, props.track.lat] : [10, 51],
    zoom: props.track ? 6 : 5,
    maxZoom: 6.4
  })

  map.addControl(new maplibregl.NavigationControl(), "top-left")

  map.on("dragstart", () => {
    if (lockToTrack.value) {
      lockToTrack.value = false
    }
  })

  map.on("load", async () => {
    applyInteractionLock(lockToTrack.value)
    await loadRadar()
    centerOnTrack(false)
  })

}

function ensureRadarSource() {
  if (!map || !radarFrames.value.length) return

  if (!map.getSource("radar")) {
    map.addSource("radar", {
      type: "raster",
      tiles: [radarFrames.value[currentFrame.value].url],
      tileSize: 256,
    })

    map.addLayer({
      id: "radar-layer",
      type: "raster",
      source: "radar",
      paint: {
        "raster-opacity": 0.72,
      },
    })
  }
}

function updateRadarFrame() {
  if (!map || !radarFrames.value.length) return

  const source = map.getSource("radar") as maplibregl.RasterTileSource | undefined
  const frame = radarFrames.value[currentFrame.value]
  if (!source || !frame) return

  source.setTiles([frame.url])
}

async function loadRadar() {
  stopAnimation()

  if (props.selectedDay !== "today") {
    radarFrames.value = []
    return
  }

  abortController?.abort()
  abortController = new AbortController()

  try {
    const res = await fetch(
      "https://api.rainviewer.com/public/weather-maps.json",
      { signal: abortController.signal }
    )

    const data = await res.json()
    const host = data.host

    const pastFrames = Array.isArray(data?.radar?.past) ? data.radar.past : []
    const nowcastFrames = Array.isArray(data?.radar?.nowcast) ? data.radar.nowcast : []

    radarFrames.value = [...pastFrames, ...nowcastFrames].map((f: any) => ({
      url: `${host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,
      time: f.time,
    }))

    currentFrame.value = 0

    if (!map || !radarFrames.value.length) return

    ensureRadarSource()
    updateRadarFrame()

    if (isPlaying.value) {
      startAnimation()
    }
  } catch (error: any) {
    if (error?.name !== "AbortError") {
      console.error("Radar loading failed:", error)
    }
  }
}

function nextFrame() {
  if (!radarFrames.value.length) return
  currentFrame.value = (currentFrame.value + 1) % radarFrames.value.length
  updateRadarFrame()
}

function startAnimation() {
  if (intervalId || radarFrames.value.length <= 1) return

  intervalId = window.setInterval(() => {
    nextFrame()
  }, 1000)
}

function stopAnimation() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

function togglePlayback() {
  isPlaying.value = !isPlaying.value

  if (isPlaying.value) {
    startAnimation()
  } else {
    stopAnimation()
  }
}

function onSliderInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  currentFrame.value = value
  updateRadarFrame()

  if (isPlaying.value) {
    isPlaying.value = false
    stopAnimation()
  }
}

function centerOnTrack(animate = true) {
  if (!map || !props.track) return

  const center: [number, number] = [props.track.lon, props.track.lat]

  if (animate) {
    map.flyTo({
      center,
      zoom: 6,
      essential: true,
    })
  } else {
    map.jumpTo({
      center,
      zoom: 6,
    })
  }

  if (marker) {
    marker.setLngLat(center)
  } else {
    marker = new maplibregl.Marker({ color: "#ff630f" })
      .setLngLat(center)
      .addTo(map)
  }
}

function toggleLock() {
  lockToTrack.value = !lockToTrack.value

  if (lockToTrack.value) {
    centerOnTrack(true)
  }
}

function applyInteractionLock(locked: boolean) {
  if (!map) return

  if (locked) {
    map.dragPan.disable()
    map.scrollZoom.disable()
    map.boxZoom.disable()
    map.doubleClickZoom.disable()
    map.touchZoomRotate.disable()
    map.keyboard.disable()
  } else {
    map.dragPan.enable()
    map.scrollZoom.enable()
    map.boxZoom.enable()
    map.doubleClickZoom.enable()
    map.touchZoomRotate.enable()
    map.keyboard.enable()
  }
}

watch(
  () => props.track,
  async () => {
    if (lockToTrack.value) {
      centerOnTrack(true)
    } else if (props.track) {
      if (marker) {
        marker.setLngLat([props.track.lon, props.track.lat])
      } else if (map) {
        marker = new maplibregl.Marker({ color: "#ff630f" })
          .setLngLat([props.track.lon, props.track.lat])
          .addTo(map)
      }
    }

    await loadRadar()
  }
)

watch(
  () => props.selectedDay,
  async (day) => {
    if (day === "today") {
      await loadRadar()
    } else {
      stopAnimation()
      radarFrames.value = []
    }
  }
)

watch(lockToTrack, (locked) => {
  applyInteractionLock(locked)

  if (locked) {
    centerOnTrack(true)
  }
})

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  stopAnimation()
  abortController?.abort()
  marker?.remove()
  map?.remove()
  map = null
})
</script>

<style scoped>
.radar-section {
  margin-top: 32px;
}

.map-container {
  position: relative;
  width: 100%;
  height: 400px;
  border: 1px solid var(--accent);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow);
}

.map {
  width: 100%;
  height: 100%;
}

.map-controls {
  position: absolute;
  z-index: 2;
  display: flex;
  gap: 8px;
}

.map-controls.top-right {
  top: 12px;
  right: 12px;
}

.map-overlay {
  position: absolute;
  z-index: 2;
  left: 12px;
  right: 12px;
  pointer-events: none;
}

.map-overlay.bottom {
  bottom: 12px;
}

.overlay-card {
  pointer-events: auto;
  max-width: 20%;
  padding: 12px;
  border: 1px solid var(--accent);
  border-radius: 12px;
  background: rgba(18, 19, 23, 0.82);
  backdrop-filter: blur(10px);
  color: #fff;
}

.overlay-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.timestamp,
.frame-count {
  font-size: 13px;
  color: #fff;
}

.map-btn {
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid var(--accent);
  border-radius: 10px;
  background: rgba(18, 19, 23, 0.78);
  color: #fff;
  font: inherit;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.map-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.map-btn.active {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
}

.timeline-slider {
  width: 100%;
  margin: 0 0 10px;
  accent-color: var(--accent);
  cursor: pointer;
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: var(--accent);
  transition: width 0.2s linear;
}

@media (max-width: 900px) {
  .radar-section {
    margin-top: 24px;
  }

  .map-container {
    height: 320px;
  }

  .map-controls.top-right {
    top: 10px;
    right: 10px;
  }

  .map-overlay {
    left: 10px;
    right: 10px;
  }

  .overlay-card {
    padding: 10px;
  }

  .map-btn {
    min-height: 34px;
    padding: 0 10px;
    font-size: 14px;
  }

  .overlay-head {
    margin-bottom: 8px;
  }
}
</style>