// Deteksi source berdasarkan ID tidak lagi digunakan
// Source sekarang ditentukan oleh base URL saat fetch data
// dan disimpan di localStorage untuk referensi saat navigasi

export function detectSource(id) {
  // Selalu return "unknown" karena deteksi dari ID tidak reliable
  // Source seharusnya ditentukan saat fetch data dari API
  return "unknown";
}
