"""
AxyFx Journal - MT5 Python Bridge
===================================
A local Python microservice that connects to your MT5 terminal
(using the official MetaTrader5 package by MetaQuotes) and exposes
a simple REST API for the JournalPro server to call.

Supports: Investor Password (read-only), Trade History, Account Info

Requirements:
  pip install MetaTrader5 flask flask-cors

Usage:
  python mt5_bridge.py

Then in your browser/server call:
  GET  http://localhost:5005/health
  POST http://localhost:5005/connect    { "login": 12345, "server": "Exness-MT5Trial", "password": "inv_pass" }
  GET  http://localhost:5005/history    (after connecting)
  GET  http://localhost:5005/account    (after connecting)
  POST http://localhost:5005/disconnect

NOTE: MT5 terminal must be installed and OPEN on this Windows machine.
"""

import sys
import json
import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

# ─────────────────────────────────────────────
# Try to import MetaTrader5
# ─────────────────────────────────────────────
try:
    import MetaTrader5 as mt5
    MT5_AVAILABLE = True
except ImportError:
    MT5_AVAILABLE = False
    print("[MT5 Bridge] WARNING: MetaTrader5 package not installed.")
    print("[MT5 Bridge] Run: pip install MetaTrader5 flask flask-cors")

app = Flask(__name__)
CORS(app)  # Allow requests from localhost:3000 (your Node.js server)

# In-memory session store (one connection at a time per bridge instance)
connected_login = None
connected_server = None

# ─────────────────────────────────────────────────────────────────────────────
# Helper: convert a MT5 deal namedtuple → plain dict
# ─────────────────────────────────────────────────────────────────────────────
def deal_to_dict(deal) -> dict:
    """Convert a MT5 deal (namedtuple) into a JSON-serializable dict."""
    d = deal._asdict() if hasattr(deal, '_asdict') else {}
    # Convert numpy/int64 types → native Python
    result = {}
    for k, v in d.items():
        if hasattr(v, 'item'):          # numpy scalar
            result[k] = v.item()
        elif isinstance(v, datetime.datetime):
            result[k] = v.isoformat()
        else:
            result[k] = v
    # Convert time (epoch seconds) → ISO string
    if 'time' in result and isinstance(result['time'], (int, float)):
        result['time_iso'] = datetime.datetime.utcfromtimestamp(result['time']).isoformat() + 'Z'
    return result


def map_deal_to_trade(deal_dict: dict, account_id: str) -> dict | None:
    """
    Map a raw MT5 deal dict → JournalPro Trade format.
    MT5 deal types:
      0 = DEAL_TYPE_BUY
      1 = DEAL_TYPE_SELL
      2 = DEAL_TYPE_BALANCE (deposit/withdrawal — skip)
    """
    DEAL_TYPE_BUY  = 0
    DEAL_TYPE_SELL = 1

    deal_type = deal_dict.get('type')
    if deal_type == DEAL_TYPE_BUY:
        trade_type = 'Buy'
    elif deal_type == DEAL_TYPE_SELL:
        trade_type = 'Sell'
    else:
        return None  # skip balance/commission/etc deals

    symbol = deal_dict.get('symbol', '')
    if not symbol:
        return None

    deal_id = deal_dict.get('ticket') or deal_dict.get('order') or deal_dict.get('position_id') or 0
    time_iso = deal_dict.get('time_iso', datetime.datetime.utcnow().isoformat() + 'Z')

    return {
        'id':             f"mt5py_{deal_id}_{account_id}",
        'accountId':      account_id,
        'date':           time_iso,
        'symbol':         symbol.upper(),
        'type':           trade_type,
        'lotSize':        float(deal_dict.get('volume', 0)),
        'entryPrice':     float(deal_dict.get('price', 0)),
        'exitPrice':      float(deal_dict.get('price', 0)),
        'profit':         float(deal_dict.get('profit', 0)),
        'commission':     float(deal_dict.get('commission', 0)),
        'swap':           float(deal_dict.get('swap', 0)),
        'riskPercentage': 1.0,
        'strategy':       'MT5 Python Bridge',
        'emotion':        'Calm',
        'notes':          deal_dict.get('comment', '') or 'Imported via MT5 Python Bridge',
        'tags':           ['MT5 Sync', 'Python Bridge'],
        'isMt5Sync':      True,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    """Health check — JournalPro server uses this to confirm bridge is running."""
    return jsonify({
        'status': 'ok',
        'mt5_available': MT5_AVAILABLE,
        'connected': connected_login is not None,
        'connected_login': connected_login,
        'connected_server': connected_server,
    })


@app.route('/connect', methods=['POST'])
def connect():
    """
    Connect to MT5 with given credentials.
    Body: { "login": 12345678, "server": "Exness-MT5Trial", "password": "investor_pass" }
    """
    global connected_login, connected_server

    if not MT5_AVAILABLE:
        return jsonify({'error': 'MetaTrader5 Python package is not installed. Run: pip install MetaTrader5'}), 500

    data = request.get_json() or {}
    login    = data.get('login')
    server   = data.get('server')
    password = data.get('password')

    if not login or not server or not password:
        return jsonify({'error': 'login, server, and password are required'}), 400

    # Shutdown any previous connection
    mt5.shutdown()

    # Initialize and login
    ok = mt5.initialize(
        login=int(login),
        server=str(server),
        password=str(password),
    )

    if not ok:
        err = mt5.last_error()
        return jsonify({
            'error': f'MT5 initialization failed: {err}',
            'hint': 'Make sure MT5 terminal is open and the credentials are correct.'
        }), 500

    connected_login  = login
    connected_server = server

    # Get account info to confirm
    info = mt5.account_info()
    if info is None:
        return jsonify({
            'error': 'Connected to MT5 but could not fetch account info',
            'connected': True
        }), 206

    info_dict = info._asdict() if hasattr(info, '_asdict') else {}
    # Normalize numpy types
    account_data = {k: (v.item() if hasattr(v, 'item') else v) for k, v in info_dict.items()}

    print(f"[MT5 Bridge] Connected: login={login}, server={server}, balance={account_data.get('balance')}")

    return jsonify({
        'success': True,
        'message': f"Connected to MT5 account {login} on {server}",
        'account': {
            'login':    account_data.get('login'),
            'name':     account_data.get('name', ''),
            'server':   account_data.get('server', server),
            'balance':  float(account_data.get('balance', 0)),
            'equity':   float(account_data.get('equity', 0)),
            'currency': account_data.get('currency', 'USD'),
            'leverage': account_data.get('leverage', 0),
            'trade_mode': account_data.get('trade_mode', 0),  # 0=real, 1=demo, 2=contest
        }
    })


@app.route('/account', methods=['GET'])
def get_account():
    """Return current account info (must be connected first)."""
    if not MT5_AVAILABLE:
        return jsonify({'error': 'MetaTrader5 package not installed'}), 500
    if not connected_login:
        return jsonify({'error': 'Not connected. Call POST /connect first'}), 400

    info = mt5.account_info()
    if info is None:
        return jsonify({'error': 'Could not fetch account info from MT5'}), 500

    info_dict = info._asdict() if hasattr(info, '_asdict') else {}
    account_data = {k: (v.item() if hasattr(v, 'item') else v) for k, v in info_dict.items()}

    return jsonify({
        'login':     account_data.get('login'),
        'name':      account_data.get('name', ''),
        'server':    account_data.get('server', connected_server),
        'balance':   float(account_data.get('balance', 0)),
        'equity':    float(account_data.get('equity', 0)),
        'currency':  account_data.get('currency', 'USD'),
        'leverage':  account_data.get('leverage', 0),
        'trade_mode': account_data.get('trade_mode', 0),
    })


@app.route('/history', methods=['GET'])
def get_history():
    """
    Fetch deal history for a date range.
    Query params:
      from_date  — ISO date string, default = 1 year ago
      to_date    — ISO date string, default = now
      account_id — Journal account ID to tag trades with
    """
    if not MT5_AVAILABLE:
        return jsonify({'error': 'MetaTrader5 package not installed'}), 500
    if not connected_login:
        return jsonify({'error': 'Not connected. Call POST /connect first'}), 400

    # Parse date range
    from_str   = request.args.get('from_date')
    to_str     = request.args.get('to_date')
    account_id = request.args.get('account_id', 'mt5_bridge_account')

    if from_str:
        try:
            from_date = datetime.datetime.fromisoformat(from_str.replace('Z', ''))
        except Exception:
            from_date = datetime.datetime.utcnow() - datetime.timedelta(days=365)
    else:
        from_date = datetime.datetime.utcnow() - datetime.timedelta(days=365)

    if to_str:
        try:
            to_date = datetime.datetime.fromisoformat(to_str.replace('Z', ''))
        except Exception:
            to_date = datetime.datetime.utcnow()
    else:
        to_date = datetime.datetime.utcnow()

    print(f"[MT5 Bridge] Fetching history from {from_date} to {to_date}")

    deals = mt5.history_deals_get(from_date, to_date)

    if deals is None:
        err = mt5.last_error()
        # Error code 1 = no history (not a real error, just empty)
        if err[0] == 1:
            return jsonify({'deals': [], 'trades': [], 'raw_count': 0})
        return jsonify({'error': f'Failed to fetch history: {err}'}), 500

    raw_deals = [deal_to_dict(d) for d in deals]
    mapped_trades = [t for d in raw_deals if (t := map_deal_to_trade(d, account_id)) is not None]

    print(f"[MT5 Bridge] Found {len(raw_deals)} raw deals → {len(mapped_trades)} trade deals")

    return jsonify({
        'raw_count':    len(raw_deals),
        'trade_count':  len(mapped_trades),
        'trades':       mapped_trades,
        'from_date':    from_date.isoformat(),
        'to_date':      to_date.isoformat(),
    })


@app.route('/disconnect', methods=['POST'])
def disconnect():
    """Disconnect from MT5."""
    global connected_login, connected_server

    if MT5_AVAILABLE:
        mt5.shutdown()

    connected_login  = None
    connected_server = None

    return jsonify({'success': True, 'message': 'Disconnected from MT5'})


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("=" * 60)
    print("  AxyFx Journal - MT5 Python Bridge")
    print("  Listening on http://localhost:5005")
    print("  MT5 package available:", MT5_AVAILABLE)
    if not MT5_AVAILABLE:
        print()
        print("  !! SETUP REQUIRED !!")
        print("  Run: pip install MetaTrader5 flask flask-cors")
        print("  Then restart this script.")
    print("=" * 60)
    app.run(host='127.0.0.1', port=5005, debug=False)
