/* ---- Web MIDI API ---- */
var midiAccess = null;
var midiOutput = null;

function initializeWebMIDI() {
  if(navigator.requestMIDIAccess) {
    console.log('This browser supports WebMIDI!');
  } else {
    console.log('WebMIDI is not supported in this browser.');
  }
  return new Promise(resolve => {
    navigator.requestMIDIAccess().then(function (m) {
      midiAccess = m;
      resolve(true);
    }, function () {
      console.log('Could not access your MIDI devices.');
      resolve(false);
    });
  });
}

/* ---- Launchpad functions ---- */
var state = {};
function launchpadSetState(newState) {
  // Turn off lights that were on, but should not be anymore
  for(const [c, v] of Object.entries(state)) {
    if(!(c in newState)) {
      launchpadSetLight(c, String.fromCharCode(0, 0, 0));
      delete state[c];
    }
  }

  // Set new colors
  for(const [c, v] of Object.entries(newState)) {
    if(!(c in state) || state[c] != v) {
      if(launchpadSetLight(c, v))
        state[c] = v;
    }
  }
}

function launchpadClearLights() {
  let state = {};
  for(let x = 0;x < 8; ++x) {
    for(let y = 0;y < 8; ++y)
      state['' + x + y] = String.fromCharCode(0, 0, 0);
    state['t' + x] = state['r' + x]
                   = state['l' + x]
                   = state['b' + x]
                   = String.fromCharCode(0, 0, 0);
  }
  launchpadSetState(state);
}

function launchpadSetLight(c, v) {
  // Determine color
  r = Math.min(Math.floor(v.charCodeAt(0) / 255 * 4.0), 3.0);
  g = Math.min(Math.floor(v.charCodeAt(1) / 255 * 4.0), 3.0);
  color = r + 16 * g;

  // Determine other MIDI stuff
  let status; // MIDI note on
  switch(c[0]) {
    case 't': // Top row
      status = 0xB0;
      note = 0x68 + (c.charCodeAt(1) - 0x30);
      break;

    case 'r': // Right column
      status = 0x90;
      note = 0x8 + 0x10 * (c.charCodeAt(1) - 0x30);
      break;

    case 'l': // Left column
    case 'b': // Bottom row
      return false; // Not implemented!

    default: // Middle square
      status = 0x90;
      let x = (c.charCodeAt(0) - 0x30),
          y = (c.charCodeAt(1) - 0x30);
      note = x + 0x10 * y;
      break;
  }
  
  midiOutput.send([status, note, color]);
  return true;
}

/* ---- Util ---- */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
