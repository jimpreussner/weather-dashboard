<script setup lang="ts">
import { onMounted, watch } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const props = defineProps<{
  lat: number;
  lon: number;
}>();

let map: maplibregl.Map;
let marker: maplibregl.Marker;

let radarFrames: string[] = [];
let currentFrame = 0;

async function loadRadarFrames() {
  const res = await fetch("https://api.rainviewer.com/public/weather-maps.json")
  const data = await res.json()

  const host = data.host

  radarFrames = data.radar.past.map((frame: any) =>
    `${host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`
  )
}


function startAnimation() {

  setInterval(() => {

    if (!map || radarFrames.length === 0) return

    currentFrame = (currentFrame + 1) % radarFrames.length

    map.removeLayer("radar-layer")
    map.removeSource("radar")

    map.addSource("radar", {
      type: "raster",
      tiles: [radarFrames[currentFrame]],
      tileSize: 256
    })

    map.addLayer({
      id: "radar-layer",
      type: "raster",
      source: "radar",
      paint: { "raster-opacity": 0.6 }
    })

  }, 800)
}

onMounted(async () => {
  await loadRadarFrames();

  map = new maplibregl.Map({
    container: "map",
    style: "https://demotiles.maplibre.org/style.json",
    center: [props.lon, props.lat],
    zoom: 1
  });

  map.on("load", () => {
    map.addSource("radar", {
      type: "raster",
      tiles: [radarFrames[0]],
      tileSize: 256
    });

    map.addLayer({
      id: "radar-layer",
      type: "raster",
      source: "radar",
      paint: {
        "raster-opacity": 0.6
      }
    });

    // Marker setzen
    marker = new maplibregl.Marker()
      .setLngLat([props.lon, props.lat])
      .addTo(map);

    startAnimation();
  });
});

// Track wechseln → Karte zentrieren
watch(
  () => [props.lat, props.lon],
  ([lat, lon]) => {
    if (!map) return;
    map.setCenter([lon, lat]);
    marker.setLngLat([lon, lat]);
  }
);
</script>

<template>
  <div id="map" style="height: 500px;"></div>
</template>