const TICKER_TEXT = "Don't Take a Big Break From Trading";

const TICKER_STYLES = [
  { className: 'font-display font-bold uppercase tracking-tight text-slate-100' },
  { className: 'ticker-font-elegant italic font-medium text-slate-200' },
  { className: 'ticker-font-future font-semibold uppercase tracking-[0.28em] bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent' },
];

function TickerUnit() {
  return (
    <div className="flex shrink-0 items-center">
      {TICKER_STYLES.map((s, i) => (
        <div key={i} className="flex shrink-0 items-center">
          <span className={`whitespace-nowrap text-xl sm:text-2xl lg:text-[1.75rem] leading-tight ${s.className}`}>
            {TICKER_TEXT}
          </span>
          <span className="mx-8 sm:mx-12 lg:mx-16 text-lg sm:text-xl text-blue-400/70 select-none" aria-hidden="true">
            ✦
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TradingTicker() {
  return (
    <div className="relative w-full overflow-hidden py-5 border-y border-white/[0.06] bg-white/[0.03] ticker-mask" aria-hidden="true">
      <div className="ticker-track flex w-max">
        <TickerUnit />
        <TickerUnit />
      </div>
    </div>
  );
}
