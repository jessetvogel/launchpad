var midiAccess = null;

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
