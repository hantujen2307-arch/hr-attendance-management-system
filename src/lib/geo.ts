/**
 * Geolocation & Haversine distance utilities.
 */

export interface GeoLocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

/**
 * Promisified browser geolocation with high-accuracy and fallback mechanism.
 */
export function getCurrentBrowserLocation(): Promise<GeoLocationResult> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return reject(new Error('Fitur Geolocation tidak didukung oleh browser Anda. Gunakan browser modern seperti Chrome, Safari, atau Edge.'));
    }

    // Phase 1: Try High Accuracy (GPS hardware)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        // If user explicitly denied permission, do not retry
        if (error.code === error.PERMISSION_DENIED) {
          return reject(
            new Error('Izin akses lokasi (GPS) ditolak oleh browser. Mohon klik ikon gembok/pengaturan situs di bilah alamat browser dan izinkan "Lokasi" untuk melakukan absensi.')
          );
        }

        // Phase 2: If high-accuracy timed out or unavailable (e.g. indoors/laptop), fallback to standard accuracy
        console.warn('GPS high accuracy failed, falling back to standard network positioning:', error.message);
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => {
            resolve({
              latitude: fallbackPos.coords.latitude,
              longitude: fallbackPos.coords.longitude,
              accuracy: fallbackPos.coords.accuracy,
              timestamp: fallbackPos.timestamp,
            });
          },
          (fallbackErr) => {
            let msg = 'Gagal mendeteksi koordinat lokasi perangkat.';
            if (fallbackErr.code === fallbackErr.PERMISSION_DENIED) {
              msg = 'Izin akses lokasi (GPS) ditolak. Mohon aktifkan izin lokasi di browser Anda.';
            } else if (fallbackErr.code === fallbackErr.POSITION_UNAVAILABLE) {
              msg = 'Layanan lokasi tidak tersedia. Pastikan GPS/Location Service pada sistem operasi atau perangkat Anda aktif.';
            } else if (fallbackErr.code === fallbackErr.TIMEOUT) {
              msg = 'Waktu permintaan lokasi GPS habis. Pastikan perangkat Anda memiliki sinyal GPS atau koneksi internet yang stabil dan coba lagi.';
            }
            reject(new Error(msg));
          },
          {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 60000,
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Calculates great-circle distance between two geographic coordinates using Haversine formula.
 * Returns distance in meters.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
