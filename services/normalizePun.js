function normalizePun(raw, dateYYYYMMDD) {
  // Il JSON GME può essere array o oggetto con una proprietà dati.
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.data)
      ? raw.data
      : Array.isArray(raw.Data)
        ? raw.Data
        : Array.isArray(raw.results)
          ? raw.results
          : [];

  const normalized = rows.map((r) => ({
    flowDate: r.FlowDate ?? r.flowDate ?? r.Date ?? r.date ?? dateYYYYMMDD,
    hour: Number(r.Hour ?? r.hour ?? r.Period ?? r.period ?? 0),
    period: r.Period ?? r.period ?? null,
    market: r.Market ?? r.market ?? 'MGP',
    zone: r.Zone ?? r.zone ?? r.MarketZone ?? r.marketZone ?? null,
    price: Number(r.Price ?? r.price ?? r.PUN ?? r.pun ?? 0)
  })).filter(r => !Number.isNaN(r.price));

  // Se GME restituisce zone multiple, proviamo a privilegiare il record PUN/NAT/Italia se presente.
  const punLike = normalized.filter(r => {
    const z = String(r.zone || '').toUpperCase();
    return ['PUN', 'NAT', 'ITALIA', 'NATIONAL', ''].includes(z);
  });
  const useful = punLike.length ? punLike : normalized;

  const prices = useful.map(r => r.price).filter(v => typeof v === 'number' && !Number.isNaN(v));
  const average = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

  return {
    source: 'GME - Mercato del Giorno Prima',
    dataName: 'ME_ConventionalPrices',
    segment: 'MGP',
    date: String(dateYYYYMMDD),
    updatedAt: new Date().toISOString(),
    average: average === null ? null : Number(average.toFixed(6)),
    count: useful.length,
    hours: useful.sort((a, b) => a.hour - b.hour)
  };
}

module.exports = { normalizePun };
