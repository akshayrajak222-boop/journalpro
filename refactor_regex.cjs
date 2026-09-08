const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

function replaceBlock(strRegex, replacement) {
    const oldCode = code;
    code = code.replace(new RegExp(strRegex, 'g'), replacement);
    if (code === oldCode) {
        console.error("WARNING: Failed to match regex:\n" + strRegex);
    } else {
        console.log("Matched: " + strRegex.substring(0, 30) + "...");
    }
}

replaceBlock("import \\{ useNavigate, useLocation \\} from 'react-router-dom';", "import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';");
replaceBlock("const \\\[activeTab, setActiveTab\\\] = useState<string>\\('dashboard'\\);", "const activeTab = location.pathname === '/' ? 'dashboard' : location.pathname.substring(1) || 'dashboard';");

const tabs = ['dashboard', 'journal', 'calendar', 'fxnews', 'accounts', 'analytics', 'settings', 'mt5', 'insights', 'admin', 'tools'];
for (const tab of tabs) {
  const route = tab === 'dashboard' ? '/' : `/${tab}`;
  replaceBlock(`setActiveTab\\('${tab}'\\)`, `navigate('${route}')`);
}

replaceBlock(" {8}\\{activeTab === 'dashboard' && \\(", "        <Routes>\n          <Route path=\"/\" element={<>");

fs.writeFileSync('src/App.tsx', code);
console.log("Done refactor_regex.");
