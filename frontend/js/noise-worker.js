/**
 * noise-worker.js — runs entirely off the main thread
 * Receives an OffscreenCanvas and animates CRT grain at ~21fps.
 */

let ctx2d, imgData, pixels, timer;

function draw() {
  const len = pixels.length;
  for (let i = 0; i < len; i += 4) {
    const v = Math.random() > 0.5 ? 255 : 0;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = v;
    // alpha channel pre-filled to 255 on init/resize — skip here
  }
  ctx2d.putImageData(imgData, 0, 0);
  timer = setTimeout(draw, 48); // ~21fps — noise grain needs no more
}

function initCanvas(canvas, w, h) {
  canvas.width  = w;
  canvas.height = h;
  ctx2d   = canvas.getContext('2d');
  imgData = ctx2d.createImageData(w, h);
  pixels  = imgData.data;
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255; // set alpha once
}

self.onmessage = ({ data: msg }) => {
  if (msg.type === 'init') {
    initCanvas(msg.canvas, msg.w, msg.h);
    draw();
  } else if (msg.type === 'resize') {
    clearTimeout(timer);
    if (ctx2d) {
      ctx2d.canvas.width  = msg.w;
      ctx2d.canvas.height = msg.h;
      imgData = ctx2d.createImageData(msg.w, msg.h);
      pixels  = imgData.data;
      for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
      draw();
    }
  } else if (msg.type === 'stop') {
    clearTimeout(timer);
  }
};
