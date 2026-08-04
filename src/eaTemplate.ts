// FX Journal Pro — MT5 Synchronization EA template.
// The server substitutes __FXJP_ACCOUNT_ID__ / __FXJP_TOKEN__ / __FXJP_API_URL__
// with per-account values and serves the result as a downloadable .mq5 file.
// This file is compiled into the server bundle (esbuild) so it works in both
// local dev and Vercel serverless deployments.

// String.raw keeps the backslash escapes (\" and \r\n etc.) as literal
// text in the generated .mq5 file, which is what MQL5 source requires.
export const EA_TEMPLATE = String.raw`//+------------------------------------------------------------------+
//|                                                   FX Journal Pro Sync  |
//|  Unique Expert Advisor generated for a portfolio account.             |
//|  Authenticates with FX Journal Pro and imports your complete MT5       |
//|  trade history, then keeps syncing new trades & account updates        |
//|  in real time.                                                         |
//|                                                                        |
//|  INSTALL:                                                              |
//|  1. MT5: Tools -> Options -> Expert Advisors -> check                 |
//|     "Allow WebRequest for listed URL" and add:                         |
//|       __FXJP_WEBREQUEST_HOST__                                         |
//|  2. Save this file into  MT5/Data folder -> MQL5/Experts/               |
//|  3. Drag it onto any chart. The configuration below is pre-filled       |
//|     for your account; do not change it.                                |
//+------------------------------------------------------------------+
#property copyright "FX Journal Pro"
#property link      "https://www.fxjournalpro.com"
#property version   "1.00"
#property description "FX Journal Pro automated MT5 synchronization"

//+------------------------------------------------------------------+
//| Per-account configuration (filled by FX Journal Pro)             |
//+------------------------------------------------------------------+
string FXJP_ACCOUNT_ID = "__FXJP_ACCOUNT_ID__";
string FXJP_TOKEN     = "__FXJP_TOKEN__";
string FXJP_API_URL   = "__FXJP_API_URL__";

//+------------------------------------------------------------------+
//| Tuning inputs                                                    |
//+------------------------------------------------------------------+
input int    InpSyncIntervalSec = 30;  // Sync interval (seconds)
input int    InpBatchSize       = 200; // Deals per request (1-500)
input bool   InpFullSyncOnStart = true; // Import full history on start

//+------------------------------------------------------------------+
//| Internal state                                                   |
//+------------------------------------------------------------------+
string g_gvName    = "";       // GlobalVariable holding last synced deal ticket
long   g_cursor    = 0;        // last successfully synced deal ticket
long   g_batchCursor = 0;      // max ticket collected in the current batch
bool   g_syncing   = false;    // re-entrancy guard
bool   g_authed    = false;
datetime g_lastSyncTime = 0;
int    g_dealsInBatch = 0;

//+------------------------------------------------------------------+
//| Small JSON string escaper                                        |
//+------------------------------------------------------------------+
string JsonEscape(string s)
{
   StringReplace(s, "\\", "\\\\");
   StringReplace(s, "\"", "\\\"");
   StringReplace(s, "\r", " ");
   StringReplace(s, "\n", " ");
   return s;
}

//+------------------------------------------------------------------+
//| Parse an integer field like "cursor":12345 from a JSON response  |
//+------------------------------------------------------------------+
long ParseIntField(string text, string field)
{
   string key = "\"" + field + "\":";
   int p = StringFind(text, key);
   if (p < 0) return 0;
   string tail = StringSubstr(text, p + StringLen(key));
   // cut at first non-digit, minus sign or comma
   string num = "";
   int len = StringLen(tail);
   for (int i = 0; i < len; i++)
   {
      ushort c = StringGetCharacter(tail, i);
      if ((c >= '0' && c <= '9') || c == '-') num += ShortToString(c);
      else break;
   }
   return StringToInteger(num);
}

//+------------------------------------------------------------------+
//| POST a JSON payload to the FX Journal Pro backend                |
//+------------------------------------------------------------------+
bool HttpPost(string path, string payload, string &outBody)
{
   string url = FXJP_API_URL + path;
   string headers = "Content-Type: application/json\r\n"
                  + "User-Agent: FXJournalPro-EA/1.0\r\n"
                  + "Accept: application/json\r\n";

   char postData[];
   StringToCharArray(payload, postData, 0, StringLen(payload), CP_UTF8);

   char respData[];
   string respHeaders;
   int code = WebRequest("POST", url, headers, 15000, postData, respData, respHeaders);

   if (code == 200)
   {
      outBody = CharArrayToString(respData, 0, WHOLE_ARRAY, CP_UTF8);
      return true;
   }

   if (code == -1)
   {
      int err = GetLastError();
      if (err == 4014)
         Print("FXJP: WebRequest is blocked. In MT5 go to Tools -> Options -> Expert Advisors and allow \"__FXJP_WEBREQUEST_HOST__\" in the WebRequest allow list.");
      else if (err == 4015)
         Print("FXJP: Invalid URL or the URL is not in the WebRequest allow list. Add \"__FXJP_WEBREQUEST_HOST__\".");
      else
         Print("FXJP: WebRequest failed, error ", err);
   }
   else
   {
      Print("FXJP: Server returned HTTP ", code, " for ", path);
   }
   return false;
}

//+------------------------------------------------------------------+
//| Build the current MT5 account-info JSON payload                  |
//+------------------------------------------------------------------+
string BuildAccountJson()
{
   string s = "{";
   s += "\"login\":"   + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + ",";
   s += "\"server\":\""  + JsonEscape(AccountInfoString(ACCOUNT_SERVER)) + "\",";
   s += "\"name\":\""    + JsonEscape(AccountInfoString(ACCOUNT_NAME)) + "\",";
   s += "\"balance\":"   + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2) + ",";
   s += "\"equity\":"    + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2) + ",";
   s += "\"margin\":"    + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN), 2) + ",";
   s += "\"marginFree\":"+ DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_FREE), 2) + ",";
   s += "\"currency\":\""+ JsonEscape(AccountInfoString(ACCOUNT_CURRENCY)) + "\",";
   s += "\"leverage\":"  + IntegerToString(AccountInfoInteger(ACCOUNT_LEVERAGE)) + ",";
   s += "\"tradeMode\":" + IntegerToString(AccountInfoInteger(ACCOUNT_TRADE_MODE)) + ",";
   s += "\"build\":"     + IntegerToString(TerminalInfoInteger(TERMINAL_BUILD));
   s += "}";
   return s;
}

//+------------------------------------------------------------------+
//| Build the JSON object for a single deal                          |
//+------------------------------------------------------------------+
string BuildDealJson(ulong ticket)
{
   string s = "{";
   s += "\"ticket\":"     + IntegerToString(ticket) + ",";
   s += "\"positionId\":" + IntegerToString((long)HistoryDealGetInteger(ticket, DEAL_POSITION_ID)) + ",";
   s += "\"time\":"       + IntegerToString((long)HistoryDealGetInteger(ticket, DEAL_TIME)) + ",";
   s += "\"type\":"       + IntegerToString((int)HistoryDealGetInteger(ticket, DEAL_TYPE)) + ",";
   s += "\"entry\":"      + IntegerToString((int)HistoryDealGetInteger(ticket, DEAL_ENTRY)) + ",";
   s += "\"magic\":"      + IntegerToString((long)HistoryDealGetInteger(ticket, DEAL_MAGIC)) + ",";
   s += "\"symbol\":\""   + JsonEscape(HistoryDealGetString(ticket, DEAL_SYMBOL)) + "\",";
   s += "\"volume\":"     + DoubleToString(HistoryDealGetDouble(ticket, DEAL_VOLUME), 2) + ",";
   s += "\"price\":"      + DoubleToString(HistoryDealGetDouble(ticket, DEAL_PRICE), 5) + ",";
   s += "\"profit\":"     + DoubleToString(HistoryDealGetDouble(ticket, DEAL_PROFIT), 2) + ",";
   s += "\"commission\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_COMMISSION), 2) + ",";
   s += "\"swap\":"       + DoubleToString(HistoryDealGetDouble(ticket, DEAL_SWAP), 2) + ",";
   s += "\"comment\":\""  + JsonEscape(HistoryDealGetString(ticket, DEAL_COMMENT)) + "\"";
   s += "}";
   return s;
}

//+------------------------------------------------------------------+
//| Collect up to InpBatchSize deals with ticket > g_cursor          |
//| Returns the JSON array; sets g_dealsInBatch / g_batchCursor      |
//+------------------------------------------------------------------+
string CollectDealBatch()
{
   g_dealsInBatch = 0;
   g_batchCursor = g_cursor;

   HistorySelect(0, TimeCurrent());
   int total = HistoryDealsTotal();
   if (total <= 0) return "[]";

   string json = "[";
   for (int i = 0; i < total && g_dealsInBatch < InpBatchSize; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if ((long)ticket <= g_cursor) continue;

      if (g_dealsInBatch > 0) json += ",";
      json += BuildDealJson(ticket);
      if ((long)ticket > g_batchCursor) g_batchCursor = (long)ticket;
      g_dealsInBatch++;
   }
   json += "]";
   return json;
}

//+------------------------------------------------------------------+
//| Authenticate with the backend (also returns lastDealId cursor)   |
//+------------------------------------------------------------------+
bool Authenticate()
{
   string payload = "{"
      + "\"accountId\":\"" + FXJP_ACCOUNT_ID + "\","
      + "\"token\":\""     + FXJP_TOKEN + "\","
      + "\"terminal\":"    + BuildAccountJson()
      + "}";
   string outBody;
   if (!HttpPost("/ea/authenticate", payload, outBody)) return false;

   long lastDeal = ParseIntField(outBody, "lastDealId");
   if (lastDeal > g_cursor)
   {
      g_cursor = lastDeal;
      GlobalVariableSet(g_gvName, (double)g_cursor);
   }
   g_authed = true;
   g_lastSyncTime = TimeCurrent();
   return true;
}

//+------------------------------------------------------------------+
//| Push all pending deals to the backend (batched)                  |
//+------------------------------------------------------------------+
bool SyncNow()
{
   if (g_syncing) return false;
   g_syncing = true;

   int guard = 0;
   bool anyOk = false;
   while (guard < 1000)
   {
      guard++;
      string dealsJson = CollectDealBatch();
      if (g_dealsInBatch <= 0) break;

      string payload = "{"
         + "\"accountId\":\"" + FXJP_ACCOUNT_ID + "\","
         + "\"token\":\""     + FXJP_TOKEN + "\","
         + "\"account\":"     + BuildAccountJson() + ","
         + "\"deals\":"       + dealsJson + ","
         + "\"cursor\":"      + IntegerToString(g_batchCursor)
         + "}";

      string outBody;
      if (!HttpPost("/ea/sync", payload, outBody))
      {
         if (!anyOk) { g_syncing = false; return false; }
         break;
      }

      anyOk = true;

      // Trust the server cursor: it stores every deal and returns the max stored
      long serverCursor = ParseIntField(outBody, "cursor");
      if (serverCursor > g_cursor) g_cursor = serverCursor;
      GlobalVariableSet(g_gvName, (double)g_cursor);
      g_lastSyncTime = TimeCurrent();

      // If the batch only contained already-synced deals, stop.
      if (g_dealsInBatch == 0) break;
   }

   g_syncing = false;
   return anyOk;
}

//+------------------------------------------------------------------+
//| Expert Advisor lifecycle                                         |
//+------------------------------------------------------------------+
int OnInit()
{
   g_gvName = "FXJP_" + FXJP_ACCOUNT_ID;
   g_cursor = (long)GlobalVariableGet(g_gvName);

   EventSetTimer(InpSyncIntervalSec);

   // Initial handshake: authenticate + full-history import
   Authenticate();
   if (InpFullSyncOnStart)
      SyncNow();
   else
      g_lastSyncTime = TimeCurrent();

   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

void OnTick()
{
   // Real-time sync is handled by OnTradeTransaction; timer is the fallback.
}

void OnTimer()
{
   if (TimeCurrent() - g_lastSyncTime >= InpSyncIntervalSec)
      SyncNow();
}

void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
{
   // Fire on every new deal so closed trades + balance changes sync instantly
   if (trans.type == TRADE_TRANSACTION_DEAL_ADD)
      SyncNow();
}
`;
