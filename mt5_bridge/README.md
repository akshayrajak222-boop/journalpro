# MT5 Python Bridge — AxyFx Journal

A **free, local** MetaTrader 5 integration using the official `MetaTrader5` Python package by MetaQuotes. This replaces MetaApi cloud (which now requires paid credits).

## How it works

```
MT5 Terminal (running) ←── named pipe ──→ mt5_bridge.py (Flask) ←── HTTP ──→ JournalPro server.ts
```

Your investor password **never leaves your PC**. No cloud service involved.

## Requirements

- Windows PC
- Python 3.8+ (https://python.org)
- MT5 terminal installed and running
- Your MT5 investor password

## Quick Start

**Option 1 — Double-click** `start_bridge.bat` (installs deps + starts server)

**Option 2 — Manual:**
```bash
pip install MetaTrader5 flask flask-cors
python mt5_bridge.py
```

The bridge listens on `http://localhost:5005`.

## API Endpoints

| Method | Endpoint       | Description                          |
|--------|----------------|--------------------------------------|
| GET    | `/health`      | Check if bridge is running           |
| POST   | `/connect`     | Connect to MT5 with credentials      |
| GET    | `/account`     | Get account balance/equity           |
| GET    | `/history`     | Fetch trade history (with date range)|
| POST   | `/disconnect`  | Disconnect from MT5                  |

### Connect example
```bash
curl -X POST http://localhost:5005/connect \
  -H "Content-Type: application/json" \
  -d '{"login": 433831058, "server": "Exness-MT5Trial", "password": "your_investor_pass"}'
```

### History example
```bash
curl "http://localhost:5005/history?from_date=2025-01-01T00:00:00&to_date=2026-07-15T00:00:00&account_id=my_account"
```

## Using from JournalPro UI

1. Start the bridge (above)
2. Open your JournalPro app at http://localhost:3000
3. Go to **MT5 Connections** for any account
4. Click **Method B: Investor Password Sync**
5. The UI shows a green banner when bridge is detected
6. Enter your MT5 login, broker server, and investor password
7. Click **Connect** — trades import automatically!

## Notes

- MT5 terminal must be **open** on the same Windows machine
- The bridge session is maintained until you restart it or call `/disconnect`
- When you sync again later, the bridge re-uses the existing session
- The `start_bridge.bat` file handles first-time pip install automatically
