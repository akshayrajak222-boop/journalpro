import os
import time
import requests
import MetaTrader5 as mt5
from datetime import datetime, timezone
import json

API_URL = os.environ.get('FXJOURNALPRO_API_URL', 'http://localhost:5000/api/mt5/worker')
BRIDGE_ID = os.environ.get('BRIDGE_ID', 'worker-1')
BRIDGE_TOKEN = os.environ.get('BRIDGE_AUTH_TOKEN', 'dev-bridge-secret-token')

# Explicit path to MT5 terminal - auto-detected on Windows
MT5_PATH = os.environ.get('MT5_PATH', r'C:\Program Files\MetaTrader 5\terminal64.exe')

headers = {
    'Authorization': f'Bearer {BRIDGE_TOKEN}',
    'X-Worker-Id': BRIDGE_ID,
    'Content-Type': 'application/json'
}

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def send_heartbeat():
    try:
        requests.post(f"{API_URL}/heartbeat", headers=headers, json={"status": "AVAILABLE"}, timeout=5)
    except:
        pass

def fetch_jobs():
    try:
        r = requests.get(f"{API_URL}/jobs", headers=headers, timeout=10)
        if r.status_code == 200:
            return r.json().get('jobs', [])
    except Exception as e:
        log(f"Error fetching jobs: {e}")
    return []

def update_job(job_id, status, error_message=None):
    try:
        requests.post(f"{API_URL}/job/{job_id}/status", headers=headers, json={
            "status": status,
            "error_message": error_message
        }, timeout=10)
        log(f"  -> Job {job_id} status: {status}" + (f" ({error_message})" if error_message else ""))
    except Exception as e:
        log(f"Error updating job status: {e}")

def kill_mt5_processes():
    """Kill all running MT5 terminal processes to avoid authorization conflicts."""
    import subprocess
    try:
        result = subprocess.run(
            ['taskkill', '/F', '/IM', 'terminal64.exe'],
            capture_output=True, text=True
        )
        if 'SUCCESS' in result.stdout:
            log("Killed stale MT5 terminal process(es)")
            import time as _time
            _time.sleep(2)  # Wait for process to fully exit
        else:
            log("No existing MT5 terminal processes found")
    except Exception as e:
        log(f"Could not kill MT5 processes: {e}")

def init_mt5():
    """Kill stale MT5 terminals, then initialize fresh."""
    # Always kill existing MT5 instances first to avoid -6 auth conflicts
    kill_mt5_processes()
    
    if not os.path.exists(MT5_PATH):
        log(f"MT5 not found at: {MT5_PATH}")
        return False

    log(f"Launching fresh MT5 terminal at: {MT5_PATH}")
    if mt5.initialize(MT5_PATH):
        return True

    error = mt5.last_error()
    log(f"MT5 initialize failed: {error}")
    return False

def process_job(job):
    job_id = job['id']
    conn = job['connection']
    account_number = conn['mt5AccountNumber']
    server = conn['mt5Server']
    
    log(f"===== Processing job {job_id} =====")
    log(f"Account: {account_number} | Server: {server}")
    update_job(job_id, 'CONNECTING')
    
    # Initialize MT5
    if not init_mt5():
        error = f"MT5 initialize() failed: {mt5.last_error()}"
        log(error)
        update_job(job_id, 'FAILED', error)
        return

    log(f"MT5 initialized. Terminal version: {mt5.version()}")

    # Login with investor password (read-only)
    account_int = int(account_number)
    password = conn['investorPassword']
    
    log(f"Logging in to account {account_int} on {server}...")
    if not mt5.login(account_int, password=password, server=server):
        error = f"MT5 login failed: {mt5.last_error()}"
        log(error)
        update_job(job_id, 'FAILED', error)
        mt5.shutdown()
        return

    account_info = mt5.account_info()
    log(f"Logged in! Balance: {account_info.balance} {account_info.currency}, Server: {account_info.server}")

    update_job(job_id, 'FETCHING_HISTORY')

    # Fetch ALL history from 2000 to now
    from_date = datetime(2000, 1, 1, tzinfo=timezone.utc)
    to_date = datetime.now(timezone.utc)
    history_deals = mt5.history_deals_get(from_date, to_date)

    if history_deals is None:
        error = f"Failed to get history deals: {mt5.last_error()}"
        log(error)
        update_job(job_id, 'FAILED', error)
        mt5.shutdown()
        return

    log(f"Fetched {len(history_deals)} raw deals from broker")

    # ---- Reconstruct closed positions from deals ----
    # MT5 stores trades as individual "deals" (e.g. open=IN, close=OUT)
    # We group by position_id to reconstruct full trades
    positions = {}

    for deal in history_deals:
        pid = deal.position_id

        # Skip balance deposits / withdrawals (no symbol)
        if not deal.symbol:
            continue

        if pid not in positions:
            positions[pid] = {
                'externalTradeId': str(pid),
                'symbol':          deal.symbol,
                'type':            'BUY' if deal.type == 0 else 'SELL',
                'lotSize':         0.0,
                'entryPrice':      0.0,
                'exitPrice':       0.0,
                'entryTime':       None,
                'exitTime':        None,
                'netProfit':       0.0,
                'commission':      0.0,
                'swap':            0.0,
                'isOpen':          True,
                'exitVolume':      0.0,
            }

        pos = positions[pid]

        if deal.entry == 0:   # IN (position opened)
            t = pos['lotSize'] + deal.volume
            pos['entryPrice'] = ((pos['entryPrice'] * pos['lotSize']) + (deal.price * deal.volume)) / t if t > 0 else deal.price
            pos['lotSize']     = t
            pos['entryTime']   = datetime.fromtimestamp(deal.time, tz=timezone.utc).isoformat()
            pos['commission'] += deal.commission
            pos['swap']       += deal.swap

        elif deal.entry == 1: # OUT (position closed)
            t = pos['exitVolume'] + deal.volume
            pos['exitPrice']  = ((pos['exitPrice'] * pos['exitVolume']) + (deal.price * deal.volume)) / t if t > 0 else deal.price
            pos['exitVolume'] = t
            pos['exitTime']   = datetime.fromtimestamp(deal.time, tz=timezone.utc).isoformat()
            pos['netProfit'] += deal.profit
            pos['commission']+= deal.commission
            pos['swap']      += deal.swap

            # Mark as closed when exit volume >= entry volume (allowing 1% tolerance)
            if pos['exitVolume'] >= pos['lotSize'] * 0.99:
                pos['isOpen'] = False

    # Only send fully closed trades
    closed_trades = [
        t for t in positions.values()
        if not t['isOpen'] and t['symbol'] and t['lotSize'] > 0 and t['exitTime']
    ]

    # Final profit = deal profit + commission + swap
    for t in closed_trades:
        t['netProfit'] = round(t['netProfit'] + t['commission'] + t['swap'], 2)
        t['entryPrice'] = round(t['entryPrice'], 5)
        t['exitPrice']  = round(t['exitPrice'], 5)
        t['lotSize']    = round(t['lotSize'], 2)
        # Remove internal tracking fields
        del t['exitVolume']
        del t['isOpen']

    log(f"Reconstructed {len(closed_trades)} closed trades from {len(positions)} positions")

    # Shutdown MT5 - credentials cleared from memory
    mt5.shutdown()
    log("MT5 disconnected and credentials cleared")

    update_job(job_id, 'IMPORTING')

    # Push trades to FXJournalPro backend
    try:
        r = requests.post(
            f"{API_URL}/job/{job_id}/trades",
            headers=headers,
            json={"trades": closed_trades},
            timeout=60
        )
        if r.status_code == 200:
            result = r.json()
            imported = result.get('imported', len(closed_trades))
            skipped  = result.get('skipped', 0)
            update_job(job_id, 'COMPLETED')
            log(f"SUCCESS! Imported {imported} trades, {skipped} duplicates skipped.")
        else:
            err = r.json().get('error', f'HTTP {r.status_code}')
            update_job(job_id, 'FAILED', f"Backend import failed: {err}")
    except Exception as e:
        update_job(job_id, 'FAILED', f"Network error during import: {e}")

def main():
    log("MT5 Bridge Worker started.")
    log(f"Polling: {API_URL}/jobs every 5s")
    log(f"MT5 Path: {MT5_PATH}")

    last_heartbeat = 0
    while True:
        now = time.time()

        # Send heartbeat every 30 seconds
        if now - last_heartbeat > 30:
            send_heartbeat()
            last_heartbeat = now

        jobs = fetch_jobs()
        if jobs:
            log(f"Found {len(jobs)} pending job(s)")
            process_job(jobs[0])
        
        time.sleep(5)

if __name__ == '__main__':
    main()
