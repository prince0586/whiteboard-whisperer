const ws = new WebSocket(`ws://${window.location.host}/ws`);
const video = document.getElementById('video');
const startBtn = document.getElementById('startBtn');
const makeRealBtn = document.getElementById('makeRealBtn');
const statusEl = document.getElementById('status');
const diagram = document.getElementById('diagram');
const placeholder = document.getElementById('placeholder');
const hitlModal = document.getElementById('hitlModal');
const hitlMessage = document.getElementById('hitlMessage');
const approveBtn = document.getElementById('approveBtn');
const abortBtn = document.getElementById('abortBtn');

let isLive = false;

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'diagram_generated') {
        diagram.src = `data:image/jpeg;base64,${data.image}`;
        diagram.classList.remove('hidden');
        placeholder.classList.add('hidden');
        statusEl.textContent = 'DIAGRAM GENERATED';
    } else if (data.type === 'HITL_REQUIRED') {
        hitlMessage.textContent = data.message;
        hitlModal.classList.remove('hidden');
        hitlModal.classList.add('flex');
    } else if (data.type === 'status') {
        statusEl.textContent = data.message;
    }
};

startBtn.onclick = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    video.srcObject = stream;
    isLive = true;
    statusEl.textContent = 'LIVE LINK ESTABLISHED';
    startBtn.textContent = 'LINK ACTIVE';
    makeRealBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    
    // In a real app, we would capture frames and audio here and send via ws
};

makeRealBtn.onclick = () => {
    if (!isLive) return;
    statusEl.textContent = 'GENERATING DIAGRAM...';
    
    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 480;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
    
    ws.send(JSON.stringify({ type: 'execute_vision', image: base64 }));
};

approveBtn.onclick = () => {
    ws.send(JSON.stringify({ approved: true }));
    hitlModal.classList.add('hidden');
    hitlModal.classList.remove('flex');
};

abortBtn.onclick = () => {
    ws.send(JSON.stringify({ approved: false }));
    hitlModal.classList.add('hidden');
    hitlModal.classList.remove('flex');
};
