// Client logic for LAN speed test with parallel websockets and live chart
const serverInput = document.getElementById('serverInput');
const durationInput = document.getElementById('duration');
const parallelInput = document.getElementById('parallel');
const chunkSizeInput = document.getElementById('chunkSize');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

const pingEl = document.getElementById('ping');
const dlEl = document.getElementById('download');
const ulEl = document.getElementById('upload');

let running = false;
let wsList = [];
let downloadBytesPerSec = [];
let uploadBytesPerSec = [];
let chart;
let chartTimer;

function getBaseURL() {
  const val = serverInput.value.trim();
  if (!val) return location.origin;
  // if user provided only ip (no scheme), add http://
  if (!/^https?:\/\//.test(val)) return 'http://' + val;
  return val;
}

// ping via HTTP echo
async function measurePing() {
  const base = getBaseURL();
  const url = new URL('/echo', base).toString();
  let total = 0;
  const tries = 5;
  for (let i = 0; i < tries; i++) {
    const t0 = performance.now();
    await fetch(url, { cache: 'no-store' });
    const t1 = performance.now();
    total += (t1 - t0);
    await new Promise(r => setTimeout(r, 50));
  }
  return total / tries;
}

function makeWSPath() {
  const base = getBaseURL();
  // convert http://host:port -> ws://host:port, https -> wss
  const u = new URL(base);
  const protocol = (u.protocol === 'https:') ? 'wss:' : 'ws:';
  return `${protocol}//${u.host}/ws`;
}

function makeChart() {
  const ctx = document.getElementById('chart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Download (Mbps)', borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.08)', data: [], tension: 0.25 },
        { label: 'Upload (Mbps)', borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.06)', data: [], tension: 0.25 }
      ]
    },
    options: {
      plugins: { legend: { labels: { color: '#e6eef6' } } },
      scales: {
        x: { ticks: { color: '#cfeff6' } },
        y: { ticks: { color: '#cfeff6' } }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function updateChart(sec, dlMbps, ulMbps) {
  if (!chart) return;
  chart.data.labels.push(sec.toString());
  chart.data.datasets[0].data.push(dlMbps);
  chart.data.datasets[1].data.push(ulMbps);
  // keep last 60 points
  if (chart.data.labels.length > 60) {
    chart.data.labels.shift();
    chart.data.datasets.forEach(ds => ds.data.shift());
  }
  chart.update('none');
}

async function startTest() {
  if (running) return;
  running = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  dlEl.textContent = 'Đang đo...';
  ulEl.textContent = 'Đang đo...';
  pingEl.textContent = '—';
  if (!chart) makeChart();
  chart.data.labels = [];
  chart.data.datasets[0].data = [];
  chart.data.datasets[1].data = [];
  chart.update();

  // measure ping first
  try {
    const ping = await measurePing();
    pingEl.textContent = ping.toFixed(1);
  } catch (err) {
    pingEl.textContent = 'ERR';
  }

  const parallel = Math.max(1, Number(parallelInput.value) || 4);
  const duration = Math.max(1, Number(durationInput.value) || 5);
  const chunkKB = Math.max(8, Number(chunkSizeInput.value) || 64);
  const chunkSize = chunkKB * 1024;

  const wsUrl = makeWSPath();

  // shared counters updated by each ws
  downloadBytesPerSec = new Array(duration).fill(0);
  uploadBytesPerSec = new Array(duration).fill(0);

  let elapsedSec = 0;
  let perSecondDl = 0;
  let perSecondUl = 0;

  // open websockets
  wsList = [];
  for (let i = 0; i < parallel; i++) {
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    ws._dlBytes = 0;
    ws._ulBytes = 0;
    ws._id = i;
    ws.onopen = () => {
      // when open, instruct server to start sending binary chunks for duration
      ws.send(JSON.stringify({ type: 'start_download', duration: duration, chunkSize: chunkSize }));
    };
    ws.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'download_done') {
            // server finished sending on this connection
          } else if (msg.type === 'upload_summary') {
            // server reports received bytes for upload on this ws
            // (we won't aggregate server-side in this demo; client already measures upload bytes)
          }
        } catch (e) {}
      } else {
        // binary data received -> download bytes
        const len = ev.data.byteLength || ev.data.length || 0;
        ws._dlBytes += len;
      }
    };
    ws.onclose = () => {};
    ws.onerror = () => {};
    wsList.push(ws);
  }

  // start upload: for upload test we will send binary frames as fast as possible for duration
  function startUploadOnWS(ws) {
    const chunk = new Uint8Array(chunkSize);
    let sending = true;
    function sendLoop() {
      if (!sending || ws.readyState !== WebSocket.OPEN || !running) return;
      try {
        ws.send(chunk);
        ws._ulBytes += chunk.byteLength;
        // schedule next: use setImmediate-like via setTimeout 0 to allow event loop
        setTimeout(sendLoop, 0);
      } catch (err) {
        sending = false;
      }
    }
    sendLoop();
    // after duration, stop and send upload_done control msg
    setTimeout(() => {
      sending = false;
      try { ws.send(JSON.stringify({ type: 'upload_done' })); } catch(e){}
    }, duration * 1000);
  }

  // Wait a short moment for all ws to open then begin uploads
  await new Promise(r => setTimeout(r, 200));
  wsList.forEach(ws => startUploadOnWS(ws));

  // sample per-second and update chart
  chartTimer = setInterval(() => {
    elapsedSec++;
    // sum bytes across websockets and compute Mbps
    let dlBytes = 0;
    let ulBytes = 0;
    wsList.forEach(ws => {
      const deltaDl = ws._dlBytes || 0;
      const deltaUl = ws._ulBytes || 0;
      // compute bytes since last sample: store last values if needed
      if (ws._last_dl === undefined) ws._last_dl = 0;
      if (ws._last_ul === undefined) ws._last_ul = 0;
      const secDl = Math.max(0, deltaDl - ws._last_dl);
      const secUl = Math.max(0, deltaUl - ws._last_ul);
      ws._last_dl = deltaDl;
      ws._last_ul = deltaUl;
      dlBytes += secDl;
      ulBytes += secUl;
    });
    const dlMbps = (dlBytes * 8) / (1024 * 1024);
    const ulMbps = (ulBytes * 8) / (1024 * 1024);
    downloadBytesPerSec[elapsedSec - 1] = dlBytes;
    uploadBytesPerSec[elapsedSec - 1] = ulBytes;

    updateChart(elapsedSec, dlMbps, ulMbps);
    dlEl.textContent = dlMbps.toFixed(2);
    ulEl.textContent = ulMbps.toFixed(2);

    if (elapsedSec >= duration) {
      stopTest();
    }
  }, 1000);
}

function stopTest() {
  if (!running) return;
  running = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  if (chartTimer) clearInterval(chartTimer);
  // close websockets gracefully
  wsList.forEach(ws => {
    try { ws.close(); } catch (e) {}
  });
  wsList = [];
}

startBtn.addEventListener('click', () => {
  startTest().catch(err => {
    console.error(err);
    alert('Lỗi khi bắt đầu test: ' + err.message);
    running = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
  });
});
stopBtn.addEventListener('click', () => {
  stopTest();
});

// init
makeChart();
