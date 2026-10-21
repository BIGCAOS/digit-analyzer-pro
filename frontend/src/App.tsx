import React, { useEffect, useMemo, useState } from 'react';

const DIGITS = Array.from({ length: 10 }, (_, index) => index);

type Market = {
  symbol: string;
  displayName: string;
  pip: number;
  decimals: number;
};

type Summary = {
  symbol: string;
  status: string;
  windowSize: number;
  lastDigit: number;
  currentProbability: number;
  predictedDigit: number;
  secondCandidate: number;
  margin: number;
  sampleSize: number;
  model: string;
  probabilities: Record<number, number>;
  connection: string;
};

const emptySummary: Summary = {
  symbol: 'R_100',
  status: 'demo',
  windowSize: 100,
  lastDigit: 0,
  currentProbability: 0.1,
  predictedDigit: 0,
  secondCandidate: 1,
  margin: 0.01,
  sampleSize: 0,
  model: 'laplace',
  probabilities: Object.fromEntries(DIGITS.map((digit) => [digit, 0.1])),
  connection: 'demo'
};

export default function App() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('R_100');
  const [windowSize, setWindowSize] = useState(100);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [health, setHealth] = useState<{ ok: boolean; status: string; demo: boolean } | null>(null);

  useEffect(() => {
    const loadMarkets = async () => {
      try {
        const response = await fetch('/api/markets');
        const result = await response.json();
        const marketList = result.markets ?? [];
        setMarkets(marketList);
        if (marketList.length > 0) {
          setSelectedSymbol((current) => current || marketList[0].symbol);
        }
      } catch {
        setMarkets([
          { symbol: 'R_100', displayName: 'Volatility 100 Index', pip: 0.01, decimals: 2 },
          { symbol: 'R_50', displayName: 'Volatility 50 Index', pip: 0.01, decimals: 2 }
        ]);
      }
    };

    void loadMarkets();
  }, []);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch(`/api/summary?symbol=${selectedSymbol}&windowSize=${windowSize}`);
        const result = await response.json();
        if (result && result.probabilities) {
          setSummary(result);
        }
      } catch {
        setSummary({ ...emptySummary, symbol: selectedSymbol, windowSize });
      }
    };

    void loadSummary();
  }, [selectedSymbol, windowSize]);

  useEffect(() => {
    const loadHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const result = await response.json();
        setHealth(result);
      } catch {
        setHealth({ ok: false, status: 'disconnected', demo: true });
      }
    };

    void loadHealth();
    const id = window.setInterval(loadHealth, 15000);
    return () => window.clearInterval(id);
  }, []);

  const rankedDigits = useMemo(
    () => DIGITS.map((digit) => ({ digit, probability: summary.probabilities[digit] ?? 0 })).sort((a, b) => b.probability - a.probability),
    [summary.probabilities]
  );

  const exportCsv = async () => {
    const response = await fetch('/api/export');
    const csv = await response.text();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'digit-analysis.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard">
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#8ec5ff' }}>Digit Analyzer Pro</div>
          <h1 style={{ margin: '8px 0 0', fontSize: 34 }}>Probability dashboard</h1>
        </div>
        <div className="card" style={{ padding: '12px 18px', minWidth: 220 }}>
          <div style={{ fontSize: 12, color: '#9cc0ea', textTransform: 'uppercase' }}>Connection</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {health?.demo ? 'DEMO MODE' : health?.status ?? 'offline'}
          </div>
        </div>
      </header>

      <div className="grid metrics" style={{ marginBottom: 20 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ color: '#9cc0ea', fontSize: 12 }}>Market</div>
          <select value={selectedSymbol} onChange={(event) => setSelectedSymbol(event.target.value)} style={{ width: '100%', marginTop: 8, background: '#111827', color: '#fff', border: '1px solid #334155', borderRadius: 8, padding: 10 }}>
            {markets.map((market) => (
              <option key={market.symbol} value={market.symbol}>{market.displayName}</option>
            ))}
          </select>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ color: '#9cc0ea', fontSize: 12 }}>Window</div>
          <select value={windowSize} onChange={(event) => setWindowSize(Number(event.target.value))} style={{ width: '100%', marginTop: 8, background: '#111827', color: '#fff', border: '1px solid #334155', borderRadius: 8, padding: 10 }}>
            {[50, 100, 200, 300, 400, 500].map((size) => (
              <option key={size} value={size}>{size} ticks</option>
            ))}
          </select>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ color: '#9cc0ea', fontSize: 12 }}>Predicted digit</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>{summary.predictedDigit}</div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ color: '#9cc0ea', fontSize: 12 }}>Top probability</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>{(summary.currentProbability * 100).toFixed(1)}%</div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ color: '#9cc0ea', fontSize: 12 }}>Sample size</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>{summary.sampleSize}</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 0.8fr', marginBottom: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px' }}>Ranking of digits</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {rankedDigits.map(({ digit, probability }) => (
              <div key={digit}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong>Digit {digit}</strong>
                  <span>{(probability * 100).toFixed(2)}%</span>
                </div>
                <div className="bar">
                  <span className="fill" style={{ width: `${Math.max(6, probability * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px' }}>Validation</h3>
          <table className="table">
            <tbody>
              <tr><td>Model</td><td>{summary.model}</td></tr>
              <tr><td>Second candidate</td><td>{summary.secondCandidate}</td></tr>
              <tr><td>Margin</td><td>{summary.margin.toFixed(3)}</td></tr>
              <tr><td>State</td><td>{summary.status}</td></tr>
              <tr><td>Last digit</td><td>{summary.lastDigit}</td></tr>
            </tbody>
          </table>
          <div style={{ marginTop: 18 }}>
            <button onClick={exportCsv} style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 18px', fontWeight: 700 }}>Export CSV</button>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>Bubble map</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 12, alignItems: 'end', minHeight: 200 }}>
            {rankedDigits.map(({ digit, probability }) => (
              <div key={digit} style={{ textAlign: 'center' }}>
                <div style={{ margin: '0 auto', width: `${Math.max(22, probability * 120)}px`, height: `${Math.max(22, probability * 120)}px`, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #f8fafc 0%, #38bdf8 30%, #1d4ed8 100%)', boxShadow: '0 10px 20px rgba(56,189,248,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontWeight: 700 }}>{digit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>Transition matrix</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Prev\Next</th>
                {DIGITS.map((digit) => <th key={digit}>{digit}</th>)}
              </tr>
            </thead>
            <tbody>
              {DIGITS.map((prev) => (
                <tr key={prev}>
                  <th>{prev}</th>
                  {DIGITS.map((next) => (
                    <td key={`${prev}-${next}`}>{(summary.probabilities[next] ?? 0).toFixed(3)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
