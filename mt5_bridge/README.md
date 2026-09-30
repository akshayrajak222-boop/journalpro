# FXJournalPro MT5 Bridge Worker

This is a local Windows worker that securely communicates with your locally installed MT5 Terminal to fetch trade history and synchronize it with FXJournalPro.

## Requirements
- Windows OS (MetaTrader5 python package is Windows only)
- Python 3.8+ installed (tested with Python 3.14)
- MetaTrader 5 Terminal installed on the machine

## Installation
1. Open PowerShell or Command Prompt in this folder.
2. Run `pip install -r requirements.txt`

## Running the worker
```bash
python worker.py
```

The worker will run in the background, poll for sync jobs from FXJournalPro, and automatically open MT5 to perform read-only trade extraction, before sending the trades back to your journal.

## Security
- This script only accepts Investor Passwords. It NEVER transmits or asks for the Master Password.
- Temporary MT5 credentials are only kept in memory during a synchronization job.
