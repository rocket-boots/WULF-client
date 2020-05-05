
//----------------------- DOM

function $(q) {
	const elt = document.querySelectorAll(q);
	return (elt.length === 1) ? elt[0] : elt;
}

const mapElement = document.getElementById('map');

//----------------------- Servamo Users - Registration and Chat

const events = {
	REGISTER: 'register',
	CHAT: 'chat',
	USERS: 'users'
};
const chatOutputElement = $('#chat-output');
// const worldOutputElement = document.getElementById('world-output');
// const consoleOutputElement = document.getElementById('console-output');

let user = {};
let lastChatSenderName;
const usersSocket = io('http://localhost:5000/users');

usersSocket.on(events.REGISTER, onRegister);
usersSocket.on(events.CHAT, onReceivedChat);
usersSocket.on(events.USERS, onReceivedUsers)

function setupForms() {
	const chatElement = $('#chat');
	const forms = chatElement.getElementsByTagName('form');
	forms[0].addEventListener('submit', submitChat);
}

function onKeyPress(event) {
	if (event.keyCode === 13 || event.which === 13) {
		event.preventDefault();
		if (document.activeElement === $('#chat-input')) {
			submitChat();
		}
	}
}

function onReceivedUsers(users) {
	console.log(users);
	let h = '';
	users.forEach((person) => {
		h += '<li>' + person.name + '</li>';
	});
	$('#player-list').innerHTML = h;
}

function onReceivedChat(message, senderName) {
	// /console.log(data);
	const messageElement = document.createElement('div');
	let h = '<span class="chat-message">' + message + '</span>';
	if (senderName) {
		if (senderName !== lastChatSenderName) {
			h = '<span class="chat-sender">' + senderName + '</span>' + h;
			lastChatSenderName = senderName;
		}
	}
	messageElement.innerHTML = h;
	chatOutputElement.appendChild(messageElement);
	chatOutputElement.scrollTop = chatOutputElement.scrollHeight;
}

function onRegister(registeredUser) {
	user = registeredUser;
	console.log("Registered as user", user);
}

function submitChat(event) {
	if (event) {
		event.preventDefault();
	}
	const chatInputElement = document.getElementById('chat-input');
	const message = chatInputElement.innerHTML; // .textContent; // TODO: get this to work
	if (message.trim().length === 0) {
		return false;
	}
	usersSocket.emit(events.CHAT, message);
	chatInputElement.innerHTML = '';
	return false;
}

function submitConsole() {
	return false;
}

//-------------- Character

let character = {};

//----------------------- Map Refresh

const METER_SCALE = 1000; // TODO: get from map itself
const mapsSocket = io('http://localhost:5000/wulf/maps');
mapsSocket.on('refresh', refreshMap);

function refreshMap(map) {
	const { terrain, mapKey, characters, tiles } = map;
	console.log('refreshing map', map);
	let html = '';
	terrain.forEach((row, y) => {
		for(let x = 0; x < row.length; x++) {
			const tileLetter = row.charAt(x);
			const tile = tiles[tileLetter];
			html += `<span class="${mapKey}-${x}-${y} tile-${tile}" data-x="${x}" data-y="${y}">${tileLetter}</span>`;
		}
		html += '<br>';
	});
	mapElement.innerHTML = html;
	characters.arr.forEach((char) => {
		const isYourCharacter = (char.userKey === user.userKey);
		character = char;
		const letter = (isYourCharacter) ? '@' : 'X';
		const x = Math.floor(char.pos.x / METER_SCALE);
		const y = Math.floor(char.pos.y / METER_SCALE);
		// console.log($(`.${mapKey}-${char.pos.x}-${char.pos.y}`));
		$(`.${mapKey}-${x}-${y}`).innerHTML = letter;
	});
}

//----------------------- Command

const commander = {
	moveTo: function (x, y) {
		console.log('move to', x, y);
		mapsSocket.emit('command', {
			what: 'move',
			where: {x, y},
			who: character.characterKey,
			auth: { userSessionKey: user.sessionKey }
		});
	}
};

//----------------------- Init

function init() {
	document.addEventListener('DOMContentLoaded', setupDOMAndInput);
}

function setupDOMAndInput() {
	setupForms();
	document.addEventListener('keypress', onKeyPress);
	mapElement.addEventListener('click', onClickMap);
}

function onClickMap(e) {
	const data = e.target.dataset || {};
	let { x, y } = data;
	x = Number(x);
	y = Number(y);
	if (!isNaN(x) && !isNaN(y)) {
		commander.moveTo(x, y);
	}
}

init();

//-------------- Expose

if (window) {
	window.g = {
		getUser: () => user,
		getCharacter: () => character,
		submitChat,
		submitConsole
	};
}
