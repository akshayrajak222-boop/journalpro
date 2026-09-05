import { 
  ISeriesPrimitive, 
  IPrimitivePaneView, 
  IPrimitivePaneRenderer, 
  Time, 
  Coordinate, 
  Logical,
  SeriesAttachedParameter
} from 'lightweight-charts';

interface TradeLineOptions {
  entryTime: Time;
  entryPrice: number;
  exitTime: Time;
  exitPrice: number;
  isWin: boolean;
  isOpen?: boolean;
  profit?: number;
  lotSize?: number;
  type?: 'Buy' | 'Sell';
}

class TradeLineRenderer implements IPrimitivePaneRenderer {
  private _options: TradeLineOptions;
  private _p1: { x: number; y: number } | null = null;
  private _p2: { x: number; y: number } | null = null;

  constructor(options: TradeLineOptions) {
    this._options = options;
  }

  update(p1: { x: number; y: number } | null, p2: { x: number; y: number } | null) {
    this._p1 = p1;
    this._p2 = p2;
  }

  draw(target: any) {
    target.useBitmapCoordinateSpace((scope: any) => {
      if (!this._p1 || !this._p2) return;
      const ctx = scope.context as CanvasRenderingContext2D;
      
      const x1 = Math.round(this._p1.x * scope.horizontalPixelRatio);
      const y1 = Math.round(this._p1.y * scope.verticalPixelRatio);
      const x2 = Math.round(this._p2.x * scope.horizontalPixelRatio);
      const y2 = Math.round(this._p2.y * scope.verticalPixelRatio);

      const isBuy = this._options.type === 'Buy';
      const color = isBuy ? '#3b82f6' : '#ef4444';

      ctx.save();
      
      // 1. Draw line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5 * scope.horizontalPixelRatio;
      ctx.setLineDash([]);
      ctx.stroke();

      // 2. Draw entry circle (marker)
      const entryRadius = 4 * scope.horizontalPixelRatio;
      ctx.beginPath();
      ctx.arc(x1, y1, entryRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      // Inner dot
      ctx.beginPath();
      ctx.arc(x1, y1, entryRadius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // 3. Draw exit arrowhead
      if (!this._options.isOpen || x1 !== x2 || y1 !== y2) {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headlen = 7 * scope.horizontalPixelRatio;
        
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
        ctx.lineTo(x2, y2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      // 4. Draw profit label
      if (this._options.profit !== undefined && !this._options.isOpen) {
        const profitText = `${this._options.profit >= 0 ? '+' : '-'}$${Math.abs(this._options.profit).toFixed(2)}`;
        
        const labelX = x2 + 10 * scope.horizontalPixelRatio;
        const labelY = y2 - 10 * scope.verticalPixelRatio;

        ctx.font = `${10 * scope.horizontalPixelRatio}px Inter, sans-serif`;
        const textMetrics = ctx.measureText(profitText);
        const paddingX = 6 * scope.horizontalPixelRatio;
        const paddingY = 4 * scope.horizontalPixelRatio;
        const w = textMetrics.width + paddingX * 2;
        const h = 16 * scope.horizontalPixelRatio;
        
        ctx.fillStyle = 'rgba(20, 20, 20, 0.8)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(labelX, labelY - h/2, w, h, 4 * scope.horizontalPixelRatio);
        } else {
          ctx.rect(labelX, labelY - h/2, w, h); // Fallback
        }
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1 * scope.horizontalPixelRatio;
        ctx.stroke();

        ctx.fillStyle = this._options.profit >= 0 ? '#10b981' : '#ef4444';
        ctx.textBaseline = 'middle';
        ctx.fillText(profitText, labelX + paddingX, labelY);
      }

      // 5. Draw lot size badge
      if (this._options.lotSize !== undefined) {
        const lotText = this._options.lotSize.toString();
        const lotX = x1;
        const lotY = y1 + 18 * scope.verticalPixelRatio;
        
        ctx.font = `${10 * scope.horizontalPixelRatio}px Inter, sans-serif`;
        const metrics = ctx.measureText(lotText);
        const padX = 6 * scope.horizontalPixelRatio;
        const padY = 4 * scope.horizontalPixelRatio;
        const boxW = metrics.width + padX * 2;
        const boxH = 14 * scope.horizontalPixelRatio;
        
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(lotX - boxW/2, lotY - boxH/2, boxW, boxH, 4 * scope.horizontalPixelRatio);
        } else {
          ctx.rect(lotX - boxW/2, lotY - boxH/2, boxW, boxH);
        }
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 * scope.horizontalPixelRatio;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lotText, lotX, lotY);
      }
      
      ctx.restore();
    });
  }
}

class TradeLinePaneView implements IPrimitivePaneView {
  private _source: TradeLinePrimitive;
  private _renderer: TradeLineRenderer;

  constructor(source: TradeLinePrimitive) {
    this._source = source;
    this._renderer = new TradeLineRenderer(source.options);
  }

  zOrder(): 'bottom' | 'normal' | 'top' {
    return 'top';
  }

  update() {
    const series = this._source.series;
    const timeScale = this._source.chart.timeScale();

    if (!series || !timeScale) return;

    // Convert time to logical, then logical to coordinate
    const entryLogical = timeScale.timeToCoordinate(this._source.options.entryTime);
    const exitLogical = timeScale.timeToCoordinate(this._source.options.exitTime);

    if (entryLogical === null || exitLogical === null) {
      this._renderer.update(null, null);
      return;
    }

    const y1 = series.priceToCoordinate(this._source.options.entryPrice);
    const y2 = series.priceToCoordinate(this._source.options.exitPrice);

    if (y1 === null || y2 === null) {
      this._renderer.update(null, null);
      return;
    }

    this._renderer.update(
      { x: entryLogical as number, y: y1 },
      { x: exitLogical as number, y: y2 }
    );
  }

  renderer() {
    return this._renderer;
  }
}

export class TradeLinePrimitive implements ISeriesPrimitive {
  public options: TradeLineOptions;
  public chart: any;
  public series: any;
  private _paneViews: TradeLinePaneView[];

  constructor(options: TradeLineOptions) {
    this.options = options;
    this._paneViews = [new TradeLinePaneView(this)];
  }

  attached(param: SeriesAttachedParameter<Time>) {
    this.chart = param.chart;
    this.series = param.series;
    this.chart.subscribeCrosshairMove(this._onCrosshairMove);
    this._paneViews.forEach(v => v.update());
  }

  detached() {
    if (this.chart) {
      this.chart.unsubscribeCrosshairMove(this._onCrosshairMove);
    }
    this.chart = undefined;
    this.series = undefined;
  }

  paneViews() {
    return this._paneViews;
  }

  updateAllViews() {
    this._paneViews.forEach(v => v.update());
    this.chart?.applyOptions({}); // force redraw
  }

  private _onCrosshairMove = () => {
    // We could listen to crosshair to highlight, but for now we just need it to redraw if needed.
    // However, basic lines don't need redraw on crosshair unless interacting.
  };
}
