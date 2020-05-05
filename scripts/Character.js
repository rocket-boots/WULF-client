(function(RB){

class Tile {
	constructor(options) {
		this.pos = options.pos || (new RB.Coords(options.x || 0, options.y || 0));
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

class Character extends Tile {
	constructor(options) {
		super(options);
		this.lastPos = this.pos.clone();
		this.name = options.name || '?';
		this.actionPlan = [];
		this.goals = [];
		// Stats
		this.ai = options.ai || null;
		this.damage = [2, 4];
		this.healthMax = options.healthMax || 10;
		this.health = options.health || this.healthMax;
	}
	addNewActionToActionPlan(actionOptions) {
		const action = new Action(actionOptions);
		this.addToActionPlan(action);
	}
	addToActionPlan(action) {
		this.actionPlan.push(action);
	}
	clearActionPlan() {
		this.actionPlan.length = 0;
	}
	addNewGoal(goalOptions) {
		const goal = new Goal(goalOptions);
		this.addToGoals(goal);
	}
	addToGoals(goal) {
		this.goals.push(goal);
	}
	clearGoals() {
		this.goals.length = 0;
	}
	move(tileDelta) {
		this.lastPos = this.pos.clone();
		this.pos.add(tileDelta);
		this.setSpritePosition();
	}
	attack(targetChar) {
		const dmg = this.getRandomDamage();
		targetChar.hurt(dmg);
		let explanation = this.name + " attacked " + targetChar.name + " for " + dmg + " damage.";
		if (targetChar.isDead()) {
			explanation += " " + targetChar.name + " is dead!";
		}
		console.log(explanation);
		return explanation;
	}
	rest() {
		this.heal(1);
	}
	getRandomDamage() {
		return getRandomIntegerBetween(this.damage[0], this.damage[1]);
	}
	heal(n) {
		this.health += n;
		this.health = Math.min(this.health, this.healthMax);
	}
	hurt(n) {
		this.health -= n;
	}
	isDead() {
		return (this.health <= 0);
	}
	lookAtWorld(visibleWorld) {
		this.visibleWorld = visibleWorld;
	}
	lookAtCharacters(visibleCharacters) {
		this.visibleCharacters = visibleCharacters;
	}
	getNearestCharacter() {
		let nearestDistance = Infinity;
		let nearestCharacter = null;
		_.each(this.visibleCharacters, (character) => {
			if (character === this) {
				return;
			}
			const d = character.pos.getDistance(this.pos);
			if (d < nearestDistance) {
				nearestDistance = d;
				nearestCharacter = character;
			}
		});
		return nearestCharacter;
	}
	think() {
		if (!this.ai) {
			return;
		}
		if (this.ai === "beast") {
			if (this.goals.length === 0) {
				const nearestCharacter = this.getNearestCharacter();
				// TODO: determine if nearest character is "edible"
				this.targetCharacter(nearestCharacter, "kill");
			}
			const firstGoal = this.goals[0];
			if (firstGoal.verb === "kill") {
				this.planToMoveTowards(firstGoal.target.pos);
			}
		}
		if (this.actionPlan.length === 0) {
			const r = getRandomIntegerBetween(0,1);
			if (r) { this.planToMoveRandomly(); }
		}
	}
	targetCharacter(character, verb) {
		const goal = new Goal({
			verb: verb,
			noun: "character",
			target: character
		});
		this.addNewGoal(goal);
	}
	planToMoveRandomly() {
		const i = getRandomIntegerBetween(0,3);
		const deltas = [{x: 0, y: 1}, {x: 0, y: -1}, {x: 1, y: 0}, {x: -1, y: 0}];
		const delta = deltas[i];
		this.addNewActionToActionPlan({
			verb: "move",
			pos: this.pos.clone().add(delta)
		});		
	}
	planToMoveTowards(pos) {
		const diff = pos.clone().subtract(this.pos);
		const mag = diff.clone().abs();
		const delta = new RocketBoots.Coords(0, 0);
		if (mag.x > mag.y) {
			delta.x = (diff.x > 0) ? 1 : -1;
		} else {
			delta.y = (diff.y > 0) ? 1 : -1;
		}
		const newPos = this.pos.clone().add(delta);
		//console.log(this.pos, pos, diff, delta, newPos);
		this.addNewActionToActionPlan({
			verb: "move",
			pos: newPos
		});	
	}
}

class Action {
	constructor(options) {
		this.verb = options.verb;
		this.pos = options.pos;
	}
}

class Goal {
	constructor(options) {
		this.verb = options.verb || null;
		this.noun = options.noun || null;
		this.target = options.target || null;
	}
}

function getRandomIntegerBetween(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

RB.Tile = Tile;
RB.Character = Character;
})(RocketBoots);