// Ubin peta OpenStreetMap standar: jalan kecil dan gang lengkap, tanpa kunci API.
// Ubinnya terang; tiap peta menggelapkannya sendiri (filter CSS/RN atau cat raster MapLibre).
// Kebijakan ubin OSM: wajib atribusi dan User-Agent yang menyebut nama app.

export const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_MAX_ZOOM = 19;
export const OSM_ATTRIBUTION = '© OpenStreetMap';
export const TILE_HEADERS = { 'User-Agent': 'Jejak/1.0 (+https://jejak.masamune.my.id)' };

export function osmTile(z: number, x: number, y: number) {
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}
