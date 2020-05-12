import PixiDisplay from './rocket-boots-pixi-display.js';

let display = null;

//----------------------- DOM

function $(q) {
	const elt = document.querySelectorAll(q);
	return (elt.length === 1) ? elt[0] : elt;
}

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
		} else {
			$('#chat-input').focus();
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

let lastMap = {};
const scrollOSpritesTileDictionary = {
	"brick": "stone-wall-1",
	"door": "door",
	"grass": "grass",
	"dirt": "dirt",
	"tree": "tree",
	"mountain": "stones", // "rocks-1",
	"water": "ocean",
	"plant": "small-plant",
	"apple": "apple",
	"seeds": "turnip",
	"log": "leaf",
};
const FALLBACK_SPRITE_INFO = `sos/spiral/purple`;
const SPRITE_INFO_KEY_JOINER = '/';
// TODO: get from map itself
const METER_SCALE = 1000;
const TILE_METERS = 1; // one tile is 1 meter square
const TILE_SCALE = METER_SCALE * TILE_METERS;
const mapsSocket = io('http://localhost:5000/wulf/maps');
mapsSocket.on('delta', refreshMapDelta);
mapsSocket.on('refresh', refreshMapFull);
const gameEntityTypes = {};
const gameTileTypes = {};

function convertToSpriteInfoTerrain(terrain = [], tiles) {
	const arr = [];
	terrain.forEach((row, y) => {
		const newRow = [];
		arr.push(newRow);
		for(let x = 0; x < row.length; x++) {
			const tileLetter = row.charAt(x);
			const tileKey = tiles[tileLetter];
			if (!gameTileTypes[tileKey]) {
				console.warn(tileKey, 'not found in gameTileTypes', gameTileTypes);
			}
			const spriteInfo = gameTileTypes[tileKey].sprite;
			newRow.push(spriteInfo);
			// const scrollOSpritesTileKey = scrollOSpritesTileDictionary[tileKey];
			// newRow.push(scrollOSpritesTileKey);
		}
	});
	return arr;
}

function addBlocksToTerrain(spriteInfoTerrain = [], blocks = {}) {
	if (spriteInfoTerrain.length <= 0) { return; }
	for (const blockKey in blocks) {
		const block = blocks[blockKey];
		const { x, y } = block;
		if (typeof x === 'number' && typeof y === 'number') {
			spriteInfoTerrain[y][x] = (block.sprite) ? block.sprite : FALLBACK_SPRITE_INFO;
		} else {
			// Log error?
		}
	}
}

function addCharactersToTerrain(spriteInfoTerrain = [], characters = []) {
	let charPosition;
	let yourCharacter;
	characters.forEach((char) => {
		const isYourCharacter = (char.userKey === user.userKey);
		const { x, y } = getCharacterTileCoords(char);
		if (isYourCharacter) {
			charPosition = { x, y };
			yourCharacter = char;
		}
		// spriteInfoTerrain[y][x] = getCharacterSpriteInfo(char);
	});
	return { charPosition, yourCharacter };
}

function getCharacterSpriteInfo(char) {
	const isYourCharacter = (char.userKey === user.userKey);
	const genderType = (char.gender === 0) ? 'woman' : 'man';
	const spriteKey = (char.displayClass) ? `${char.displayClass}-${genderType}` : genderType;
	const colorName = (isYourCharacter) ? 'yellow' : 'white';
	return `sos/${spriteKey}/${colorName}`;
}

function buildCharactersSpritesInfo(characters, spriteInfoTerrain) {
	let charPosition;
	let yourCharacter;
	const offTileSpritesInfo = [];
	characters.forEach((char) => {
		const isYourCharacter = (char.userKey === user.userKey);
		const x = char.pos.x / TILE_SCALE;
		const y = char.pos.y / TILE_SCALE;
		if (isYourCharacter) {
			charPosition = { x, y };
			yourCharacter = char;
		}
		const info = {
			x,
			y,
			spriteInfo: getCharacterSpriteInfo(char)
		};
		offTileSpritesInfo.push(info);
		clearTerrainAtCharacter(spriteInfoTerrain, char);
	});
	return { charPosition, yourCharacter, offTileSpritesInfo };
}

function clearTerrainAtCharacter(spriteInfoTerrain, char) {
	const { x, y } = getCharacterTileCoords(char);
	spriteInfoTerrain[y][x] = '';
}

function getCharacterTileCoords(char) { // FIXME: duplicate logic from WulfMap
	const x = Math.round(char.pos.x / TILE_SCALE);
	const y = Math.round(char.pos.y / TILE_SCALE);
	return { x, y };
}

function refreshMapDelta(map) {
	if (!lastMap.terrain) {
		console.warn('No lastMap.terrain yet. Cannot refresh map delta.');
		return;
	}
	const { characters, blocks, items } = map;
	refreshMap(lastMap.terrain, characters, blocks, items, lastMap.tiles, lastMap.tileTypes);
}

function refreshMapFull(fullMap) {
	const { mapKey, terrain, characters, blocks, items, size, tiles, tileTypes } = fullMap;
	lastMap = fullMap;
	console.log('---Full Refresh---', fullMap);
	Object.assign(gameTileTypes, tileTypes); // TODO: remove tile types that have been removed

	const tileTypeSpriteInfo = getTileTypeSpriteInfo(gameTileTypes);
	display.addTileSprites(tileTypeSpriteInfo);

	refreshMap(terrain, characters, blocks, items, tiles, tileTypes);
}

function refreshMap(terrain, characters, blocks, items, tiles, tileTypes) {
	const spriteInfoTerrain = convertToSpriteInfoTerrain(terrain, tiles);
	addBlocksToTerrain(spriteInfoTerrain, blocks);
	addBlocksToTerrain(spriteInfoTerrain, items);
	// const { charPosition, yourCharacter } = addCharactersToTerrain(spriteInfoTerrain, characters);
	const {
		charPosition, yourCharacter, offTileSpritesInfo
	} = buildCharactersSpritesInfo(characters, spriteInfoTerrain);
	character = yourCharacter;
	const eventHandlers = {
		mousedown: handleSpriteClick,
		mouseover: handleSpriteHover,
		rightclick: handleContextClick,
	};
	// TODO: Trim the terrain to only the tiles that could reasonably be in view?
	display.refresh(spriteInfoTerrain, offTileSpritesInfo, charPosition, eventHandlers);	
}

// function addTileTypeEntityDefault(tileTypes, entityTypes) { // mutates tileTypes
// 	const newTileTypes = {};
// 	Object.keys(tileTypes).forEach((tileTypeKey) => {
// 		const tileType = tileTypes[tileTypeKey];
// 		const entityType = entityTypes[tileType.type];
// 		const newTileType = Object.assign({ tileTypeKey }, tileType);
// 		Object.keys(entityType).forEach((key) => {
// 			if (typeof tileType[key] === 'undefined' && typeof entityType[key] !== 'undefined') {
// 				tileType[key] = entityType[key];
// 			}
// 		});
// 		tileType.sprite = convertSpriteInfo(tileType.sprite);
// 		if (!tileType.sprite) {
// 			console.warn('sprite not found for', tileType);
// 		}
// 	});
// 	return newTileTypes;
// }

function convertSpriteInfo(spriteInfoParam) {
	if (typeof spriteInfoParam === 'string') { return spriteInfoParam; }
	if (spriteInfoParam instanceof Array) {
		return spriteInfoParam.join(SPRITE_INFO_KEY_JOINER);
	}
	console.log('Error converting sprite info!', spriteInfoParam);
	return 'sos/dragon/brown';
}

function getTileTypeSpriteInfo(tileTypes) {
	const tileTypeKeys = Object.keys(tileTypes);
	const tileTypeSprites = {};
	tileTypeKeys.forEach((key) => {
		tileTypeSprites[key] = convertSpriteInfo(tileTypes[key].sprite);
	});
	return tileTypeSprites;
	// Data should look like `{ "grass": ["sos", "grass", "green"], "brick": ... }`
}

function getTileTypeAtMapCoordinates(x, y) {
	const tileLetter = lastMap.terrain[y].charAt(x);
	const tileKey = lastMap.tiles[tileLetter];
	return gameTileTypes[tileKey];
}

function handleSpriteClick(sprite, x, y) {
	commander.moveTo(x, y);
	return 'sos/bullseye/yellow';
}

function handleSpriteHover(sprite, x, y) {
	const tileType = getTileTypeAtMapCoordinates(x, y);
	// console.log('hover', x, y, );
	if (tileType.chop) {
		return 'sos/axe/yellow';
	}
}

function handleContextClick(sprite, x, y) {
	selectTile(x, y);
	console.log('RIGHT CLICK: selecting tile', x, y);
}


//----------------------- Command

const selectedTile = { x: null, y: null };

const commander = {
	moveTo: function (x, y) {
		console.log('Move', character.characterKey,'to', x, y);
		mapsSocket.emit('command', {
			what: 'move',
			where: {x, y},
			who: character.characterKey,
			auth: { userSessionKey: user.sessionKey }
		});
	}
};

function selectTile(x, y) {
	selectedTile.x = x;
	selectedTile.y = y;
}

function deselectTile() {
	selectedTile.x = null;
	selectedTile.y = null;	
}

//----------------------- Init

function init() {
	document.addEventListener('DOMContentLoaded', setupDOMAndInput);
	// loadTypes().then((data) => {
	// 	console.log(data);
	// });
}

// async function loadTypes() {
// 	const fetchOptions = {
// 		mode: 'no-cors',
// 	};
// 	const typesResponse = await fetch('http://localhost:5000/static/data/types.json', fetchOptions);
// 	console.log('typesResponse', typesResponse);
// 	// const types = typesResponse.json();
// 	// console.log('types', types);
// 	return typesResponse.json();
// }

function onMapRightClick(e) {
	e.preventDefault();
}

function setupDOMAndInput() {
	display = new PixiDisplay();
	display.start();
	setupForms();
	document.addEventListener('keypress', onKeyPress);
	$('.game-world').addEventListener('contextmenu', onMapRightClick);
}

init();

//-------------- Expose

if (window) {
	window.g = {
		display,
		gameTileTypes,
		gameEntityTypes,
		getUser: () => user,
		getCharacter: () => character,
		getLastMap: () => lastMap,
		submitChat,
		submitConsole
	};
}
