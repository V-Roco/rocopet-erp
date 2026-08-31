// Geocodifica una dirección con la API de Google Maps. Si no hay
// GOOGLE_MAPS_API_KEY configurada, o la llamada falla, devuelve null en vez
// de reventar: la dirección en texto siempre se guarda igual, lat/lng es un
// dato adicional que puede faltar sin bloquear la creación del cliente.
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = (await res.json()) as {
      results?: { geometry?: { location?: { lat: number; lng: number } } }[];
    };
    const location = data.results?.[0]?.geometry?.location;
    return location ? { lat: location.lat, lng: location.lng } : null;
  } catch {
    return null;
  }
}
