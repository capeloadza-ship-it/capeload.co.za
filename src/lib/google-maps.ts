// Google Maps API helpers — server-side Distance Matrix

interface DistanceResult {
  distanceKm: number;
  durationMinutes: number;
  originAddress: string;
  destinationAddress: string;
}

export async function getDistance(
  origin: string,
  destination: string
): Promise<DistanceResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY not configured');

  const params = new URLSearchParams({
    origins: origin,
    destinations: destination,
    key: apiKey,
    units: 'metric',
    region: 'za',
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
  );

  if (!res.ok) throw new Error(`Google Maps API error: ${res.status}`);

  const data = await res.json();

  if (data.status !== 'OK' || !data.rows?.[0]?.elements?.[0]) {
    throw new Error('Could not calculate distance');
  }

  const element = data.rows[0].elements[0];
  if (element.status !== 'OK') {
    throw new Error(`Route not found: ${element.status}`);
  }

  return {
    distanceKm: Math.round(element.distance.value / 1000),
    durationMinutes: Math.round(element.duration.value / 60),
    originAddress: data.origin_addresses[0],
    destinationAddress: data.destination_addresses[0],
  };
}
