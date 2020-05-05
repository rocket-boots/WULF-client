(function(){
	class Spritesheet {
		constructor(n, cb) {
			let o = this;
			o.sheet = new GameImage(n);
			o.sprites = [];
			o.sheet.onload = () => { 
				o.parse();
				if (typeof cb === "function") { cb(o.sprites); }
			};
		}
		parse() {
			let o = this;
			let canvas = document.createElement('canvas');
			let w = o.sheet.height;
			canvas.width = w;
			canvas.height = w; // assumes square
			let c = canvas.getContext('2d');
			let x = 0;
			while (o.sprites.length) { o.sprites.pop(); }
			while (x < o.sheet.width) {
				c.clearRect(0, 0, w, w);
				c.drawImage(o.sheet, x, 0, w, w, 0, 0, w, w);
				x += w;
				let src = canvas.toDataURL();
				o.sprites.push(new RocketBoots.GameImage(null, src));
			}
		}
	}

	const component = {
		fileName: 		"Spritesheet",
		classes:		["Spritesheet": Spritesheet],
		requirements:	["GameImage"],
		credits:		"By Luke Nickerson, 2017-2018"
	};

	// Install into RocketBoots if it exists otherwise put the classes on the global window object
	if (RocketBoots) {
		RocketBoots.installComponent(component);
	} else if (window) {
		for (let className in component.classes) {
			window[className] = component.classes[className];
		}
	}
})();