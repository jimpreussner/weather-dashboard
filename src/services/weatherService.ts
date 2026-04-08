export async function fetchWeather(lat: number, lon: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation&forecast_days=3&timezone=Europe/Berlin`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Fehler beim Laden der Wetterdaten");
  }

  return await response.json();
}