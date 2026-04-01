/**
 * Destination photos for hero banners and cards.
 * Uses Unsplash source URLs (free, no API key needed).
 */
export const DESTINATION_PHOTOS: Record<string, string> = {
  'Rio de Janeiro': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80',
  'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
  'Lisboa': 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800&q=80',
  'Orlando': 'https://images.unsplash.com/photo-1575089976121-8ed7b2a54265?w=800&q=80',
  'Buenos Aires': 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=800&q=80',
  'Gramado': 'images/gramado.jpg',
  'Santiago': 'https://images.unsplash.com/photo-1510519138101-570d1dca3d66?w=800&q=80',
  'Jericoacoara': 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&q=80',
  'Montevidéu': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'Bonito': 'https://images.unsplash.com/photo-1585123334904-845d60e97b29?w=800&q=80',
  'Florianópolis': 'https://images.unsplash.com/photo-1588001832198-c15cff59b078?w=800&q=80',
  'Salvador': 'https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?w=800&q=80',
  'Foz do Iguaçu': 'https://images.unsplash.com/photo-1542704792-e30dac463c90?w=800&q=80',
  'São Paulo': 'https://images.unsplash.com/photo-1554168848-228452c09d60?w=800&q=80',
  'Natal': 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80',
};

/** Case-insensitive partial-match lookup for destination photos */
export function getDestinationPhoto(destination: string): string | null {
  if (!destination) return null;
  const lower = destination.toLowerCase();
  for (const [key, url] of Object.entries(DESTINATION_PHOTOS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return url;
    }
  }
  return null;
}
