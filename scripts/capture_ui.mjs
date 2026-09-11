import { spawn } from 'child_process';
import fs from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\cyt15\\AppData\\Local\\Temp\\edge_cdp_tmp';

const browser = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${userDataDir}`,
  '--window-size=1600,1000',
  'about:blank'
]);

await new Promise(r => setTimeout(r, 2000));

try {
  const versionRes = await fetch('http://127.0.0.1:9222/json/version');
  const version = await versionRes.json();
  const wsUrl = version.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);
  await new Promise(resolve => ws.onopen = resolve);

  let id = 1;
  function send(method, params = {}) {
    return new Promise(resolve => {
      const curId = id++;
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === curId) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  async function capturePage(url, setupActions, filename) {
    const { targetId } = await send('Target.createTarget', { url });
    await new Promise(r => setTimeout(r, 2500));
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

    function sendSession(method, params = {}) {
      return new Promise(resolve => {
        const curId = id++;
        const handler = (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.id === curId) {
            ws.removeEventListener('message', handler);
            resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: curId, sessionId, method, params }));
      });
    }

    await sendSession('Page.enable');
    await sendSession('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
    await new Promise(r => setTimeout(r, 2000));

    if (setupActions) {
      await sendSession('Runtime.evaluate', { expression: setupActions });
      await new Promise(r => setTimeout(r, 1000));
    }

    const shot = await sendSession('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filename, Buffer.from(shot.data, 'base64'));
    console.log(`Saved ${filename}`);
    await send('Target.closeTarget', { targetId });
  }

  // 1. Lumi scrolled to reveal choices and slot 8 / 9
  await capturePage(
    'http://127.0.0.1:5173/?screen=companions&id=lumi',
    `const p = document.querySelector('.character-tab-panel'); if (p) p.scrollTop = 260;`,
    'preview_lumi_scrolled.png'
  );

  // 2. Lumi Weapon tab
  await capturePage(
    'http://127.0.0.1:5173/?screen=companions&id=lumi',
    `const btns = Array.from(document.querySelectorAll('.detail-tabs button')); const wBtn = btns.find(b => b.textContent.includes('专武')); if (wBtn) wBtn.click();`,
    'preview_lumi_weapon.png'
  );

  // 3. Saber Astral Altar
  await capturePage(
    'http://127.0.0.1:5173/?screen=companions&id=saber',
    null,
    'preview_saber_astral_altar.png'
  );

  // 4. Shorekeeper Astral Altar
  await capturePage(
    'http://127.0.0.1:5173/?screen=companions&id=shorekeeper',
    null,
    'preview_shorekeeper_astral_altar.png'
  );

  ws.close();
} catch (err) {
  console.error('CDP error:', err);
} finally {
  browser.kill();
}
