import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api';
import { CATEGORIES, TIER_LABEL } from '../../constants';

const RANGES = ['economy', 'premium', 'luxury'];

export default function RateCard() {
  const [rates, setRates] = useState({}); // { 'interior:economy': { rate, productName } }
  const [settings, setSettings] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState('');

  useEffect(() => {
    api.get('/admin/rates').then((r) => {
      setRates(Object.fromEntries(r.data.rates.map((x) => [`${x.category}:${x.tier}`, { rate: x.rate, productName: x.productName || '' }])));
      setSettings(r.data.settings);
    }).catch((e) => setMsg({ type: 'error', text: errMsg(e) }));
  }, []);

  const cell = (cat, tier) => rates[`${cat}:${tier}`] || { rate: '', productName: '' };
  const setCell = (cat, tier, patch) => setRates((r) => ({ ...r, [`${cat}:${tier}`]: { ...cell(cat, tier), ...patch } }));

  const saveCategory = async (c) => {
    setSaving(c.key); setMsg({ type: '', text: '' });
    try {
      const tiers = c.tiered ? RANGES : ['flat'];
      await api.put(`/admin/rates/${c.key}`, { rates: tiers.map((t) => ({ tier: t, ...cell(c.key, t) })) });
      setMsg({ type: 'ok', text: `${c.label} rates saved` });
    } catch (e) {
      setMsg({ type: 'error', text: errMsg(e) });
    } finally { setSaving(''); }
  };

  const setPkg = (i, patch) => setSettings((s) => ({ ...s, packages: s.packages.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving('settings'); setMsg({ type: '', text: '' });
    try {
      const { data } = await api.put('/admin/settings', { gstRate: settings.gstRate, packages: settings.packages });
      setSettings(data);
      setMsg({ type: 'ok', text: 'Options and GST saved' });
    } catch (err) {
      setMsg({ type: 'error', text: errMsg(err) });
    } finally { setSaving(''); }
  };

  if (!settings) return msg.text ? <p className="alert alert--error">{msg.text}</p> : <div className="page-loading">Loading…</div>;

  return (
    <>
      <div className="page-head">
        <div><h1>Rate card</h1><p className="muted">All-inclusive rates in ₹ per sq ft (material and labour, before GST). Changes apply to estimates generated after you save.</p></div>
      </div>
      {msg.text && <p className={`alert alert--${msg.type === 'ok' ? 'ok' : 'error'}`}>{msg.text}</p>}

      <form className="panel" onSubmit={saveSettings}>
        <h2>The three options shown to the customer</h2>
        <p className="muted">Shown in this order. Each option picks a range for interior work (interior painting, texture, polish &amp; enamel) and for exterior work (exterior painting, waterproofing, heat reduction). Putty and dampness use one standard rate.</p>
        <div className="pkg-table">
          <div className="pkg-row pkg-row--head"><span>#</span><span>Name</span><span>Interior range</span><span>Exterior range</span></div>
          {settings.packages.map((p, i) => (
            <div key={i} className="pkg-row">
              <span className="pkg-n">{i + 1}</span>
              <input value={p.label} aria-label={`Option ${i + 1} name`} onChange={(e) => setPkg(i, { label: e.target.value })} />
              <select value={p.interior} aria-label={`Option ${i + 1} interior range`} onChange={(e) => setPkg(i, { interior: e.target.value })}>
                {RANGES.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
              </select>
              <select value={p.exterior} aria-label={`Option ${i + 1} exterior range`} onChange={(e) => setPkg(i, { exterior: e.target.value })}>
                {RANGES.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="inline-form">
          <label className="field"><span>GST %</span>
            <input type="number" step="0.01" min="0" value={settings.gstRate} onChange={(e) => setSettings({ ...settings, gstRate: e.target.value })} />
          </label>
          <button className="btn btn--primary" disabled={saving === 'settings'}>{saving === 'settings' ? 'Saving…' : 'Save options and GST'}</button>
        </div>
      </form>

      <div className="rate-cards">
        {CATEGORIES.map((c) => (
          <section key={c.key} className="panel rate-card">
            <div className="panel__head">
              <h2>{c.label}</h2>
              <button className="btn btn--small btn--outline" disabled={saving === c.key} onClick={() => saveCategory(c)}>
                {saving === c.key ? 'Saving…' : 'Save'}
              </button>
            </div>
            <div className={`rate-grid ${c.tiered ? '' : 'rate-grid--flat'}`}>
              {(c.tiered ? RANGES : ['flat']).map((t) => (
                <div key={t} className="rate-tier">
                  <span className={`tier tier--${t}`}>{TIER_LABEL[t]}</span>
                  <label className="field field--tight"><span>Product</span>
                    <input value={cell(c.key, t).productName} onChange={(e) => setCell(c.key, t, { productName: e.target.value })} />
                  </label>
                  <label className="field field--tight"><span>₹ per sq ft</span>
                    <input type="number" step="0.01" min="0" value={cell(c.key, t).rate} onChange={(e) => setCell(c.key, t, { rate: e.target.value })} />
                  </label>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
