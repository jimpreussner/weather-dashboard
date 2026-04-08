import type { WeatherData } from "../types/weather";

export function filterWeatherByDay(
  data: WeatherData,
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

  const times = data.hourly.time;
  const temps = data.hourly.temperature_2m;
  const rain = data.hourly.precipitation;

  const filtered = {
    time: [] as string[],
    temperature: [] as number[],
    precipitation: [] as number[]
  };

  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]);

    if (t >= start && t <= end) {
      filtered.time.push(times[i]);
      filtered.temperature.push(temps[i]);
      filtered.precipitation.push(rain[i]);
    }
  }

  return filtered;
}