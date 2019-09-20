var track, gUM = c => navigator.mediaDevices.getUserMedia(c);

(async () => {
  spectrum(audio.srcObject = await gUM({audio: true}));
  track = audio.srcObject.getAudioTracks()[0];
  update();
})().catch(e => log(e));

function update() {
  let set = track.getSettings();
  echo.checked = set.echoCancellation;
  noise.checked = set.noiseSuppression;
  gain.checked = set.autoGainControl;
  muted.checked = !track.enabled;
}

echo.onclick = e => apply({echoCancellation: echo.checked});
noise.onclick = e => apply({noiseSuppression: noise.checked});
gain.onclick = e => apply({autoGainControl: gain.checked});
muted.onclick = e => { track.enabled = !muted.checked };

async function apply(c) {
  await track.applyConstraints(Object.assign(track.getSettings(), c));
  update();
}

function spectrum(stream) {
  var audioCtx = new AudioContext();
  var analyser = audioCtx.createAnalyser();
  var source = audioCtx.createMediaStreamSource(stream);
  source.connect(analyser);

  var canvas = document.createElement("canvas");
  var canvasCtx = canvas.getContext("2d");
  canvas.width = window.innerWidth/2 - 20;
  canvas.height = window.innerHeight/2 - 20;
  container.appendChild(canvas);

  var data = new Uint8Array(canvas.width);
  canvasCtx.strokeStyle = 'rgb(0, 125, 0)';

  setInterval(() => {
    canvasCtx.fillStyle = "#a0a0a0";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    analyser.getByteFrequencyData(data);
    canvasCtx.lineWidth = 2;
    data.forEach((y, x) => {
      y = canvas.height - (y / 128) * canvas.height / 4;
      var c = Math.floor((x*255)/canvas.width);
      canvasCtx.fillStyle = "rgb("+c+",0,"+(255-x)+")";
      canvasCtx.fillRect(x, y, 2, canvas.height - y)
    });

    analyser.getByteTimeDomainData(data);
    canvasCtx.lineWidth = 5;
    canvasCtx.beginPath();
    data.forEach((y, x) => {
      y = canvas.height - (y / 128) * canvas.height / 2;
      x ? canvasCtx.lineTo(x, y) : canvasCtx.moveTo(x, y);
    });
    canvasCtx.stroke();
    var bogus = source; // avoid GC or the whole thing stops
  }, 1000 * canvas.width / audioCtx.sampleRate);
};

function log(msg) { div.innerHTML += "<br>" + msg; }