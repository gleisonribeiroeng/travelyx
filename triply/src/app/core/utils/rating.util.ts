export function renderStars(rating: number | null): string[] {
  const stars: string[] = [];
  const ratingValue = rating ?? 0;

  for (let i = 1; i <= 5; i++) {
    if (ratingValue >= i) {
      stars.push('star');
    } else if (ratingValue >= i - 0.5) {
      stars.push('star_half');
    } else {
      stars.push('star_border');
    }
  }

  return stars;
}

export function formatRating(rating: number | null): string {
  return rating != null ? rating.toFixed(1) + ' / 5' : 'Sem avaliação';
}
