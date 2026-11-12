export function webpSrc(src: string): string {
  return src.replace(/\.(png|jpe?g)$/i, '.webp');
}
