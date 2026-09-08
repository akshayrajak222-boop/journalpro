const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// I will just use string replacement on the exact multiline strings!
function r(search, rep) {
    if (!code.includes(search)) {
        // Try with \r\n instead of \n
        search = search.replace(/\n/g, '\r\n');
        if (!code.includes(search)) {
            console.error("NOT FOUND:\n" + search.substring(0, 50));
            return;
        }
    }
    code = code.replace(search, rep.replace(/\n/g, '\r\n')); // ensure CRLF if needed
    console.log("Replaced block");
}

r(
`        )}

        {/* 2. TRADING JOURNAL VIEW */}
        {activeTab === 'journal' && (`,
`          </>} />

        {/* 2. TRADING JOURNAL VIEW */}
        <Route path="/journal" element={<>`
);

r(
`        )}

        {/* 3. CALENDAR VIEW */}
        {activeTab === 'calendar' && (`,
`          </>} />

        {/* 3. CALENDAR VIEW */}
        <Route path="/calendar" element={<>`
);

r(
`        )}

        {/* 3b. FX NEWS & ECONOMIC CALENDAR VIEW */}
        {activeTab === 'fxnews' && (`,
`          </>} />

        {/* 3b. FX NEWS & ECONOMIC CALENDAR VIEW */}
        <Route path="/fxnews" element={<>`
);

r(
`        )}

        {/* 4. PORTFOLIO ACCOUNTS VIEW */}
        {activeTab === 'accounts' && (`,
`          </>} />

        {/* 4. PORTFOLIO ACCOUNTS VIEW */}
        <Route path="/accounts" element={<>`
);

r(
`        )}

        {/* 5. PERFORMANCE ANALYTICS VIEW */}
        {activeTab === 'analytics' && (`,
`          </>} />

        {/* 5. PERFORMANCE ANALYTICS VIEW */}
        <Route path="/analytics" element={<>`
);

r(
`        )}

        {/* 6. CONSOLIDATED SETTINGS VIEW */}
        {activeTab === 'settings' && (`,
`          </>} />

        {/* 6. CONSOLIDATED SETTINGS VIEW */}
        <Route path="/settings" element={<>`
);

r(
`        )}

        {/* 5. MT5 AUTOMATION VIEW */}
        {activeTab === 'mt5' && user && (`,
`          </>} />

        {/* 5. MT5 AUTOMATION VIEW */}
        <Route path="/mt5" element={user ? <>`
);

r(
`        )}

        {/* 6. AI CO-PILOT INSIGHTS VIEW */}
        {activeTab === 'insights' && activeAccount && user && (`,
`          </> : <Navigate to="/" replace />} />

        {/* 6. AI CO-PILOT INSIGHTS VIEW */}
        <Route path="/insights" element={(activeAccount && user) ? <>`
);

r(
`        )}

        {/* 7. ADMIN PANEL VIEW */}
        {activeTab === 'admin' && (`,
`          </> : <Navigate to="/" replace />} />

        {/* 7. ADMIN PANEL VIEW */}
        <Route path="/admin" element={<>`
);

r(
`        )}

        {/* 8. TOOLS VIEW */}
        {activeTab === 'tools' && (`,
`          </>} />

        {/* 8. TOOLS VIEW */}
        <Route path="/tools" element={<>`
);

r(
`        )}

        {/* Site footer with legal links */}`,
`          </>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Site footer with legal links */}`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Done.");
