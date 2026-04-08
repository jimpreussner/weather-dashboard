import type { OpenMeteoResponse } from "../types/weather";

export function processWeather(
  data: OpenMeteoResponse,
  day: "today" | "tomorrow" | "dayAfter"
) {
  const now = new Date();
  const baseDate = new Date(now);

  if (day === "tomorrow") baseDate.setDate(now.getDate() + 1);
  if (day === "dayAfter") baseDate.setDate(now.getDate() + 2);

  const start = new Date(baseDate);
  start.setHours(8, 0, 0, 0);

  const end = new Date(baseDate);
  end.setHours(20, 0, 0, 0);

  const times = data.minutely_15.time;
  const temps = data.minutely_15.temperature_2m;
  const rain = data.minutely_15.precipitation;
  const wind = data.minutely_15.wind_speed_10m;
  const shortwave = data.minutely_15.shortwave_radiation;
  const direct = data.minutely_15.direct_radiation;

  const hourlyTimes = data.hourly.time.map(t => new Date(t));
  const clouds = data.hourly.cloud_cover;

  const result = {
    time: [] as string[],
    temperature: [] as number[],
    precipitation: [] as number[],
    wind: [] as number[],
    asphaltTemp: [] as number[],
    directRadiation: [] as number[],
    cloudCover: [] as number[]
  };

  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]);

    if (t >= start && t <= end) {
      // Interpolation Cloud Cover
      const cloud = interpolateCloud(t, hourlyTimes, clouds);

      // Asphalt Temp (dein Modell)
      const asphalt =
        10 + 1.05433 * temps[i] + 0.02515 * direct[i];

      // Radiation Coef
      const radCoef =
        2 * (shortwave[i] - direct[i]) /
        (shortwave[i] + direct[i] || 1);

      result.time.push(times[i]);
      result.temperature.push(temps[i]);
      result.precipitation.push(rain[i]);
      result.wind.push(wind[i]);
      result.asphaltTemp.push(asphalt);
      result.directRadiation.push(direct[i]);
      result.cloudCover.push(cloud);
    }
  }

  return result;
}

function interpolateCloud(
  target: Date,
  hourlyTimes: Date[],
  clouds: number[]
) {
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