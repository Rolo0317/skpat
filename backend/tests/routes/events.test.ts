import { describe, it } from 'vitest'

describe('events routes', () => {
  it.todo('GET /events returns empty array when no events exist')
  it.todo('GET /events returns only is_active=1 events')
  it.todo('POST /events without bearer token returns 401')
  it.todo('POST /events with non-admin token returns 403')
  it.todo('POST /events with admin token and multipart form creates event returning 201')
  it.todo('PUT /events/:id (admin) updates event, returns 200')
  it.todo('DELETE /events/:id (admin) soft-deletes event (is_active=0)')
})
