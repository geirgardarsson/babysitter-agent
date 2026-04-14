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
