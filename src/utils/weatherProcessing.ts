// services/weatherProcessing.ts
import type { ProcessedWeatherSlice, TrackWeatherRaw } from "../types/weather";

export function processWeather(
  data: TrackWeatherRaw,
  day: "today" | "tomorrow" | "dayAfter"
): ProcessedWeatherSlice {
  const now = new Date();
  const baseDate = new Date(now);

  if (day === "tomorrow") baseDate.setDate(now.getDate() + 1);
  if (day === "dayAfter") baseDate.setDate(now.getDate() + 2);

  const start = new Date(baseDate);
  start.setHours(8, 0, 0, 0);

  const end = new Date(baseDate);
  end.setHours(20, 0, 0, 0);

  const times = data.minutely15.time;
  const temps = data.minutely15.temperature_2m;
  const rain = data.minutely15.precipitation;
  const wind = data.minutely15.wind_speed_10m;
  const shortwave = data.minutely15.shortwave_radiation;
  const direct = data.minutely15.direct_radiation;

  const hourlyTimes = data.hourly.time;
  const clouds = data.hourly.cloud_cover;

  if (!temps || !rain || !wind || !shortwave || !direct || !clouds) {
    throw new Error("Unvollständige Wetterdaten");
  }

  const result: ProcessedWeatherSlice = {
    time: [],
    temperature: [],
    precipitation: [],
    wind: [],
    asphaltTemp: [],
    directRadiation: [],
    cloudCover: [],
    radiationCoef: [],
  };

  for (let i = 0; i < times.length; i++) {
    const t = times[i];

    if (t >= start && t <= end) {
      const cloud = interpolateCloud(t, hourlyTimes, clouds);

      const asphalt = 10 + 1.05433 * temps[i] + 0.02515 * direct[i];

      const radiationCoef =
        (2 * (shortwave[i] - direct[i])) / (shortwave[i] + direct[i] || 1);

      result.time.push(t.toISOString());
      result.temperature.push(temps[i]);
      result.precipitation.push(rain[i]);
      result.wind.push(wind[i]);
      result.asphaltTemp.push(asphalt);
      result.directRadiation.push(direct[i]);
      result.cloudCover.push(cloud);
      result.radiationCoef.push(radiationCoef);
    }
  }

  return result;
}

function interpolateCloud(
  target: Date,
  hourlyTimes: Date[],
  clouds: Float32Array
): number {
  for (let i = 0; i < hourlyTimes.length - 1; i++) {
    const t0 = hourlyTimes[i];
    const t1 = hourlyTimes[i + 1];

    if (target >= t0 && target <= t1) {
      const ratio =
        (target.getTime() - t0.getTime()) /
        (t1.getTime() - t0.getTime());

      return (clouds[i] + (clouds[i + 1] - clouds[i]) * ratio) / 100;
    }
  }

  return clouds[clouds.length - 1] / 100;
}