export async function sendChatMessage(message) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error('Server error');
  return res.json();
}

export async function fetchSessions() {
  const res = await fetch('/api/sessions');
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function fetchCurrentSession() {
  const res = await fetch('/api/sessions/current');
  if (!res.ok) throw new Error('Failed to fetch session');
  return res.json();
}

export async function createNewSession() {
  const res = await fetch('/api/sessions/new', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function activateSession(id) {
  const res = await fetch(`/api/sessions/${id}/activate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to activate session');
  return res.json();
}

export async function sendParentMessage(message, uploadedImages = []) {
  const res = await fetch('/api/foreldrar/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, uploadedImages }),
  });
  if (!res.ok) throw new Error('Server error');
  return res.json();
}

export async function uploadParentImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch('/api/foreldrar/upload', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function fetchParentSession() {
  const res = await fetch('/api/foreldrar/sessions/current');
  if (!res.ok) throw new Error('Failed to fetch parent session');
  return res.json();
}

export async function createNewParentSession() {
  const res = await fetch('/api/foreldrar/sessions/new', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to create parent session');
  return res.json();
}
