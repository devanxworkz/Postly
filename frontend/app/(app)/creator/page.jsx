// app/(app)/creator/page.jsx

'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreatorEditPage() {
  const router = useRouter();
  const [page, setPage] = useState({
    username: '',
    brand_name: '',
    bio: '',
    photo_url: '',
    theme: 'light',
    color: '#1F62FF',
    links: [],
    cards: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing page data
  useEffect(() => {
    fetch('/api/creator', { cache: 'no-store' })
      .then((r) => (r.status === 401 ? (router.push('/login'), null) : r.json()))
      .then((d) => {
        if (d?.page) setPage((p) => ({ ...p, ...d.page }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updateField = (key, value) => setPage((p) => ({ ...p, [key]: value }));

  const addLink = () => setPage((p) => ({ ...p, links: [...p.links, { title: '', url: '' }] }));
  const updateLink = (i, field, val) =>
    setPage((p) => {
      const newLinks = p.links.map((l, idx) => (idx === i ? { ...l, [field]: val } : l));
      return { ...p, links: newLinks };
    });
  const removeLink = (i) => setPage((p) => ({ ...p, links: p.links.filter((_, idx) => idx !== i) }));

  const addCard = () => setPage((p) => ({ ...p, cards: [...p.cards, { name: '', image_url: '', description: '', destination_url: '' }] }));
  const updateCard = (i, field, val) =>
    setPage((p) => {
      const newCards = p.cards.map((c, idx) => (idx === i ? { ...c, [field]: val } : c));
      return { ...p, cards: newCards };
    });
  const removeCard = (i) => setPage((p) => ({ ...p, cards: p.cards.filter((_, idx) => idx !== i) }));

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/creator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(page) });
    setSaving(false);
    if (res.ok) {
      alert('Saved!');
    } else {
      const err = await res.json();
      alert('Error: ' + (err.error || 'unknown'));
    }
  };

  // Live preview component
  const Preview = () => (
    <div className="creator-preview" style={{ background: page.theme === 'dark' ? '#111' : '#fff', color: page.theme === 'dark' ? '#eee' : '#111', border: '1px solid #ddd', padding: '1rem', marginTop: '1rem' }}>
      {page.photo_url && <img src={page.photo_url} alt="logo" style={{ width: 80, height: 80, borderRadius: '50%' }} />}
      <h2>{page.brand_name || 'Your Brand'}</h2>
      <p>{page.bio}</p>
      <ul>
        {page.links.map((l, i) => (
          <li key={i}>
            <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: page.color }}>{l.title || l.url}</a>
          </li>
        ))}
      </ul>
      <div className="cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
        {page.cards.map((c, i) => (
          <a key={i} href={c.destination_url} target="_blank" rel="noopener noreferrer" style={{ border: '1px solid #ccc', borderRadius: 4, padding: '0.5rem', textDecoration: 'none', color: 'inherit' }}>
            {c.image_url && <img src={c.image_url} alt={c.name} style={{ width: '100%', height: 80, objectFit: 'cover' }} />}
            <strong>{c.name}</strong>
            <p>{c.description}</p>
          </a>
        ))}
      </div>
    </div>
  );

  if (loading) return <p>Loading…</p>;

  return (
    <div className="page-head">
      <h1>Creator Page Settings</h1>
      <div className="form">
        <div className="field"><label>Username (public URL)</label><input value={page.username} onChange={(e) => updateField('username', e.target.value)} placeholder="mybrand" /></div>
        <div className="field"><label>Brand name</label><input value={page.brand_name} onChange={(e) => updateField('brand_name', e.target.value)} /></div>
        <div className="field"><label>Bio</label><textarea value={page.bio} onChange={(e) => updateField('bio', e.target.value)} rows={3} /></div>
        <div className="field"><label>Photo / Logo URL</label><input value={page.photo_url} onChange={(e) => updateField('photo_url', e.target.value)} /></div>
        <div className="field"><label>Theme</label><select value={page.theme} onChange={(e) => updateField('theme', e.target.value)}><option value="light">Light</option><option value="dark">Dark</option></select></div>
        <div className="field"><label>Accent Color</label><input type="color" value={page.color} onChange={(e) => updateField('color', e.target.value)} /></div>
        <hr />
        <h3>Links</h3>
        {page.links.map((l, i) => (
          <div key={i} className="link-item" style={{ marginBottom: '0.5rem' }}>
            <input placeholder="Title" value={l.title} onChange={(e) => updateLink(i, 'title', e.target.value)} style={{ marginRight: '0.5rem' }} />
            <input placeholder="URL" value={l.url} onChange={(e) => updateLink(i, 'url', e.target.value)} style={{ marginRight: '0.5rem' }} />
            <button onClick={() => removeLink(i)}>✕</button>
          </div>
        ))}
        <button onClick={addLink}>Add Link</button>
        <hr />
        <h3>Product / Service Cards</h3>
        {page.cards.map((c, i) => (
          <div key={i} className="card-item" style={{ marginBottom: '0.5rem' }}>
            <input placeholder="Name" value={c.name} onChange={(e) => updateCard(i, 'name', e.target.value)} style={{ marginRight: '0.3rem' }} />
            <input placeholder="Image URL" value={c.image_url} onChange={(e) => updateCard(i, 'image_url', e.target.value)} style={{ marginRight: '0.3rem' }} />
            <input placeholder="Destination URL" value={c.destination_url} onChange={(e) => updateCard(i, 'destination_url', e.target.value)} style={{ marginRight: '0.3rem' }} />
            <textarea placeholder="Description" value={c.description} onChange={(e) => updateCard(i, 'description', e.target.value)} rows={2} style={{ width: '100%', marginTop: '0.2rem' }} />
            <button onClick={() => removeCard(i)}>✕</button>
          </div>
        ))}
        <button onClick={addCard}>Add Card</button>
        <hr />
        <button className="btn btn-accent" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
      <Preview />
    </div>
  );
}
