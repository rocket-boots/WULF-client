(function(RocketBoots, PIXI) {
	class SpriteSheet {
		constructor(options) {
			this.url = options.url;
			this.spriteSize = {
				x: options.spriteSize.x,
				y: options.spriteSize.y
			};
			this.spriteKeys = options.spriteKeys;
			this.sprites = {};
		}
		collectSprites() {
			const pixiTextureCache = PIXI.utils.TextureCache;
			let sourceTexture = pixiTextureCache[this.url];
			console.log("sourceTexture", sourceTexture);
			let x = 0, y = 0;
			let kx = 0, ky = 0;
			while (y <= sourceTexture.height) {
				while (x <= sourceTexture.width) {
					console.log(x, y, sourceTexture.width, sourceTexture.height);
					const rectangle = new PIXI.Rectangle(x, y, this.spriteSize.x, this.spriteSize.y);
					
					let texture = PIXI.Texture.from(rectangle); // this.url, rectangle);
					//texture.frame = rectangle;
					console.log(texture);
					const key = this.spriteKeys[ky][kx];
					// this.sprites[key] = new PIXI.Sprite(texture);
					this.sprites[key] = new PIXI.Sprite(texture);
					console.log("this.sprites[key]", this.sprites[key]);
					kx++;
					x += this.spriteSize.x;
				}
				ky++;
				y += this.spriteSize.y;
			}
		}
	}

	RocketBoots.SpriteSheet = SpriteSheet;

})(RocketBoots, PIXI);
