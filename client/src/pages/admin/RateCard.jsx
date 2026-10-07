import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api';
import { SURFACE_TYPES, tierLabel } from '../../constants';

const NUM_FIELDS = [
  ['paintCoverage', 'Paint coverage (sq ft/L/coat)'], ['paintPrice', 'Paint ₹/L'], ['defaultCoats', 'Coats'],
  ['primerCoverage', 'Primer coverage (sq ft/L)'], ['primerPrice', 'Primer ₹/L'],
  ['puttyCoverage', 'Putty coverage (sq ft/kg)'], ['puttyPrice', 'Putty ₹/kg'], ['labourRate', 'Labour ₹/sq ft'],
];

export default function RateCard() {
  const [rates, setRates] = useState([]);
  const [settings, setSettings] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    api.get('/admin/rates').then((r) => { setRates(r.data.rates); setSettings(r.data.settings); })
      .catch((e) => setMsg({ type: 'error', text: errMsg(e) }));
  }, []);

  const edit = (id, k, v) => setRates(rates.map((r) => (r._id === id ? { ...r, [k]: v } : r)));

  const saveRate = async (r) => {
    setSavingId(r._id);
    try {
      const payload = { ...r };
      NUM_FIELDS.forEach(([k]) => { payload[k] = Number(r[k]) || 0; });
      await api.put(`/admin/rates/${r._id}`, payload);
      setMsg({ type: 'ok', text: `${r.productName} saved` });
    } catch (e) {
      setMsg({ type: 'error', text: errMsg(e) });
    } finally {
      setSavingId('');
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/admin/settings', settings);
      setSettings(data);
      setMsg({ type: 'ok', text: 'Tax and preparation rates saved' });
    } catch (err) {
      setMsg({ type: 'error', text: errMsg(err) });
    }
  };

  if (!settings) return msg.text ? <p className="alert alert--error">{msg.text}</p> : <div className="page-loading">Loading…</div>;

  return (
    <>
      <div className="page-head">
        <div><h1>Rate card</h1><p className="muted">Estimates use these prices. Changes apply to estimates generated after you save.</p></div>
      </div>
      {msg.text && <p className={`alert alert--${msg.type === 'ok' ? 'ok' : 'error'}`}>{msg.text}</p>}

      <form className="panel" onSubmit={saveSettings}>
        <h2>Tax and surface preparation</h2>
        <div className="grid grid--6">
          <label className="field"><span>GST %</span><input type="number" step="0.01" value={settings.gstRate} onChange={(e) => setSettings({ ...settings, gstRate: e.target.value })} /></label>
          <label className="field"><span>Crack repair ₹/sq ft</span><input type="number" step="0.01" value={settings.crackRepairRate} onChange={(e) => setSettings({ ...settings, crackRepairRate: e.target.value })} /></label>
          <label className="field"><span>Scraping ₹/sq ft</span><input type="number" step="0.01" value={settings.scrapingRate} onChange={(e) => setSettings({ ...settings, scrapingRate: e.target.value })} /></label>
          {['low', 'medium', 'high'].map((lvl) => (
            <label key={lvl} className="field"><span>Damp ({lvl}) ₹/sq ft</span>
              <input type="number" step="0.01" value={settings.dampTreatment[lvl]}
                onChange={(e) => setSettings({ ...settings, dampTreatment: { ...settings.dampTreatment, [lvl]: e.target.value } })} />
            </label>
          ))}
        </div>
        <button className="btn btn--primary">Save rates</button>
      </form>

      {SURFACE_TYPES.map((st) => (
        <section key={st.value} className="panel">
          <h2>{st.label}</h2>
          <div className="rate-rows">
            {rates.filter((r) => r.surfaceType === st.value).map((r) => (
              <div key={r._id} className="rate-row">
                <div className="rate-row__head">
                  <span className={`tier tier--${r.tier}`}>{tierLabel(r.tier)}</span>
                  <input className="rate-row__name" aria-label="Product name" value={r.productName} onChange={(e) => edit(r._id, 'productName', e.target.value)} />
                  <button className="btn btn--small btn--outline" disabled={savingId === r._id} onClick={() => saveRate(r)}>
                    {savingId === r._id ? 'Saving…' : 'Save'}
                  </button>
                </div>
                <div className="grid grid--8">
                  {NUM_FIELDS.map(([k, label]) => (
                    <label key={k} className="field field--tight"><span>{label}</span>
                      <input type="number" step="0.01" min="0" value={r[k]} onChange={(e) => edit(r._id, k, e.target.value)} />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
