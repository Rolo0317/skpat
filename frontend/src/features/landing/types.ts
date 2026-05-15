export interface SkpatEvent {
  id: string
  title: string
  date: string           // ISO 8601
  description: string | null
  price: number          // COP cents
  image_url: string | null
  available_spots: number
  is_vip: 0 | 1
  is_active: 0 | 1
  created_at: string
}
