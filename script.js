
// Pixel Editor - Final Build with Safe Resize & Zoom

let GRID_SIZE = 60;
const CELL_SIZE = 12;
const MAX_RECENT_COLORS = 8;
let copyWidth = 10;
let copyHeight = 10;
let zoomLevel = 1;

let pixelState = [];
let history = [];
let redoStack = [];
let currentColor = "#000000";
let backgroundColor = "#ffffff";
let isErasing = false;
let copyMode = false;
let copyBuffer = null;
let recentColors = [];

const pixelCanvas = document.getElementById("pixelCanvas");
const canvasWrapper = document.getElementById("pixelCanvasWrapper");
const colorPicker = document.getElementById("colorPicker");
const eraserBtn = document.getElementById("eraserBtn");
const clearBtn = document.getElementById("clearBtn");
const saveBtn = document.getElementById("saveBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");
const copyUnitBtn = document.getElementById("copyUnitBtn");
const toggleThemeBtn = document.getElementById("toggleTheme");
const presetContainer = document.getElementById("presetColors");
const recentContainer = document.getElementById("recentColors");
const togglePanelBtn = document.getElementById("togglePanel");
const panelContent = document.getElementById("panelContent");

const presetColors = ["#000", "#fff", "#f00", "#ffa500", "#ff0", "#0f0", "#0ff", "#00f", "#800080", "#ff00ff", "#808080", "#008080", "#4b0082", "#ffd700", "#ff7f50"];

window.onload = () => {
  createGrid();
  renderSwatches(presetContainer, presetColors, handleColorSelect);
};

function createGrid() {
  pixelCanvas.innerHTML = '';
  pixelCanvas.style.gridTemplateColumns = `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`;
  pixelCanvas.style.gridTemplateRows = `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`;
  pixelState = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    pixelState[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const div = document.createElement("div");
      div.classList.add("pixel");
      div.dataset.x = x;
      div.dataset.y = y;
      div.style.backgroundColor = backgroundColor;
      div.addEventListener("pointerdown", () => handlePaint(x, y));
      pixelCanvas.appendChild(div);
      pixelState[y][x] = backgroundColor;
    }
  }
  applyTransform();
}

function handlePaint(x, y) {
  if (copyMode) return handleCopyPaste(x, y);
  const from = pixelState[y][x];
  const to = isErasing ? backgroundColor : currentColor;
  if (from === to) return;
  pixelState[y][x] = to;
  getPixel(x, y).style.backgroundColor = to;
  history.push({ type: "paint", changes: [{ x, y, from, to }] });
  redoStack = [];
}

function getPixel(x, y) {
  return pixelCanvas.querySelector(`.pixel[data-x='${x}'][data-y='${y}']`);
}

function clearGrid() {
  const changes = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const from = pixelState[y][x];
      pixelState[y][x] = backgroundColor;
      getPixel(x, y).style.backgroundColor = backgroundColor;
      changes.push({ x, y, from, to: backgroundColor });
    }
  }
  history.push({ type: "clear", changes });
  redoStack = [];
}

function saveImage() {
  const exportWrapper = document.getElementById("canvasExportWrapper");
  exportWrapper.innerHTML = '';

  const clone = pixelCanvas.cloneNode(true);
  clone.style.transform = "scale(1)";
  clone.style.gridTemplateColumns = `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`;
  clone.style.gridTemplateRows = `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`;
  exportWrapper.appendChild(clone);

  html2canvas(clone, {
    backgroundColor: backgroundColor,
    scale: 4
  }).then(canvas => {
    const link = document.createElement("a");
    link.download = "pixel-art.png";
    link.href = canvas.toDataURL();
    link.click();
  });
}


function undo() {
  const action = history.pop();
  if (!action) return;
  redoStack.push(action);
  action.changes.forEach(({ x, y, from }) => {
    pixelState[y][x] = from;
    getPixel(x, y).style.backgroundColor = from;
  });
}

function redo() {
  const action = redoStack.pop();
  if (!action) return;
  history.push(action);
  action.changes.forEach(({ x, y, to }) => {
    pixelState[y][x] = to;
    getPixel(x, y).style.backgroundColor = to;
  });
}

function handleCopyPaste(x, y) {
  if (!copyBuffer) {
    copyWidth = parseInt(document.getElementById("copyWidth").value);
    copyHeight = parseInt(document.getElementById("copyHeight").value);
    copyBuffer = { data: [], width: copyWidth, height: copyHeight };
    for (let dy = 0; dy < copyHeight; dy++) {
      for (let dx = 0; dx < copyWidth; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < GRID_SIZE && yy < GRID_SIZE) {
          copyBuffer.data.push({ dx, dy, color: pixelState[yy][xx] });
          getPixel(xx, yy).classList.add("selected-copy");
        }
      }
    }
  } else {
    const changes = [];
    copyBuffer.data.forEach(({ dx, dy, color }) => {
      const xx = x + dx, yy = y + dy;
      if (xx < GRID_SIZE && yy < GRID_SIZE) {
        const from = pixelState[yy][xx];
        pixelState[yy][xx] = color;
        getPixel(xx, yy).style.backgroundColor = color;
        changes.push({ x: xx, y: yy, from, to: color });
      }
    });
    history.push({ type: 'paste', changes });
    redoStack = [];
    removeCopyHighlight();
    copyMode = false;
    copyBuffer = null;
    copyUnitBtn.classList.remove("active");
  }
}

function removeCopyHighlight() {
  document.querySelectorAll(".selected-copy").forEach(el =>
    el.classList.remove("selected-copy")
  );
}

function renderSwatches(container, colors, onClick) {
  container.innerHTML = '';
  colors.forEach(color => {
    const el = document.createElement("div");
    el.className = "color-swatch";
    el.style.backgroundColor = color;
    el.onclick = () => onClick(color);
    container.appendChild(el);
  });
}

function handleColorSelect(color) {
  currentColor = color;
  isErasing = false;
  eraserBtn.classList.remove("active");
  colorPicker.value = color;
  addRecentColor(color);
}

function addRecentColor(color) {
  if (!recentColors.includes(color)) {
    recentColors.unshift(color);
    if (recentColors.length > MAX_RECENT_COLORS) recentColors.pop();
    renderSwatches(recentContainer, recentColors, handleColorSelect);
  }
}

eraserBtn.onclick = () => {
  isErasing = !isErasing;
  eraserBtn.classList.toggle("active", isErasing);
};

clearBtn.onclick = clearGrid;
saveBtn.onclick = saveImage;
undoBtn.onclick = undo;
redoBtn.onclick = redo;
zoomInBtn.onclick = () => { zoomLevel = Math.min(4, zoomLevel + 0.1); applyTransform(); };
zoomOutBtn.onclick = () => { zoomLevel = Math.max(0.5, zoomLevel - 0.1); applyTransform(); };
copyUnitBtn.onclick = () => {
  copyMode = !copyMode;
  if (!copyMode) removeCopyHighlight();
  copyUnitBtn.classList.toggle("active", copyMode);
};
toggleThemeBtn.onclick = () => document.body.classList.toggle("dark-mode");

togglePanelBtn.onclick = () => {
  panelContent.classList.toggle("hidden");
};

document.getElementById("applyGridSize").onclick = () => {
  const newSize = parseInt(document.getElementById("gridSizeInput").value);
  const oldState = pixelState.map(row => [...row]);
  const oldSize = oldState.length;
  GRID_SIZE = newSize;
  createGrid();
  for (let y = 0; y < Math.min(oldSize, GRID_SIZE); y++) {
    for (let x = 0; x < Math.min(oldSize, GRID_SIZE); x++) {
      pixelState[y][x] = oldState[y][x];
      getPixel(x, y).style.backgroundColor = oldState[y][x];
    }
  }
};

function applyTransform() {
  canvasWrapper.style.transform = `scale(${zoomLevel})`;
  canvasWrapper.style.transformOrigin = "top left";
}

document.getElementById("bgPicker").oninput = (e) => {
  const newBg = e.target.value;
  const prevBg = backgroundColor;
  backgroundColor = newBg;

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (pixelState[y][x] === prevBg) {
        pixelState[y][x] = newBg;
        getPixel(x, y).style.backgroundColor = newBg;
      }
    }
  }
};
