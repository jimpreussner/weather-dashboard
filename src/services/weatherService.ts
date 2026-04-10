import { fetchWeatherApi } from "openmeteo";
import type { Track } from "../data/tracks";
import type { TrackWeatherRaw, WeatherModel } from "../types/weather";

function buildTimeRange(
  start: bigint,
  end: bigint,
  interval: number,
  utcOffsetSeconds: number
): Date[] {
  const startNum = Number(start);
  const endNum = Number(end);

  return Array.from(
    { length: (endNum - startNum) / interval },
    (_, i) => new Date((startNum + i * interval + utcOffsetSeconds) * 1000)
  );
}

export async function fetchWeatherForTrack(
  track: Track,
  model: WeatherModel = "best_match"
): Promise<TrackWeatherRaw> {
  const params: Record<string, unknown> = {
    latitude: [track.lat],
    longitude: [track.lon],
    minutely_15: [
      "temperature_2m",
      "precipitation",
      "wind_speed_10m",
      "shortwave_radiation",
      "direct_radiation",
    ],
    hourly: ["cloud_cover"],
    forecast_days: 3,
    wind_speed_unit: "ms",
    timezone: "Europe/Berlin",
  };

  if (model !== "best_match") {
    params.models = model;
  }

  const responses = await fetchWeatherApi(
    "https://api.open-meteo.com/v1/forecast",
    params
  );

  const response = responses[0];
  const utcOffsetSeconds = response.utcOffsetSeconds();
  const minutely15 = response.minutely15()!;
  const hourly = response.hourly()!;

  return {
    trackName: track.name,
    model,
    latitude: response.latitude(),
    longitude: response.longitude(),
    elevation: response.elevation(),
    utcOffsetSeconds,
    timezone: "Europe/Berlin",
    minutely15: {
      time: buildTimeRange(
        minutely15.time(),
        minutely15.timeEnd(),
        minutely15.interval(),
        utcOffsetSeconds
      ),
      temperature_2m: minutely15.variables(0)?.valuesArray() ?? null,
      precipitation: minutely15.variables(1)?.valuesArray() ?? null,
      wind_speed_10m: minutely15.variables(2)?.valuesArray() ?? null,
      shortwave_radiation: minutely15.variables(3)?.valuesArray() ?? null,
      direct_radiation: minutely15.variables(4)?.valuesArray() ?? null,
    },
    hourly: {
      time: buildTimeRange(
        hourly.time(),
        hourly.timeEnd(),
        hourly.interval(),
        utcOffsetSeconds
      ),
      cloud_cover: hourly.variables(0)?.valuesArray() ?? null,
    },
  };
}