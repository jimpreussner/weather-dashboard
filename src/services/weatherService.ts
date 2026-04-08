export async function fetchWeather(lat: number, lon: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&minutely_15=temperature_2m,precipitation,wind_speed_10m,shortwave_radiation,direct_radiation&hourly=cloud_cover&forecast_days=3&timezone=Europe/Berlin`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Fehler beim Laden der Wetterdaten");
  }

  return await response.json();
}