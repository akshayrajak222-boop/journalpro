const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Imports
code = code.replace(
  /import \{ useNavigate, useLocation \} from 'react-router-dom';/,
  "import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';"
);

// 2. activeTab State
code = code.replace(
  /const \[activeTab, setActiveTab\] = useState<string>\('dashboard'\);/,
  "const activeTab = location.pathname === '/' ? 'dashboard' : location.pathname.substring(1) || 'dashboard';"
);

// 3. setActiveTab calls -> navigate calls
const tabs = ['dashboard', 'journal', 'calendar', 'fxnews', 'accounts', 'analytics', 'settings', 'mt5', 'insights', 'admin', 'tools'];
for (const tab of tabs) {
  const route = tab === 'dashboard' ? '/' : `/${tab}`;
  code = code.replace(new RegExp(`setActiveTab\\('${tab}'\\)`, 'g'), `navigate('${route}')`);
}

// 4. Wrap blocks in <Routes>
const routeMaps = {
  'dashboard': '/',
  'journal': '/journal',
  'calendar': '/calendar',
  'fxnews': '/fxnews',
  'accounts': '/accounts',
  'analytics': '/analytics',
  'settings': '/settings',
  'mt5': '/mt5',
  'insights': '/insights',
  'admin': '/admin',
  'tools': '/tools'
};

function processBlocks(source) {
  let result = source;
  
  // Inject <Routes> before the first view block
  const dashboardStart = result.indexOf("{activeTab === 'dashboard' && (");
  if (dashboardStart !== -1) {
    const spaces = result.substring(dashboardStart - 8, dashboardStart);
    result = result.substring(0, dashboardStart) + "<Routes>\n" + spaces + result.substring(dashboardStart);
  }

  for (const tab of Object.keys(routeMaps)) {
    const path = routeMaps[tab];
    
    let startPattern = `{activeTab === '${tab}' && (`;
    if (tab === 'mt5') startPattern = "{activeTab === 'mt5' && user && (";
    if (tab === 'insights') startPattern = "{activeTab === 'insights' && activeAccount && user && (";
    
    // Exact starting string with 8 spaces indentation (to avoid stray modal triggers)
    const exactStartStr = `        ${startPattern}`;
    let startIdx = result.indexOf(exactStartStr);
    
    if (startIdx !== -1) {
      // Find the closing )} for this specific block
      // To be safe against strings, we will just use a simple brace/paren counter that ignores strings.
      let inString = false;
      let stringChar = '';
      let inTemplate = false;
      let parenCount = 0;
      let matchEndIdx = -1;
      
      // Start counting from the '(' in '&& ('
      const parenStart = startIdx + exactStartStr.length - 1;
      
      for (let i = parenStart; i < result.length; i++) {
        const char = result[i];
        
        // Handle strings
        if ((char === "'" || char === '"' || char === '`') && result[i-1] !== '\\') {
           if (!inString && !inTemplate) {
               if (char === '`') inTemplate = true;
               else { inString = true; stringChar = char; }
           } else if (inString && char === stringChar) {
               inString = false;
           } else if (inTemplate && char === '`') {
               inTemplate = false;
           }
        }
        
        if (!inString && !inTemplate) {
            if (char === '(') parenCount++;
            else if (char === ')') {
                parenCount--;
                if (parenCount === 0) {
                    // Check if the next non-whitespace char is '}'
                    let j = i + 1;
                    while (result[j] === ' ' || result[j] === '\n' || result[j] === '\r') j++;
                    if (result[j] === '}') {
                        matchEndIdx = i; // the ')'
                        break;
                    }
                }
            }
        }
      }
      
      if (matchEndIdx !== -1) {
          const closeBraceIdx = result.indexOf('}', matchEndIdx);
          const beforeEnd = result.substring(0, matchEndIdx);
          const afterEnd = result.substring(closeBraceIdx + 1);
          
          let newEnd = `</>} />`;
          if (tab === 'mt5' || tab === 'insights') {
              newEnd = `</> : <Navigate to="/" replace />} />`;
          }
          
          result = beforeEnd + newEnd + afterEnd;
          
          // Replace opening
          const newStartIdx = result.indexOf(exactStartStr);
          const beforeStart = result.substring(0, newStartIdx);
          const afterStart = result.substring(newStartIdx + exactStartStr.length);
          
          let newStart = `        <Route path="${path}" element={<>\n`;
          if (tab === 'mt5') newStart = `        <Route path="${path}" element={user ? <>\n`;
          if (tab === 'insights') newStart = `        <Route path="${path}" element={(activeAccount && user) ? <>\n`;
          
          result = beforeStart + newStart + afterStart;
      } else {
          console.log("Could not find matching close for tab: " + tab);
      }
    }
  }
  
  // Close the <Routes> before the LegalFooter
  const footerIdx = result.indexOf("{/* Site footer with legal links */}");
  if (footerIdx !== -1) {
    const spaces = result.substring(footerIdx - 10, footerIdx);
    result = result.substring(0, footerIdx) + `        <Route path="*" element={<Navigate to="/" replace />} />\n      </Routes>\n\n` + spaces + result.substring(footerIdx);
  }
  
  return result;
}

code = processBlocks(code);

fs.writeFileSync('src/App.tsx', code);
console.log('Successfully refactored App.tsx');
