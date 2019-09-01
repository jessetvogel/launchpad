// Note: must use snake_case
var midiInput = null;

/* ---- Setup ---- */
function main() {
  initializeWebMIDI().then(() => {
  	// Search for MIDI devices
  	let deviceSelector = document.getElementById('device-selector');
  	for(let device of midiAccess.inputs) {
  		let option = document.createElement('option');
  		option.innerText = device[1].name;
  		deviceSelector.add(option);
  	}

    // Start game loop
  	setInterval(loop, dt * 1000);
  });

  // In case a MIDI device is selected
  document.getElementById('device-selector').onchange = function () {
  	if(midiInput != null)
  		midiInput.onmidimessage = null;
  	let deviceName = this.value;
  	for(let device of midiAccess.inputs) {
  		if(device[1].name == deviceName) {
			midiInput = device[1];
			midiInput.onmidimessage = on_midi_message;
  		}
  	}
  	midiOutput = null;
  	for(let device of midiAccess.outputs) {
  		if(device[1].name == deviceName)
  			midiOutput = device[1];
  	}

  	if(midiOutput != null)
  		set_screen_text('Press any button to start...');
  };
}

function set_screen_text(text) {
	document.getElementById('content').innerText = text;
}

/* ---- Snake The Game ---- */

const dt = 30 / 1000;
const snake_speed = 4.0;

var snake = [];
var snake_dir = '';
var snake_new_dir = '';
var snake_game_over = false;

var wait_for_key_to_start = true;
var waiting_timer = 0.0;

var apple = [];
var score = 0;
var snake_step_timer = 0.0;

var boundary_lights_timer = 1.0;
var boundary_lights_color;

function loop() {
	// Only do things when a MIDI device is selected
	if(midiOutput == null)
		return;

	let state = {};
	
	// Update game
	if(snake.length == 0 || (snake_game_over && boundary_lights_timer > 0.5)) {
		wait_for_key_to_start = true;
	}

	boundary_lights_timer += dt;

	if(!snake_game_over && !wait_for_key_to_start && (snake_step_timer = snake_step_timer + snake_speed * dt) >= 1.0) {
		snake_step_timer -= 1.0;
		snake_dir = snake_new_dir;
		switch(step_snake()) {
			case 'eats_apple':
				apple = random_no_snake_position();
				start_boundary_lights(String.fromCharCode(255, 255, 0));
				set_screen_text('Score: ' + (++ score));
				break;

			case 'eats_itself':
				snake_game_over = true;
				start_boundary_lights(String.fromCharCode(255, 0, 0));
				set_screen_text('Game over!\nScore: ' + score);
				break;		
		}
	}

	if(!snake_game_over && wait_for_key_to_start) {
		waiting_timer += dt;
		draw_waiting_circle(state);
	}
	else {
		draw_snake(state);
		draw_apple(state);
		draw_boundary_lights(state);
	}
	
	// Send image to launchpad
	launchpadSetState(state);
}

function snake_initialize() {
	// Clear all lights before starting
	launchpadClearLights();

	// Set start positions for snake & apple
	snake = [];
	let snake_start_pos = random_no_snake_position();
	snake.push(snake_start_pos);
	snake.push(snake_start_pos);
	snake.push(snake_start_pos);

	apple = random_no_snake_position();

	// Choose random starting direction
	snake_dir = snake_new_dir = ['left', 'right', 'up', 'down'][Math.floor(Math.random() * 4)];

	// Reset score
	var score = 0;
	set_screen_text('Score: ' + score);

	snake_game_over = false;
}

function draw_snake(state) {
	for(let i = 1;i < snake.length; ++i)
		state['' + snake[i][0] + snake[i][1]] = String.fromCharCode(0, 255, 0);
	state['' + snake[0][0] + snake[0][1]] = String.fromCharCode(191, 255, 0);
}

function draw_apple(state) {
	state['' + apple[0] + apple[1]] = String.fromCharCode(255, 0, 0);
}

function draw_waiting_circle(state) {
	for(var x = 1;x < 7; ++x) {
		for(var y = 1;y < 7; ++y) {
			let r = Math.sqrt((x - 3.5) * (x - 3.5) + (y - 3.5) * (y - 3.5));
			if(r > 1 && r < 3) {
				let f = (Math.atan2(x - 3.5, y - 3.5) / Math.PI + 1.0 + waiting_timer) % 2.0;
				state['' + x + y] = f > 1.0 ? String.fromCharCode(255 * (2.0 - f), 0, 0) : String.fromCharCode(0, 255 * (1.0 - f), 0);
			}
		}	
	}
}

function start_boundary_lights(color) {
	boundary_lights_color = color;
	boundary_lights_timer = 0.0;
}

function draw_boundary_lights(state) {
	if(boundary_lights_timer > 0.5)
		return;

	for(let x = 0;x < 8; ++x) {
		if(Math.abs(x - 3.5) / 3.5 < 1.0 - Math.abs(boundary_lights_timer - 0.25) * 4 + 0.25)
			state['t' + x] = state['r' + x] = state['l' + x] = state['b' + x] = boundary_lights_color;
	}
}

function step_snake() {
	let x = snake[0][0],
	    y = snake[0][1];
	switch(snake_dir) {
		case 'left':
			x = (x + 7) % 8;
			break;

		case 'right':
			x = (x + 1) % 8;
			break;

		case 'up':
			y = (y + 7) % 8;
			break;

		case 'down':
			y = (y + 1) % 8;
			break;
	}

	if(is_snake_position([x, y]))
		return 'eats_itself';

	snake.unshift([x, y]);

	if(x == apple[0] && y == apple[1])
		return 'eats_apple';

	snake.pop();

	return '';
}

function is_snake_position(position) {
	for(let p of snake) {
		if(position[0] == p[0] && position[1] == p[1])
			return true;
	}
	return false;
}

function random_no_snake_position() {
	let position = [];
	do {
		position = [Math.floor(Math.random() * 8), Math.floor(Math.random() * 8)];
	} while(is_snake_position(position));
	return position;
}

function on_midi_message(message) {
	// Only respond to press events on the grid
	if(message.data[0] != 0x90 || message.data[2] == 0x0)
		return;

	// Find position on board
	note = message.data[1];
	x = note % 8;
	y = Math.floor(note / 16);
	if(x < 0 || x >= 8 || y < 0 || y >= 8)
		return;

	// Case game start
	if(wait_for_key_to_start) {
		wait_for_key_to_start = false;
		snake_initialize();
		return;
	}

	// Determine new snake direction
	if(x <= 1 && snake_dir != 'right' && snake_dir != 'left')
		snake_new_dir = 'left';

	else if(x >= 6 && snake_dir != 'left' && snake_dir != 'right')
		snake_new_dir = 'right';

	else if(y <= 1 && snake_dir != 'down' && snake_dir != 'up')
		snake_new_dir = 'up';

	else if(y >= 6 && snake_dir != 'up' && snake_dir != 'down')
		snake_new_dir = 'down';	
}



























// async function animation() {
//   for(let x = 0;x < 8;++ x) {
//     for(let y = 0;y < 8;++ y) {
//       let state = {};
//       state['' + x + y] = String.fromCharCode(255, 0, 0);
//       for(let t = y - 1;t >= 0 && y - t < 4;-- t) {
//         state ['' + x + t] = String.fromCharCode(255 - (y - t - 1) * 64, 255 - (y - t - 1) * 64, 0);
//       }
//       launchpadSetState(state);
//       await sleep(100);
//     }
//   }
//   launchpadSetState({});
// }

// async function animation2() {
//   for(let x = 0;x < 6;++ x) {
//     let state = {};
//     state['' + x + '0']       = String.fromCharCode(255, 0, 0);
//     state['' + x + '1']       = String.fromCharCode(255, 0, 0);
//     state['' + (x + 1) + '0'] = String.fromCharCode(255, 0, 0);
//     state['' + (x + 1) + '1'] = String.fromCharCode(255, 0, 0);
//     launchpadSetState(state);
//     await sleep(100);
//   }

//   for(let y = 0;y < 6;++ y) {
//     let state = {};
//     state['6' + y]       = String.fromCharCode(255, 0, 0);
//     state['7' + y]       = String.fromCharCode(255, 0, 0);
//     state['6' + (y + 1)] = String.fromCharCode(255, 0, 0);
//     state['7' + (y + 1)] = String.fromCharCode(255, 0, 0);
//     launchpadSetState(state);
//     await sleep(100);
//   }

//   for(let x = 6;x > 0;-- x) {
//     let state = {};
//     state['' + x + '6']       = String.fromCharCode(255, 0, 0);
//     state['' + x + '7']       = String.fromCharCode(255, 0, 0);
//     state['' + (x + 1) + '6'] = String.fromCharCode(255, 0, 0);
//     state['' + (x + 1) + '7'] = String.fromCharCode(255, 0, 0);
//     launchpadSetState(state);
//     await sleep(100);
//   }

//   for(let y = 6;y > 0;-- y) {
//     let state = {};
//     state['0' + y]       = String.fromCharCode(255, 0, 0);
//     state['1' + y]       = String.fromCharCode(255, 0, 0);
//     state['0' + (y + 1)] = String.fromCharCode(255, 0, 0);
//     state['1' + (y + 1)] = String.fromCharCode(255, 0, 0);
//     launchpadSetState(state);
//     await sleep(100);
//   }

//   launchpadSetState({});
// }
