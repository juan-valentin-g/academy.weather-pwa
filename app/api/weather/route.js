function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const params = new URLSearchParams({ units: "metric", lang: "es" });

  if (city) {
    params.set("q", city);
  } else {
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (
      !lat?.trim() || !lon?.trim() ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180
    ) {
      return json({ error: "Indica una ciudad o coordenadas válidas." }, 400);
    }
    params.set("lat", String(latitude));
    params.set("lon", String(longitude));
  }

  const apiKey = process.env.WEATHER_API_KEY?.trim();
  if (!apiKey) {
    return json(
      { error: "Falta configurar WEATHER_API_KEY en el servidor." }, 500
    );
  }
  params.set("appid", apiKey);

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?${params}`,
      { cache: "no-store", signal: AbortSignal.timeout(10000) }
    );
    if (!response.ok) {
      if (response.status === 404) {
        return json({ error: "No se encontró la ciudad solicitada." }, 404);
      }
      if (response.status === 401 || response.status === 403) {
        return json(
          { error: "OpenWeather rechazó la clave. Revisa WEATHER_API_KEY." }, 502
        );
      }
      if (response.status === 429) {
        return json(
          { error: "Se alcanzó el límite de consultas del clima. Intenta más tarde." }, 429
        );
      }
      return json({ error: "El servicio del clima no está disponible." }, 502);
    }
    return json(await response.json());
  } catch {
    // No devolver errores del proveedor: pueden contener la URL con la clave.
    return json({ error: "No se pudo conectar con el servicio del clima." }, 502);
  }
}
