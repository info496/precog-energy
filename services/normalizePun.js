function normalizePun(raw, dateYYYYMMDD) {

  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.data)
      ? raw.data
      : Array.isArray(raw.Data)
        ? raw.Data
        : Array.isArray(raw.results)
          ? raw.results
          : [];

  const normalized = rows
    .map((r) => ({
      flowDate: r.FlowDate ?? r.flowDate ?? r.Date ?? r.date ?? dateYYYYMMDD,
      hour: Number(r.Hour ?? r.hour ?? r.Period ?? r.period ?? 0),
      period: r.Period ?? r.period ?? null,
      market: r.Market ?? r.market ?? 'MGP',
      zone: r.Zone ?? r.zone ?? r.MarketZone ?? r.marketZone ?? null,
      price: Number(r.Price ?? r.price ?? r.PUN ?? r.pun ?? 0)
    }))
    .filter(r => !Number.isNaN(r.price));

  // PRIORITA' ASSOLUTA: PUN Index GME
  const punRows = normalized.filter(r => {
    const z = String(r.zone || '').toUpperCase();
    return z === 'PUN';
  });

  // Fallback solo se PUN non esiste
  const natRows = normalized.filter(r => {
    const z = String(r.zone || '').toUpperCase();
    return z === 'NAT';
  });

  const useful =
    punRows.length > 0
      ? punRows
      : natRows.length > 0
        ? natRows
        : normalized;

  const prices = useful
    .map(r => r.price)
    .filter(v => typeof v === 'number' && !Number.isNaN(v));

  const average =
    prices.length > 0
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : null;

function periodToTime(period) {
  const p = Number(period);

  if (!p || Number.isNaN(p)) {
    return null;
  }

  const minutes = ((p - 1) % 96) * 15;
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');

  return `${hh}:${mm}`;
}

const sortedByPrice = useful
  .filter(r => typeof r.price === 'number' && !Number.isNaN(r.price))
  .sort((a, b) => a.price - b.price);

const minRow = sortedByPrice[0] || null;
const maxRow = sortedByPrice[sortedByPrice.length - 1] || null;

  return {
    source: 'GME - Mercato del Giorno Prima',
    dataName: 'ME_ZonalPrices',
    segment: 'MGP',
    date: String(dateYYYYMMDD),
    updatedAt: new Date().toISOString(),
    
average: average === null ? null : Number(average.toFixed(6)),

minPrice: minRow ? Number(minRow.price.toFixed(6)) : null,
minTime: minRow ? periodToTime(minRow.period || minRow.hour) : null,

maxPrice: maxRow ? Number(maxRow.price.toFixed(6)) : null,
maxTime: maxRow ? periodToTime(maxRow.period || maxRow.hour) : null,

count: useful.length,
hours: useful.sort((a, b) => a.hour - b.hour)
  };
}

module.exports = { normalizePun };