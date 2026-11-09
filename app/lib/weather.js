async function fetchWeather(params) {
  const response = await fetch(`/api/weather?${params}`, {
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Error al obtener el clima.");
  }
  return data;
}

export function getWeatherByCity(city) {
  return fetchWeather(new URLSearchParams({ city: city.trim() }));
}

export function getWeatherByCoords(lat, lon) {
  return fetchWeather(
    new URLSearchParams({ lat: String(lat), lon: String(lon) })
  );
}
