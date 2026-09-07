import { useEffect, useMemo, useState } from 'react';
import { BARS, PLATE_SETS, Unit, fmt, loadBar, warmup } from './plates';

const PLATE_COLOR: Record<number, string> = {
  25: '#dc2626', 20: '#2563eb', 15: '#eab308', 10: '#16a34a', 5: '#e5e7eb',
  2.5: '#ef4444', 1.25: '#64748b', 0.5: '#94a3b8',
  45: '#dc2626', 35: '#eab308', 22: '#2563eb',
};

function read() {
  try {
    const p = new URLSearchParams(window.location.search);
    return {
      unit: (p.get('u') === 'lb' ? 'lb' : 'kg') as Unit,
      bar: p.get('b') || '',
      target: p.get('t') || '100',
      counts: p.get('c') || '',
    };
  } catch {
    return { unit: 'kg' as Unit, bar: '', target: '100', counts: '' };
  }
}

export default function App() {
  const init = read();
  const [unit, setUnit] = useState<Unit>(init.unit);
  const [barW, setBarW] = useState(init.bar || String(BARS[init.unit][0].weight));
  const [target, setTarget] = useState(init.target);
  const [customise, setCustomise] = useState(!!init.counts);
  const [counts, setCounts] = useState<Record<number, string>>(() => {
    const base: Record<number, string> = {};
    PLATE_SETS[init.unit].forEach((w) => (base[w] = ''));
    if (init.counts) {
      init.counts.split(',').forEach((tok) => {
        const [w, n] = tok.split(':').map(Number);
        if (Number.isFinite(w) && Number.isFinite(n)) base[w] = String(n);
      });
    }
    return base;
  });
  const [copied, setCopied] = useState(false);

  const plates = PLATE_SETS[unit];
  const bars = BARS[unit];

  const available = useMemo(() => {
    if (!customise) return null;
    const map: Record<number, number> = {};
    let any = false;
    plates.forEach((w) => {
      const n = Number(counts[w]);
      if (Number.isFinite(n) && n > 0) {
        map[w] = n;
        any = true;
      } else {
        map[w] = 0;
      }
    });
    return any ? map : null;
  }, [customise, counts, plates]);

  const result = useMemo(
    () => loadBar(Number(target), Number(barW), plates, available),
    [target, barW, plates, available],
  );

  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const q = u.searchParams;
      q.set('u', unit);
      q.set('b', barW);
      q.set('t', target);
      if (customise) {
        q.set('c', plates.map((w) => `${w}:${Number(counts[w]) || 0}`).filter((s) => !s.endsWith(':0')).join(','));
      } else q.delete('c');
      window.history.replaceState(null, '', u.toString());
    } catch {
      /* ignore */
    }
  }, [unit, barW, target, customise, counts, plates]);

  const switchUnit = (nu: Unit) => {
    setUnit(nu);
    setBarW(String(BARS[nu][0].weight));
    const base: Record<number, string> = {};
    PLATE_SETS[nu].forEach((w) => (base[w] = ''));
    setCounts(base);
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const wu = result ? warmup(Number(target), Number(barW)) : [];

  return (
    <div className="app">
      <header>
        <h1>Barbell Plate Calculator</h1>
        <p className="tag">
          Enter the weight you want on the bar and it tells you which plates to put on each side —
          the fewest, heaviest first. Set which plates you actually own if your gym is short.
        </p>
      </header>

      <div className="row1">
        <div className="seg">
          <button className={unit === 'kg' ? 'on' : ''} onClick={() => switchUnit('kg')}>kg</button>
          <button className={unit === 'lb' ? 'on' : ''} onClick={() => switchUnit('lb')}>lb</button>
        </div>
        <label className="f">
          <span>Target on the bar</span>
          <div className="ibox">
            <input type="text" inputMode="decimal" value={target}
              onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ''))} autoFocus />
            <i>{unit}</i>
          </div>
        </label>
        <label className="f">
          <span>Bar</span>
          <select value={barW} onChange={(e) => setBarW(e.target.value)}>
            {bars.map((b) => <option key={b.label} value={b.weight}>{b.label} ({b.weight} {unit})</option>)}
          </select>
        </label>
      </div>

      <label className="chk">
        <input type="checkbox" checked={customise} onChange={(e) => setCustomise(e.target.checked)} />
        I only have certain plates
      </label>
      {customise && (
        <div className="plateset">
          {plates.map((w) => (
            <label key={w} className="pcount">
              <span style={{ background: PLATE_COLOR[w] || '#888' }}>{fmt(w)}</span>
              <input type="text" inputMode="numeric" placeholder="∞" value={counts[w]}
                onChange={(e) => setCounts((c) => ({ ...c, [w]: e.target.value.replace(/[^0-9]/g, '') }))} />
              <em>per side</em>
            </label>
          ))}
        </div>
      )}

      {result ? (
        <div className="result">
          {Number(target) < Number(barW) ? (
            <p className="warn">That's less than the bar ({fmt(Number(barW))} {unit}).</p>
          ) : (
            <>
              <div className="bar-viz">
                <div className="sleeve" />
                {result.perSide.flatMap((p) =>
                  Array.from({ length: p.count }, (_, i) => (
                    <div
                      key={`${p.weight}-${i}`}
                      className="plate"
                      style={{
                        background: PLATE_COLOR[p.weight] || '#888',
                        height: `${Math.max(28, Math.min(100, p.weight * (unit === 'kg' ? 3.6 : 2)))}%`,
                        width: `${p.weight >= (unit === 'kg' ? 5 : 10) ? 20 : 12}px`,
                      }}
                      title={`${fmt(p.weight)} ${unit}`}
                    >
                      <span>{fmt(p.weight)}</span>
                    </div>
                  )),
                )}
                <div className="collar" />
              </div>
              <p className="perside">
                Per side: {result.perSide.length ? result.perSide.map((p) => `${p.count} × ${fmt(p.weight)}`).join('  ·  ') : 'nothing — just the bar'}
              </p>
              <div className="totals">
                <span>Loaded: <b>{fmt(result.loadedTotal)} {unit}</b></span>
                <span>{fmt(result.perSideWeight)} {unit}/side</span>
                {result.shortfall > 0 && <span className="short">{fmt(result.shortfall)} {unit} short of {fmt(Number(target))}</span>}
              </div>
              {wu.length > 1 && (
                <p className="warmup">Warm-up ladder: {wu.map((w) => `${fmt(w)}`).join(' → ')} {unit}</p>
              )}
            </>
          )}
          <button className="share" onClick={share}>{copied ? 'Link copied' : 'Copy shareable link'}</button>
        </div>
      ) : (
        <p className="hint">Enter a target weight.</p>
      )}

      <section className="explainer">
        <h2>How to read it</h2>
        <p>
          The plates listed are for <strong>one side</strong> — put the same on the other. The bar is
          symmetrical, so the total is the bar weight plus twice the per-side weight. The calculator
          works greedily from the heaviest plate down, which gives you the fewest plates to handle
          and the most stable load.
        </p>
        <h3>Standard plate weights</h3>
        <p>
          In kilograms: 25, 20, 15, 10, 5, 2.5, 1.25 and sometimes 0.5. In pounds: 45, 35, 25, 10, 5,
          2.5. A standard men's Olympic bar is 20&nbsp;kg (45&nbsp;lb) and a women's bar is
          15&nbsp;kg (35&nbsp;lb). Colour-coded plates follow the IWF scheme: red 25, blue 20, yellow
          15, green 10, white 5.
        </p>
        <h3>If you can't hit the number exactly</h3>
        <p>
          With a limited plate set you may land a little under the target — the "short" figure tells
          you by how much. Adding micro-plates (0.5 or 1.25&nbsp;kg, sometimes called fractional or
          change plates) is how people make small jumps between sessions.
        </p>
        <h3>Is anything sent to a server?</h3>
        <p>No. It's arithmetic in your browser, with the setup stored only in the page link.</p>
        <footer>Barbell Plate Calculator · no sign-up · works offline once loaded</footer>
      </section>
    </div>
  );
}
