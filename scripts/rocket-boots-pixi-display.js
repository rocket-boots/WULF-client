import scroll_o_sprites from './scroll_o_sprites.js';

const SPRITE_INFO_KEY_JOINER = '/';
const TILE_SIZE = 16;
const SPRITESHEET_URL = "images/scroll-o-sprites_spritesheet.png";
const { PIXI, RocketBoots } = window;

class Tile {
	constructor(options) {
		this.pos = options.pos || (new RocketBoots.Coords(options.x || 0, options.y || 0));
		this.sprite = options.sprite;
		this.tileSize = options.tileSize;
		// Setup
		this.resize(this.tileSize);
		this.sprite.anchor.set(0.5, 0.5);
		this.setSpritePosition();
	}
	resize(tileSize) {
		this.tileSize = tileSize;
		this.sprite.width = tileSize;
		this.sprite.height = tileSize;		
	}
	setSpritePosition() {
		this.sprite.x = this.pos.x * this.tileSize;
		this.sprite.y = this.pos.y * this.tileSize;
	}
}

class PixiDisplay {
	constructor() {
		this.zoom = 3;
		this.tileSize = TILE_SIZE;
		this.colors = PixiDisplay.getColors();
		this.app = null; // pixi app
		this.center = RocketBoots.Coords(0, 0);
		this.spritesheets = {
			"sos": null
		};
		this.sprites = new Map();
		this.stageContainer = null;
		this.containers = null;
		// d.hero = null;
		// d.monsters = [];
	}

	static getColors() {
		return {
			// Based on a desaturated (-36) version of the pico-8 color palette
			// https://www.romanzolotarev.com/pico-8-color-palette/
			black: 		new RocketBoots.Color(0, 0, 0),
			darkBlue: 	new RocketBoots.Color(45, 50, 75),
			darkPurple: new RocketBoots.Color(111, 57, 83),
			darkGreen: 	new RocketBoots.Color(24, 110, 77),
			brown: 		new RocketBoots.Color(149, 95, 77),
			darkGray: 	new RocketBoots.Color(92, 87, 82),
			lightGray: 	new RocketBoots.Color(194, 195, 197),
			white: 		new RocketBoots.Color(250, 241, 235),
			red: 		new RocketBoots.Color(214, 69, 100),
			orange: 	new RocketBoots.Color(210, 152, 53),
			yellow: 	new RocketBoots.Color(214, 205, 83),
			green: 		new RocketBoots.Color(41, 188, 80),
			blue: 		new RocketBoots.Color(96, 164, 220),
			indigo: 	new RocketBoots.Color(133, 123, 147),
			pink: 		new RocketBoots.Color(230, 143, 173),
			peach: 		new RocketBoots.Color(238, 206, 184),
			scrollOSprites: new RocketBoots.Color(238 /* 236? */, 238, 204 /* 203? */)
		};
	}

	getZoomedTileSize() {
		return this.zoom * this.tileSize;
	}

	static getCenter(pixiApp) {
		return RocketBoots.Coords((pixiApp.renderer.width / 2), (pixiApp.renderer.height / 2));
	}

	refresh(spriteTerrain, offTileSpritesInfo, focusTilePosition, eventHandlers) {
		this.addTerrainImagesToContainer(
			spriteTerrain,
			offTileSpritesInfo,
			this.containers.terrain,
			eventHandlers
		);
		this.centerStageContainerOnTile(focusTilePosition);
	}

	// moveStageContainer(delta) {
	// 	this.stageContainer.x -= delta.x;
	// 	this.stageContainer.y -= delta.y;
	// }

	// moveStageContainerTo({ x, y }) {
	// 	this.stageContainer.x = x;
	// 	this.stageContainer.y = y;
	// }

	centerStageContainerOnTile({ x, y }) {
		const m = this.getZoomedTileSize() * -1;
		this.stageContainer.x = (x * m) + this.center.x;
		this.stageContainer.y = (y * m) + this.center.y;
	}

	static createPixiApp() {
		const canvasContainerElt = document.getElementById("pixi-view");
		// const $canvasContainer = $(canvasContainerElt);
		// const pixiTextureCache = PIXI.utils.TextureCache;
		// const grid = new Grid({
		// 	x: GRID_SIZE_X, y: GRID_SIZE_Y, 
		// 	groundY: Math.round(GRID_SIZE_Y/3),
		// 	pixelsPerGridUnit: PIXELS_PER_GRID_UNIT
		// });
	
		// let colorFilter = new PIXI.filters.ColorMatrixFilter();
		// colorFilter.matrix = [
		// 	//R  G  B  A
		// 	1, 0, 0, 0,
		// 	0, 1, 0, 0,
		// 	0, 0, 1, 0,
		// 	0, 0, 0, 1
		// ];
	
		const app = new PIXI.Application({
			width: 640, // 576, // $canvasContainer.width(),
			height: 640, // 576, //$canvasContainer.height(),
			transparent: true,
			antialias: false,
			roundPixels: true
		});
		PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
		canvasContainerElt.appendChild(app.view);
	
		return app;
	} 
	
	static createStageContainer(app, center) {
		const stageContainer = new PIXI.Container();
		app.stage.addChild(stageContainer);
		stageContainer.x += center.x;
		stageContainer.y += center.y;
		return stageContainer;
	}
	
	static createContainers(stageContainer, containerNames) {
		const containers = {};
		_.each(containerNames, (containerName) => {
			if (containerName === "smoke" || containerName === "snow") {
				containers[containerName] = new PIXI.particles.ParticleContainer(5000, {alpha: true})
			} else {
				containers[containerName] = new PIXI.Container();
			}
			stageContainer.addChild(containers[containerName]);
		});
		return containers;
	}
	
	static createSpritesheet() {
		// 23 + 15 high x 16 = 608px
		// 16 wide x 16 = 256px
		const spritesheet = new RocketBoots.Spritesheet({
			url: SPRITESHEET_URL,
			spriteSize: {x: TILE_SIZE, y: TILE_SIZE},
			spriteKeys: scroll_o_sprites.keys
		});
		return spritesheet;
	}

	// static getScrollOSpriteColoring(colors) {
	// 	return {
	// 		"ocean": colors.blue,
	// 		"grass": colors.darkGreen,
	// 		"tree": colors.green,
	// 		"stones": colors.lightGray,
	// 		"stone-wall-1": colors.lightGray,
	// 		"door": colors.brown,
	// 		"dirt": colors.brown,
	// 		"small-plant": colors.green,
	// 		"woman": colors.white,
	// 		"man": colors.white,
	// 		"druid-woman": colors.yellow,
	// 		"druid-man": colors.yellow,
	// 		"bullseye": colors.yellow,
	// 		"apple": colors.red,
	// 		"turnip": colors.green,
	// 		// TODO: add more as needed
	// 	};
	// }

	// static createTerrainTypeImages(spritesheet, colors) {
	// 	const coloring = PixiDisplay.getScrollOSpriteColoring(colors);
	// 	const terrTypeImages = {};
	// 	const keys = Object.keys(coloring);
	// 	keys.forEach((key) => {
	// 		const image = spritesheet.getImageCopy(key);
	// 		image.replaceColor(colors.scrollOSprites, coloring[key]);
	// 		terrTypeImages[key] = image;
	// 	});
	// 	return terrTypeImages;
	// }

	addTileSprites(tileTypeSpriteInfo = {}) { // mutates `this.sprites`
		Object.keys(tileTypeSpriteInfo).forEach((key) => {
			const spriteInfo = tileTypeSpriteInfo[key];
			const image = this.convertSpriteInfoToImage(spriteInfo);
			this.sprites.set(spriteInfo, image);
		});
	}

	convertSpriteInfoToImage(spriteInfo) {
		const spriteInfoArr = spriteInfo.split(SPRITE_INFO_KEY_JOINER);
		if (spriteInfoArr.length !== 3) {
			console.error('Error with spriteInfo', spriteInfo, 'key:', key);
			return;
		}
		const spriteSheetKey = spriteInfoArr[0]; // e.g. "sos"
		const spriteKey = spriteInfoArr[1]; // e.g. "grass"
		const colorName = spriteInfoArr[2]; // e.g. "brown"
		const spriteSheetSprite = this.spritesheets[spriteSheetKey];
		if (!spriteSheetSprite) {
			console.error('Sprite not found:', spriteSheetKey, '...in:', this.spritesheets);
			return;
		}
		const image = spriteSheetSprite.getImageCopy(spriteKey);
		image.replaceColor(this.colors.scrollOSprites, this.colors[colorName]);
		return image;
	}

	getOrMakeSpriteImage(spriteInfo = '') {
		if (!spriteInfo || spriteInfo === '') {
			return false;
		}
		let image = this.sprites.get(spriteInfo);
		if (!image) {
			// console.warn('No image found named', spriteInfo, 'in sprites', this.sprites, image, this.sprites.has(spriteInfo));
			image = this.convertSpriteInfoToImage(spriteInfo);
			if (image) {
				this.sprites.set(spriteInfo, image);
			}
		}
		return image;
	}

	addTerrainImagesToContainer(terrain, offTileSpritesInfo, container, eventHandlers) {
		// TODO: Switch to an update rather than removing and re-adding
		// https://pixijs.download/dev/docs/PIXI.Container.html
		container.removeChildren();
		
		const addSprite = (spriteInfo, x, y) => {
			let image = this.getOrMakeSpriteImage(spriteInfo);
			if (!image) { return; }
			const sprite = this.convertImageToTilePixiSprite(image, x, y);
			this.makeSpriteInteractive(sprite, eventHandlers);
			container.addChild(sprite);			
		};

		terrain.forEach((row, y) => {
			const xLength = row.length;
			for(let x = 0; x < xLength; x++) {
				const spriteInfo = row[x];
				addSprite(spriteInfo, x, y);
			}
		});
		// Handle things that are not exactly on the tile grid
		offTileSpritesInfo.forEach((info) => {
			addSprite(info.spriteInfo, info.x, info.y);
		});
	}

	makeSpriteInteractive(sprite, eventHandlers) {
		// http://scottmcdonnell.github.io/pixi-examples/index.html?s=demos&f=interactivity.js&title=Interactivity
		sprite.buttonMode = true; // TODO: needed?
		sprite.interactive = true;
		const tileSize = this.getZoomedTileSize();
		const onEvent = (sprite, handler) => {
			const x = sprite.x / tileSize;
			const y = sprite.y / tileSize;
			const spriteInfo = handler(sprite, x, y);
			if (spriteInfo) {
				const image = this.getOrMakeSpriteImage(spriteInfo);
				if (image) {
					sprite.texture = PIXI.Texture.from(image);
				}
			}			
		};
		function onClick() {
			return onEvent(this, eventHandlers.mousedown);
		}
		sprite.on('mousedown', onClick);
		sprite.on('touchstart', onClick);
		// sprite.on('click', onClick);
		function onHover() {
			return onEvent(this, eventHandlers.mouseover);
		}
		sprite.on('mouseover', onHover);
		function onRightClick() {
			return onEvent(this, eventHandlers.rightclick);
		}
		sprite.on('rightclick', onRightClick);
	}
	
	convertImageToTilePixiSprite(image, x, y) {
		const terrainTile = new Tile({
			pos: new RocketBoots.Coords(x, y),
			sprite: image.createPixiSprite(),
			tileSize: this.getZoomedTileSize()
		});
		// if (x === 0 && y === 0) console.log(terrainTile);
		return terrainTile.sprite;
	}

	start() { // start after the DOM is loaded
		if (!RocketBoots.Spritesheet || !RocketBoots.Color || !RocketBoots.Coords) {
			console.error('RocketBoots missing modules', RocketBoots);
			RocketBoots.loadComponents(['Spritesheet', 'Color', 'Coords']);
		}
		this.app = PixiDisplay.createPixiApp();
		this.center = PixiDisplay.getCenter(this.app);
		this.stageContainer = PixiDisplay.createStageContainer(this.app, this.center);
		this.containers = PixiDisplay.createContainers(this.stageContainer, [
			"ground",
			"terrain",
			"fixtures",
			"items",
			"npcs",
			"monsters",
			"hero",
			"weather"
		]);
		this.loader([SPRITESHEET_URL]).then(() => {
			this.spritesheets.sos = PixiDisplay.createSpritesheet();
			this.spritesheets.sos.loaded.then((spritesheet) => {
				// this.terrainTypeImages = PixiDisplay.createTerrainTypeImages(spritesheet, this.colors);
				// d.hero = createNewCharacter(spritesheet);
				// d.monsters = createMonsters(spritesheet);
		
				// addTerrainImagesToContainer(d.terrainTypeImages, d.world);
				// hideBackgroundTiles();
			});
			this.app.ticker.add(() => { this.tick(); });
		});
	}

	tick() {
		// do nothing right now
	}

	loader(arr = []) {
		return new Promise((resolve, reject) => {
			//	23 + 15 high x 16 = 608px
			//	16 wide x 16 = 256px
			PIXI.loader
				.add(arr)
				.load(resolve);
		});
	}
}

export default PixiDisplay;
