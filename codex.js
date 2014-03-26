
var SREntityClass = function (type) {
	this.type 			= type.toLowerCase();
	this.name			= "something";
	this.faction 		= "natural";
	this.imageName		= "xxxxx"	
	this.loc 			= { "x" : 0, "y" : 0 };
	this.baseLoc 		= { "x" : 0, "y" : 0 };
	if (this.type == "tree") {
		this.size 		= { "x" : 32, "y" : 96 };
		this.halfSize 	= { "x" : 16, "y" : 48 };
	} else {
		this.size 		= { "x" : 32, "y" : 32 };
		this.halfSize 	= { "x" : 16, "y" : 16 };
	}
	this.vel 			= { "x" : 0, "y" : 0 };
	this.distanceFromPC = { "x" : 0, "y" : 0 };
	this.facing 		= "right";
	//this.acc = { "x" : 0, "y" : 0 };
	
	if (this.type == "npc" || this.type == "pc" || this.type == "monster") {
		this.isAlive = true;
		this.isPhysics = true;
		this.isNPC = (this.type == "npc" || this.type == "monster");
		this.isHostile 	= false;
		this.race 		= "nord";
		this.likes		= ["nothing"];
		this.magicka 	= 100;
		this.health 	= 100;
		this.stamina 	= 100;
		this.maxMagicka = 100;
		this.maxHealth 	= 100;
		this.maxStamina = 100;		
		this.brainCooldown = 0;
		this.leftActionCooldown = 0;
		this.rightActionCooldown = 0;
		this.healingCooldown = 0;
		this.bravery 	= 50;
		this.aggro 		= 0;		// equivalent to a peaceful cooldown
		this.isSneaking = false;
		this.targetEntKey = "";
		this.targetLoc 	= { "x" : 0, "y" : 0 };
		this.walkingVel = { "x" : 0, "y" : 0 }; 
		this.walkingFacing 	= "right";
		this.walkingFrame	= 1;
		this.shirtName 	= "shirt1";
		this.skills = {
			"alt" : 1
			,"con" : 1
			,"des" : 1
			,"ill" : 1
			,"res" : 1
			,"enc" : 1
			,"arc" : 1
			,"blo" : 1
			,"har" : 1
			,"one" : 1
			,"two" : 1
			,"smi" : 1
			,"alc" : 1
			,"lar" : 1
			,"pic" : 1
			,"loc" : 1
			,"sne" : 1
			,"spe" : 1
		}
		this.xp = {
			"alt" : 0
			,"con" : 0
			,"des" : 0
			,"ill" : 0
			,"res" : 0
			,"enc" : 0
			,"arc" : 0
			,"blo" : 0
			,"har" : 0
			,"one" : 0
			,"two" : 0
			,"smi" : 0
			,"alc" : 0
			,"lar" : 0
			,"pic" : 0
			,"loc" : 0
			,"sne" : 0
			,"spe" : 0		
		}
		this.gold = 0;
	} else {
		this.health = 100;	// durability
		this.isAlive = false;
		this.isPhysics = false;
	}
}


var SRGameClass = function (dataDeliveryObj) 
{
	this.version = "0.000";
	this.hasGameStarted = false;
	this.dataDelivery = dataDeliveryObj;
	this.game = {
		"version"  			: this.version
		,"currentZoneKey"	: ""
		,"entities" 		: {}
		,"pc" 				: {} // Pointer to the "PC" entity
	};
	this.game.pc = new SREntityClass("PC");
	this.game.pc.loc = { "x" : 100, "y" : 0 };
	this.game.pc.imageName = "redguard";
	this.game.pc.race = "redguard";
	this.game.pc.faction = "peace";
	
	this.entArrays = {
		"all" 		: []
		,"nearby" 	: []
		,"nearbyNPC" : []
		,"nearbyStatic": []
		,"physicsEntities" 	: []
	};
	
	this.particles 	= [];
	this.bubbles 	= [];
	this.blasts 	= [];
	
	// Data to be loaded by refData object
	this.images = {};
	this.zones = {};
	this.availableRaces = [];
	this.unavailableRaces = [];
	this.allLikes = [];
	
	// DOM Elements
	this.$tips = {};
	this.$background = {};
	


//==============(((((((((((((((( OOOOoooo Loop ooooOOOO ))))))))))))))))===

	this.isLooping 		= false;
	this.loopTimer 		= 0;
	this.loopIteration 	= 0;
	this.lastTime 		= 0;
	//==== Loop timing Constants
	this.loopDelay		= 14;
	// ^ Decrease for more fps
	// 1000 = 1 second
	// 100 = 1/10th of a second
	// 16 = 1/?th of a second = 62.5 fps (closest to 60 fps)
	// 10 = 1/100th of a second (better than 60 fps)
	// Needs to be less than 16 to accomodate for the time it takes to run the loop 'stuff'
	this.framesPerSecond = (1000 / this.loopDelay);
	this.secondsPerLoop	= (this.loopDelay / 1000);
	// Update certain things once every X iterations
	this.loopModulus		= Math.round(this.framesPerSecond); // once per second
	this.loopModulusAction	= Math.round(this.framesPerSecond / 2); // twice per second
	
	this.loop = function () 
	{
		var o = this;
		if (!o.game.pc.isAlive) {
			
			this.openMenu("start");
			alert("YOU'VE DIED!\n:(");
			return;
		}
		
		// Update every half second or so... For action...
		if ((o.loopIteration % o.loopModulusAction) == 0) {
			//console.log("Combat Round ~0.5/second");
			this.thinkingRound();
			
			this.attackRound();
			this.makeSnow();
		}
		this.movementRound();
		this.damageRound();
		this.physics(o.secondsPerLoop);
		this.particlePhysics(o.secondsPerLoop);
		this.cooldownRound();
		this.redraw();
		
		
		// Update these only every second or so... 
		if ((o.loopIteration % o.loopModulus) == 0) {
			//console.log("Loop tick ~1/second");
		}			
	
		if (o.isLooping) {
			o.loopIteration++;
			if (o.loopIteration < 15000000) {
				o.loopTimer = window.setTimeout(function(){
					o.loop();
				}, o.loopDelay); 
			} else {
				o.loopIteration = 0;
				o.togglePause(true);
			}
		}	
	}
	
	this.togglePause = function (forcePause) {
		if (typeof forcePause === 'boolean') {
			if (this.isLooping == !forcePause) return false;
			this.isLooping = !forcePause;
		} else {
			this.isLooping = !this.isLooping;
		}
		if (this.isLooping) this.loop();
		console.log("Game " + ((this.isLooping) ? "un" : "") + "paused.");
	}
	
	
	this.blackOut = function (callback) {
		//
		/* WHY DOESN'T THIS WORK ?! :( */
		//$('#blackoutShade').fadeIn(1300, function(){
		$('#blackoutShade').show(1300, function(){
			if (typeof callback === "function") callback();
		});
	}
	this.blackIn = function (callback) {
		$('#blackoutShade').fadeOut(1300, function(){ 
			if (typeof callback === "function") callback();
		});
	}
	this.blackOutAndIn = function (callback){
		var o = this;
		o.togglePause(true);
		o.blackOut(function(){
			o.blackIn(function(){
				o.togglePause(false);
				if (typeof callback === "function") callback();
			});
		});
	}
	
	

//=================== Movement & Physics =====\/\/\/\/\/\/\/\/\/\/\/\/=========

	this.gravity = -1;
	this.friction = 0.9;
	
	this.moveEntity = function (ent, desiredSpeed, direction) 
	{
		ent.walkingVel.x += (1 * direction);
		// *** adjust max speed with acrobatics skill?
		var maxSpeed = (ent.isSneaking) ? 1 : 3;
		// You can only go as fast as the max speed
		if (desiredSpeed > maxSpeed) desiredSpeed = maxSpeed;
		if (Math.abs(ent.walkingVel.x) > desiredSpeed) {
			ent.walkingVel.x = desiredSpeed * direction;
		}
		//if (ent.type == "pc") {	console.log("walkingVel = ", JSON.stringify(ent.walkingVel));		}
		ent.stamina -= 0.6;
	}
	
	this.stopEntity = function (ent) 
	{
		ent.walkingVel.x = 0;
	}
	
	this.knockbackEntity = function (ent, vel) {
		ent.vel.x = vel.x;
		ent.vel.y = vel.y;
	}
	
	this.jumpEnt = function (ent, y) 
	{
		var groundY = 0; // *** use terrain height
		if (ent.loc.y <= groundY) {
			ent.vel.y += y;
		}
		
	}
	
	this.physics = function (t) // *** allow for different times?
	{
		var o = this;
		var rightEdgeX = this.zones[this.game.currentZoneKey].rightEdgeX;
		var groundY = 0; // *** use terrain height
		
		// Loop through all entities that need physics
		o.loopOverEntities("physics", function(entKey, ent){
			var isOnGround = (ent.loc.y <= groundY);
			
			/*
			if (entKey == "PC") {
				if (ent.vel.x != 0 || ent.vel.y != 0) {
					console.log("PC vel = " + JSON.stringify(ent.vel));
					//console.log("PC loc = " + JSON.stringify(ent.loc));
				}
				//console.log(JSON.stringify(ent.walkingVel));
			
			}
			*/
			
			// Ground walking and friction
			if (isOnGround) {
				if (ent.vel.y < 0) {
					ent.vel.y = 0;
				}
				if (ent.walkingVel.x != 0) {	// If walking, then no friction			
				
					// If the velocity boost from walking 
					// doesn't put you over speed, then give a boost
					var newVelX = (ent.vel.x + ent.walkingVel.x);
					if (Math.abs(newVelX) <= Math.abs(ent.walkingVel.x)) {
						ent.vel.x = newVelX;
						//if (ent.type == "pc") { console.log("Setting Vel x to ", newVelX); }
					} else {
						ent.vel.x = ent.walkingVel.x;
						//if (ent.type == "pc") { console.log("Max'd out"); }
					}
					/*
					if (ent.type == "pc") {
						console.log("walkingVel = ",JSON.stringify(ent.walkingVel));
						console.log("newVelX = ", newVelX);
						console.log("PC vel = " + JSON.stringify(ent.vel));
					}
					*/					
					
				} else { // If no walking movement, then do friction
					if (ent.vel.x != 0) {
						ent.vel.x = ent.vel.x * o.friction;
						if (ent.vel.x < 0.05 && ent.vel.x > -0.05) ent.vel.x = 0;
					}
				}

			} else { // Not on the ground, so subject to gravity
				ent.vel.y += o.gravity;
			}
			
			//ent.vel.x += ent.acc.x;
			ent.loc.x += ent.vel.x;
			//ent.vel.y += ent.acc.y;
			ent.loc.y += ent.vel.y;
			
			//ent.walkingVel.x = 0;
			//ent.walkingVel.y = 0;
			
			if (entKey == "PC") {
				if (ent.vel.x != 0 || ent.vel.y != 0) {
					//console.log("PC x = " + ent.loc.x);
					//console.log("PC vel = " + JSON.stringify(ent.vel));
					//console.log("PC loc = " + JSON.stringify(ent.loc));
				}
			}
			
			if (ent.loc.x < 0) {				ent.loc.x = 0; }
			else if (ent.loc.x > rightEdgeX) {	ent.loc.x = rightEdgeX; }
			if (ent.loc.y < groundY) {			ent.loc.y = groundY; }
			else if (ent.loc.y > 1000) {		ent.loc.y = 1000; }			
		});
		this.focusCoords.x = this.game.pc.loc.x;
		this.focusCoords.y = 0; //this.game.pc.loc.y;		
	}
	
	this.particlePhysics = function ()
	{
		var numOfParticles = this.particles.length;
		var particle = {};
		var removeParticlesArray = [];
		//var particleGravity = (this.gravity * 0.05);
		// Loop through all particles
		for (var i = 0; i < numOfParticles; i++) {
			particle = this.particles[i];
			particle.vel.y += (this.gravity * particle.gravityMod);
			particle.loc.x += particle.vel.x;
			particle.loc.y += particle.vel.y;
			particle.burnout -= 0.05;
			if (particle.burnout <= 0) {
				this.particles.splice(i, 1);
				numOfParticles--;
				i--;
			}
		}
	}
	
	this.addParticles = function (particleNum, loc, style)
	{
		var color 		= "#FF0";
		var gravityMod 	= 0.05;
		var burnout		= 1;
		if (style == "snow") {
			color		= "#FFF";
			gravityMod 	= 0.01;
			burnout 	= 100;
		} else if (style == "steel") {
			color 		= "#CCC";
		} else if (style == "blood") {
			color 		= "#D00";
			gravityMod 	= 0.05;
			burnout 	= 10;
		}
		for (var i = 0; i < particleNum; i++) {
			this.particles.push({
				"loc" 		: { "x" : loc.x, "y" : loc.y }
				,"vel" 		: { 
					"x" 	: (this.roll1d(50) - this.roll1d(50)) / 10
					,"y" 	: (this.roll1d(50) - this.roll1d(50)) / 10
				}
				,"size" 	: { "x" : 4, "y" : 4 }
				,"burnout" 	: burnout
				,"color" 	: color
				,"gravityMod" : gravityMod
			});
		}
	
	}
	
	this.makeSnow = function ()
	{
		var snowX = 0;
		var snowSteps = 1000 / 100;
		for (var i = 0; i <= snowSteps; i++) {
			snowX = (i * 100);
			if (Math.abs(snowX - this.game.pc.loc.x) < 400) {
				this.particles.push({
					"loc" 		: { "x" : snowX, "y" : this.dim.y }
					,"vel" 		: { 
						"x" 	: (this.roll1d(50) - this.roll1d(30)) / 10
						,"y" 	: this.roll1d(10) / -10
					}
					,"size" 	: { "x" : 3, "y" : 3 }
					,"burnout" 	: 1000
					,"color" 	: "#FFF"
					,"gravityMod" : 0.003
				});
			}
		}
	}
	
	
	
//====================== Drawing and X,Y Coordinate Calculations ==============

	// Canvas Variables
	this.canvasElt 	= document.getElementById('canvas');
	this.ctx 		= this.canvasElt.getContext('2d');
	this.dim 		= { "x" : 320, "y" : 320 };
	this.focusCoords	= { "x" : 100, "y" : 0 };
	this.groundHeight 	= 80;
	this.groundCanvasY	= (this.dim.y - this.groundHeight) - 4;
	this.focusCanvasCoords 	= { 
		"x" : (this.dim.x / 2)
		,"y" : (this.dim.y - this.groundHeight) 
	};
	//this.focusOffsetCoords = { "x" : 0, "y" : 0 }; // Set dynamically as focus changes
	this.canvasScale 			= 1.0;
	this.zoomScale 				= 2.0;
	this.playersLastZoomScale 	= 2.0; // Used by certain menus
	this.selectedEntityKey = "";
	this.bubbleSize = { "x" : 32, "y" : 32 };
	// DOM elements
	this.magickaElt = {};
	this.staminaElt = {};
	this.healthElt = {};
	this.targetHealthElt = {};
	this.$interface = {};

	this.alterCanvasSize = function(deltaX)
	{
		var o = this;
		o.dim.x += deltaX;
		o.focusCanvasCoords.x = (o.dim.x / 2);
		o.setupCanvas();
		o.$interface.css("width", o.dim.x);
		$('#canvasContainer').css("width", o.dim.x);		
	
	}

	this.redraw = function () 
	{	
		var o = this;
		var numOfParticles = this.particles.length;
		var focusOffsetCoords = this.getFocusOffsetCoords();
		var particle = {};
		var i = 0;
		
		// Clear canvas
		this.ctx.save();
		this.ctx.imageSmoothingEnabled = false; // http://stackoverflow.com/questions/18547042/resizing-a-canvas-image-without-blurring-it
		
		this.ctx.clearRect(0,0,this.dim.x,this.dim.y);
		
		// Draw ground
		this.ctx.fillStyle = '#bbb';
		this.ctx.fillRect(0, this.groundCanvasY - 8, this.dim.x, 2);		
		this.ctx.fillStyle = '#ccc';
		this.ctx.fillRect(0, this.groundCanvasY - 6, this.dim.x, 2);
		this.ctx.fillStyle = '#ddd';
		this.ctx.fillRect(0, this.groundCanvasY - 4, this.dim.x, 2);
		this.ctx.fillStyle = '#eee';
		this.ctx.fillRect(0, this.groundCanvasY - 2, this.dim.x, 2);
		this.ctx.fillStyle = '#fff';
		this.ctx.fillRect(0, this.groundCanvasY, this.dim.x, this.dim.y);

		// Loop and draw decorative entities
		o.loopOverEntities("nearbyStatic", function(entKey, ent){
			o.drawEntity(entKey, focusOffsetCoords);
		});
	
		// Loop and draw entities
		o.loopOverEntities("nearby", function(entKey, ent){
			o.drawEntity(entKey, focusOffsetCoords);
		});
		
		// Draw PC after other entities
		this.drawEntity("PC", focusOffsetCoords);

		
		// Loop through particles (backwards) and draw them
		for (i = 0; (i < numOfParticles && i < 100); i++) {
			particle = this.particles[(numOfParticles - i - 1)];
			this.drawParticle(particle, focusOffsetCoords);
		}
		this.ctx.globalAlpha = 1.0;
		
		//ctx.rotate(200);
		this.ctx.restore();
		
		// Do DOM updates
		this.updateAttribute("magicka", "maxMagicka");
		this.updateAttribute("stamina", "maxStamina");
		this.updateAttribute("health", "maxHealth");
		this.updateTarget();
		var nearX = 10 - (this.focusCoords.x / 10);
		var farX = 10 - (this.focusCoords.x / 20);
		this.$background[0].style.backgroundPosition =  nearX + "px center," + farX + "px center";
	}
	
	this.updateAttribute = function(attName, attMaxName) {
		var attElt = this[attName + "Elt"];
		//console.log(this.game.pc[attMaxName]);

		if (this.game.pc[attName] < this.game.pc[attMaxName]) {
			var percent = (this.game.pc[attName] /  this.game.pc[attMaxName]) * 100;
			attElt.children[0].style.width = percent + "%";
			attElt.style.opacity = 1.0;
		} else {
			attElt.style.opacity = 0.0;
		}	
	}
	
	this.updateTarget = function() {
		if (this.selectedEntityKey != "") {
			var ent = this.game.entities[this.selectedEntityKey];
			var percent = (ent.health / ent.maxHealth) * 100;
			this.targetHealthElt.children[0].style.width = percent + "%";
			this.targetHealthElt.style.opacity = (percent >= 100) ? 0.0 : 1.0;
		} else {
			this.targetHealthElt.style.opacity = 0.0;
		}
	}
	
	
	this.drawEntity = function(entKey, focusOffsetCoords) 
	{
		//entKey = this.entArrays.all[i];
		var ent = this.game.entities[entKey];
		if (typeof ent === 'undefined') console.log(ent, entKey);
		var entSize = this.getScaledCoords(ent.size);
		var scaledBubbleSize = this.getScaledCoords(this.bubbleSize);
		var entLoc = this.getScaledCoords(ent.loc);
		var ecc = this.getEntityCanvasCoords(entLoc, entSize, focusOffsetCoords);
		if (entKey == "PC") ecc.y += 6; // "Z" offset
		
		if (ent.type == "npc" || ent.type == "pc") {
		
			if (!ent.isAlive) {
				this.ctx.globalAlpha = 0.1;
			} else if (ent.isSneaking) {
				this.ctx.globalAlpha = 0.25;
			}
			this.ctx.drawImage(	this.images[ent.race + "_torso"]
				,ecc.x, ecc.y, entSize.x, entSize.y );
			this.ctx.drawImage(	this.images[ent.race + "_head_" + ent.facing]
				,ecc.x, ecc.y, entSize.x, entSize.y );
				
			var armPose = "relaxed";
			// Figure out which arms to do
			if (ent.leftActionCooldown > 0) {	armPose =  "striking";	} 
			else if (ent.aggro > 0) {			armPose = "holding";	}
			this.ctx.drawImage(	this.images[ent.race + "_arm_left_" + armPose]
				,ecc.x, ecc.y, entSize.x, entSize.y );
			if (ent.rightActionCooldown > 0) {	armPose =  "striking";	} 
			else if (ent.aggro > 0) {			armPose = "holding";	}
			this.ctx.drawImage(	this.images[ent.race + "_arm_right_" + armPose]
				,ecc.x, ecc.y, entSize.x, entSize.y );
				
			if (ent.walkingFrame == 0) {
				var legImageName = "legs_standing";
			} else {
				var legImageName = "legs_" + ent.walkingFacing + "_" + ent.walkingFrame;
			}
			//console.log(legImageName);
			this.ctx.drawImage(	this.images[legImageName]
				,ecc.x, ecc.y, entSize.x, entSize.y );
			
			// Clothing
			this.ctx.drawImage(	this.images[ent.shirtName + "_torso"]
				,ecc.x, ecc.y, entSize.x, entSize.y );			
			
		
		} else {
			// Get Images
			//console.log(ent);
			var entImage 	= this.images[ent.imageName];
			this.ctx.drawImage(	entImage, ecc.x, ecc.y, entSize.x, entSize.y );
		}

		
		// Add Bubbles if appropriate for this entity...
		var bubbleImage = this.images["bubble_chat"];
		var bubbleOpacity = 0.0;
		
		if (ent.isAlive && ent.isNPC && !ent.isSneaking) {
			if (entKey == this.selectedEntityKey) {
				bubbleOpacity = 1.0;
			} else {
				// *** Scale based on how close the ent is to the pc
				if (ent.distanceFromPC < 100) {
					bubbleOpacity = 1.0 - (ent.distanceFromPC / 100);
				} else {
					bubbleOpacity = 0.0;
				}
			}
			if (ent.aggro > 0) {
				bubbleImage = this.images["bubble_aggro"];
			}
			this.ctx.globalAlpha = bubbleOpacity;
			this.ctx.drawImage(
				bubbleImage
				,ecc.x, ecc.y - scaledBubbleSize.y
				,scaledBubbleSize.x, scaledBubbleSize.y
			);
		}
		this.ctx.globalAlpha = 1.0;
		
		if (entKey == this.selectedEntityKey) {
			this.ctx.strokeStyle = '#f60';
			this.ctx.strokeRect(ecc.x, ecc.y, entSize.x, entSize.y);
			//this.ctx.strokeCircle(ecc.x, ecc.y, 10);
		}
	}
	
	this.drawParticle = function(particle, focusOffsetCoords)
	{
		var pSize = this.getScaledCoords(particle.size);
		var pLoc = this.getScaledCoords(particle.loc);
		var pCanvasCoords = this.getEntityCanvasCoords(pLoc, pSize, focusOffsetCoords);	
		if (particle.burnout < 1) {
			this.ctx.globalAlpha = particle.burnout;
		} else {
			this.ctx.globalAlpha = 1.0;
		}
		this.ctx.fillStyle = particle.color;
		this.ctx.fillRect(pCanvasCoords.x, pCanvasCoords.y, pSize.x, pSize.y);
	}

	this.getScaledCoords = function (coords) {
		var s = {
			"x" 	: coords.x * this.zoomScale
			,"y" 	: coords.y * this.zoomScale
		};
		return s;
	}
	
	this.getDescaledCoords = function (coords) {
		var s = {
			"x" 	: coords.x / this.zoomScale
			,"y" 	: coords.y / this.zoomScale
		};
		return s;
	}	
	
	this.getFocusOffsetCoords = function () 
	{
		var fc = this.getScaledCoords(this.focusCoords);
		var focusOffsetCoords = {
			"x" : (fc.x - this.focusCanvasCoords.x)
			,"y" : (fc.y - this.focusCanvasCoords.y)
		};
		return focusOffsetCoords;
	}
	
	
	this.getEntityCanvasCoords = function (entScaledLoc, entScaledSize, focusOffsetCoords)
	{
		var entCanvasCoords = {
			"x" : (entScaledLoc.x - focusOffsetCoords.x  - (entScaledSize.x / 2))
			,"y" : ((entScaledLoc.y * -1) - focusOffsetCoords.y  - (entScaledSize.y))
		};
		return entCanvasCoords;
	}
	
	this.getZoneCoords = function (canvasCoords) 
	{
		var focusOffsetCoords = this.getFocusOffsetCoords();
		var zoneCoords = {
			"x" : (canvasCoords.x + focusOffsetCoords.x)
			,"y" : ((canvasCoords.y + focusOffsetCoords.y) * -1)
		};
		zoneCoords = this.getDescaledCoords(zoneCoords);
		return zoneCoords;
	}
	
	//====Zoom
	
	this.zoomIn = function() {
		if (this.zoomScale > 15) {		return false; }
		else if (this.zoomScale < 1) {	this.zoomScale += 0.2; }
		else {							this.zoomScale += 0.5; }
		this.redraw();
		return this.zoomScale;
	}

	this.zoomOut = function() {
		if (this.zoomScale <= 0.21) {	return false; }
		else if (this.zoomScale <= 1) {	this.zoomScale -= 0.2; }
		else {							this.zoomScale -= 0.5; }
		this.redraw();
		return this.zoomScale;
	}
	
	this.getEntityEdges = function(ent) 
	{
		var edges = { 
			"left" 		: (ent.loc.x - ent.halfSize.x)
			,"right" 	: (ent.loc.x + ent.halfSize.x)
			,"top" 		: (ent.loc.y + ent.size.y)
			,"bottom" 	: (ent.loc.y)
		};
		return edges;
	}
	
	this.areCoordsWithinEdges = function (coords, edges) 
	{
		return (coords.x >= edges.left && coords.x <= edges.right
			&& coords.y >= edges.bottom && coords.y <= edges.top);
	}
	
	//==== Get Canvas Entity at x,y
	this.getEntityKeyAtZoneCoords = function (zoneCoords) 
	{
		var o = this;
		var foundKey = "";
		//console.log(zoneCoords);
		// Loop and draw entities
		o.loopOverEntities("nearbyNPCs", function(entKey, ent){
			var entEdges = o.getEntityEdges(ent);
			//console.log("Entity " + entKey + " -- " + JSON.stringify(entEdges));
			if (o.areCoordsWithinEdges(zoneCoords, entEdges)) {
				//console.log("FOUND!");
				foundKey = entKey;
				// ^ *** would be nice if we could return this value to avoid
				//		unnecessary looping once we've found the key.
			}
		});

		if (foundKey == "") {
			o.loopOverEntities("nearbyStatic", function(entKey, ent){
				var entEdges = o.getEntityEdges(ent);
				if (o.areCoordsWithinEdges(zoneCoords, entEdges)) {
					foundKey = entKey;
				}				
			});
		}
		if (foundKey == "") {
			var entEdges = o.getEntityEdges(o.game.pc);
			if (o.areCoordsWithinEdges(zoneCoords, entEdges)) {
				foundKey = "PC";
			}
		}		
		return foundKey;
	}

	
	
	
//============= Entity Intelligence and Relations ===IIIIIIIIIIIIIIIII=========

	this.thinkingRound = function ()
	{
		var o = this;
		o.loopOverEntities("nearbyNPCs", function(entKey, ent){
			if (ent.isAlive && ent.brainCooldown <= 0) {
				var targetEnt = {};
				if (ent.health < (100 - ent.bravery)) {
				
					// *** Run from danger
					
				}
				
				if (ent.aggro > 0) { 	// I'm angry, ready for violence!
	
					// I don't have a target...
					if (ent.targetEntKey == "") {
						// *** Find nearby person who's not in the same faction
						// *** Set them as target
						ent.targetEntKey = "PC";
					}
				}
				// If I have a target, let's see if I lost him
				if (ent.targetEntKey != "") {
					targetEnt = o.game.entities[ent.targetEntKey];
					// My target may have moved too far away
					if (Math.abs(targetEnt.loc.x - ent.loc.x) > 200) {
						ent.targetEntKey = "";
					}
					if (ent.isSneaking) {
					
						// *** Utilize the ent's stealth skill
						
						ent.targetEntKet = "";
					}
				}					
				// I have no target. Just rest, wander, do my job.
				if (ent.targetEntKey == "") {
					// If I'm far from home, let's go back
					if (Math.abs(ent.loc.x - ent.baseLoc.x) > 300) {
						ent.targetLoc.x = ent.baseLoc.x;
						ent.targetLoc.y = ent.baseLoc.y;
					} else {
						// From where I am...
						ent.targetLoc.x = ent.loc.x;
						ent.targetLoc.y = ent.loc.y;
						// ...Maybe let's wander...
						if (o.roll1d(2) == 1) {
							ent.targetLoc.x += o.roll1d(32) - o.roll1d(32);
						}						
					}

				} else { // I have a target; I should move to it.					
					targetEnt = o.game.entities[ent.targetEntKey];
					ent.targetLoc.x = targetEnt.loc.x;
					ent.targetLoc.y = targetEnt.loc.y;				
				}
				// All that thinking tired out my brain
				ent.brainCooldown = 20;
			}
		});
	}


	this.movementRound = function ()
	{
		var o = this;
		o.loopOverEntities("nearbyNPCs", function(entKey, ent){
			ent.distanceFromPC = Math.abs(ent.loc.x - o.game.pc.loc.x);
			if (ent.isAlive) {
				var distX = Math.abs(ent.targetLoc.x - ent.loc.x);
				if (distX < 10) {
					// I'm at my target location
					o.stopEntity(ent);
				} else { // I'm not at my target location, so keep going
					var moveSpeed = ent.aggro + 0.5;
					var direction = (ent.targetLoc.x < ent.loc.x) ? -1 : 1;
					o.moveEntity(ent, moveSpeed, direction);
				}
			}
			o.animateEntityWalking(ent);
		});
		o.animateEntityWalking(o.game.pc);
	}
	
	this.animateEntityWalking = function (ent) 
	{
		if (ent.walkingVel.x == 0) {
			ent.walkingFrame = 0;
		} else {
			if ((this.loopIteration % 2) == 0) {
				var isWalkingRight = (ent.walkingVel.x > 0);
				ent.walkingFacing 	= isWalkingRight ? "right" : "left";
				ent.facing 			= ent.walkingFacing;
				ent.walkingFrame += 1;
				if (ent.walkingFrame > 8) ent.walkingFrame = 1;
			}
		}
	}
	

	this.isEntityFriendly = function (ent) {
		return (ent.aggro <= 0);
	}
	
	this.attackRound = function () 
	{
		var o = this;	
		// Loop over potential attacker entities	
		o.loopOverEntities("nearbyNPCs", function(entKey, ent){
			// Only alive, aggressive ents that can do an action
			if (ent.isAlive && ent.aggro > 0 ) {
				// *** if melee range ?
				
				if (ent.facing == "right" && ent.rightActionCooldown <= 0) {	
					o.attack(entKey, 1);
				} else if (ent.facing == "left" && ent.leftActionCooldown <= 0) {
					o.attack(entKey, -1);
				}
			}
		});
	}
	
	this.attack = function (entKey, direction) 
	{
		var ent = this.game.entities[entKey];
		ent.aggro += 7;
		var blastLoc = {
			"x" : ent.loc.x
			,"y" : (ent.loc.y + ent.halfSize.y)
		};
		if (direction > 0) {	// RIGHT
			if (ent.rightActionCooldown > 0) return false;
			blastLoc.x += ent.halfSize.x;
			ent.rightActionCooldown = 100;
			
		} else {				// LEFT
			if (ent.leftActionCooldown > 0) return false;
			blastLoc.x -= ent.halfSize.x;
			ent.leftActionCooldown = 100;
			
		}
		ent.stamina -= 12 + this.roll1d(20);
		
		var damage = 14;
		var impact = 4;
		if (ent.isSneaking) {
			damage = damage * 2;
			impact = impact * 2;
			ent.isSneaking = false;
		}
		if (ent.stamina < 0) {
			damage = damage / 2;
			impact = impact / 2;
		}
		this.blasts.push({
			"loc" : { "x" : blastLoc.x, "y" : blastLoc.y }
			,"radius" : 10
			,"damage" : damage
			,"impact" : impact
			,"immuneEntKey" : entKey
		});
		this.addParticles(5, blastLoc, "steel");
		return true;
	}
	
	this.damageRound = function ()
	{
		var numOfEntities = this.entArrays.nearby.length;
		var b = 0;
		var i = 0;
		var blast = {};
		var entKey = "";
		var ent = {};
		var xDiff = 0;
		var yDiff = 0;
		var knockbackVel = {}; 
		// Loop through all blasts and then all entities nearby
		for (b = 0; b < this.blasts.length; b++) {
			blast = this.blasts[b];
			for (i = 0; i < numOfEntities; i++) {
				entKey = this.entArrays.nearby[i];
				// If the entity isn't immune to the blast
				if (entKey != blast.immuneEntKey) {
					ent = this.game.entities[entKey];
					xDiff = Math.abs(ent.loc.x - blast.loc.x);
					if (xDiff < (ent.halfSize.x + blast.radius)) {
						yDiff = Math.abs(ent.loc.x - blast.loc.x);
						if (yDiff < (ent.halfSize.y + blast.radius)) {
							this.damageEntity(ent, blast.damage); 
							knockbackVel = {
								"x" : (blast.impact * ((ent.loc.x < blast.loc.x) ? -1 : 1))
								,"y" : blast.impact
							};
							this.knockbackEntity(ent, knockbackVel);
						}
					}
				}
			}
			// Remove blast from existance
			b--;
			this.blasts.splice(b, 1);
		}
	}

	
	this.damageEntity = function (ent, damage)
	{
		var particleNum = (damage / 2) + 2;
		var bloodLoc = { "x" : ent.loc.x, "y" : ent.loc.y };
		ent.aggro += 20;
		ent.health -= damage;
		ent.healingCooldown = 1000;
		if (ent.health < 0) {
			ent.isAlive = false;
			// *** animation or something
			particleNum = 30;
		}
		this.addParticles(particleNum, bloodLoc, "blood");
	}
	
	this.cooldownRound = function () 
	{
		var o = this;	
		// Loop over entities	
		o.loopOverEntities("nearby", function(entKey, ent){		
			if (ent.isAlive) {
				if (ent.leftActionCooldown > 0) {
					ent.leftActionCooldown -= 1;
				}
				if (ent.rightActionCooldown > 0) {
					ent.rightActionCooldown -= 1;
				}				
				// If we're not doing actions, then we can being to cool down
				if ((ent.leftActionCooldown + ent.rightActionCooldown) <= 0)
				{
					if (ent.brainCooldown > 0) {
						ent.brainCooldown -= 1;
					}
					if (ent.magicka <= ent.maxMagicka) {
						ent.magicka += 0.1;
					}
					if (ent.stamina <= ent.maxStamina) {
						ent.stamina += 0.1;
					}
					// Cool down aggro
					if (ent.aggro > 0 && !ent.isHostile) {
						ent.aggro -= 1;
					} else if (ent.aggro > 1 && ent.isHostile) {
						// ^ a hostile entity can never go below 1 aggro
						ent.aggro -= 1;
					}
					if (ent.healingCooldown > 0) {
						ent.healingCooldown -= 1;
					} else {					
						if (ent.stamina > 50) {
							if (ent.health <= ent.maxHealth) {
								ent.health += 0.05;
							}
						}
					}
				}
				if (ent.magicka < 0) 					ent.magicka = 0;
				else if (ent.magicka > ent.maxMagicka) 	ent.magicka = ent.maxMagicka;
				if (ent.stamina < 0) 					ent.stamina = 0;
				else if (ent.stamina > ent.maxStamina) 	ent.stamina = ent.maxStamina;
				if (ent.health < 0) 					ent.health = 0;
				else if (ent.health > ent.maxHealth) 	ent.health = ent.maxHealth;
			}
		});
	}	
	
	this.toggleEntitySneaking = function (ent) 
	{
		ent.isSneaking = !ent.isSneaking;
	}

	this.interactWithEntity = function (entKey)
	{
		var o = this;
		var ent = o.game.entities[entKey];
		if (entKey == "PC") {
			o.togglePause(true);
				$('#characterMenu').fadeIn(100);
		} else if (ent.type == "exit") {
			if (o.selectedEntityKey == entKey) {
				//=== Zone Warp / Travel
				o.blackOutAndIn();
				
				var newZone = o.zones[ent.exit.zoneKey];
				var arrivalX = 0;
				// Look through the new zone's exits
				for (var i = 0; i < newZone.exits.length; i++) {
					if (newZone.exits[i].zoneKey == o.game.currentZoneKey) {
						arrivalX = newZone.exits[i].x;
					}
				}
				o.game.pc.loc.x = arrivalX;
				o.loadZone(ent.exit.zoneKey);
				o.selectedEntityKey = "";
			} else {
				o.selectedEntityKey = entKey;
				var zoneName = o.zones[ent.exit.zoneKey].name;
				o.addTip("This way leads to " + zoneName + ". (Tap signpost again to travel.)", 2000);
			}
		} else if (ent.type == "npc") {
			o.selectedEntityKey = entKey;
			var like = ent.likes[(o.roll1d(ent.likes.length) - 1)];
			o.addTip("This is " + ent.name + " the " + ent.race + ". He likes " + like + ".", 2000);
			
		} else {
			o.selectedEntityKey = entKey;
		}
	}
	
	
	
	
	
	
	
//===================== Menus, Interface Interactions =========================

	this.getEntityByIndex = function (i, arr) {
		if (typeof arr === 'undefined') arr = this.entArrays.nearby;
		return this.game.entities[arr[i]];
	}
	
	this.loopOverEntities = function (arrName, callback) 
	{
		var arr = this.entArrays[arrName];
		var arrLen = arr.length;
		var entKey = "";
		var ent = {};
		var i = 0;
		for (i = 0; i < arrLen; i++) {
			entKey = arr[i];
			ent = this.game.entities[entKey];
			var rtn = callback(entKey, ent);
			//console.log(rtn);
		}
	}
	
	this.addTip = function (text, expireTime) 
	{
		var $tip = $('<div>' + text + '</div>');
		if (typeof expireTime === 'number') {
			var tipTimerId = setTimeout(function(){
				$tip.fadeOut(1000, function(){
					$tip.remove();
				});
			}, expireTime);
		}
		this.$tips.append( $tip );
	}
	
	this.addNotification = function (text) 
	{
		var $n = '<div>' + text + '</div>';
		this.$notifications.append( $n );
	}	


	this.openMenu = function (menuName) {
		var o = this;
		o.togglePause(true);
		$('#' + menuName + 'Menu').fadeIn(100);	
		o.playersLastZoomScale = o.zoomScale;
		o.zoomScale += 0.5;
		if (menuName == "npc") {
			o.zoomScale += 1;
		} else if (menuName == "creation") {
			var list = "";
			for (var r = 0; r < o.availableRaces.length; r++) {
				list += '<li><input type="radio" name="race" '
					+ ' value="' + o.availableRaces[r].raceSkin + '" '
					+ '	id="race' + r + '" ';
				if (r == 0) { list += ' checked="checked" '; }
				list += ' /><label for="race' + r + '">' 
					+ o.availableRaces[r].displayName 
					+ '</label></li>';
			}
			for (var r = 0; r < o.unavailableRaces.length; r++) {
				list += '<li class="NA">(N/A) ' + o.unavailableRaces[r].displayName + '</li>';
			}
			$('.raceList').html(list);
		}
		o.redraw();
	}
	
	this.closeAllMenus = function (unPauseAfter) 
	{
		var o = this;
		if (typeof unPauseAfter === 'undefined') unPauseAfter = true;
		o.zoomScale = o.playersLastZoomScale;
		$('.menu').fadeOut(400, function(){
			if (o.hasGameStarted) {
				o.redraw();
				if (unPauseAfter) o.togglePause(false);
			} else {
				o.openMenu("begin");
			}
		});	

	}
	



	
//=======ZZZZZZZ=========== ZONES ===============ZZZZZZZZZZZZZZZZZZZZZZ====

	this.loadZone = function (zoneKey)
	{
		var zone = this.zones[zoneKey];
		var entKey = "";
		var ent = {};
		var newEnt = {};
		var attributeName = "";
		var subAttributeName = "";
		var exit = {};
		
		console.log("Loading Zone " + zoneKey, zone);
		// Clear zone entities...
		this.game.entities = {};
		this.entArrays.all = [];
		this.entArrays.nearby = [];
		this.entArrays.nearbyStatic = [];
		this.entArrays.physics = [];		
		
		// Add PC
		this.game.entities["PC"] = this.game.pc;
		this.entArrays.all.push("PC");
		this.entArrays.physics.push("PC");
		
		// Create Tree Entities
		for (var t = 0; t < zone.treeArray.length; t++) {
			entKey = "T" + t;
			this.game.entities[entKey] = new SREntityClass("tree");
			newEnt = this.game.entities[entKey];
			newEnt.loc.x = zone.treeArray[t];
			newEnt.imageName = "tree" + this.roll1d(2);
			
			// Add new ent key to arrays
			this.entArrays.all.push(entKey);
			this.entArrays.nearbyStatic.push(entKey);			
		}
		
		// Loop through zone's entities and merge them with the default 
		for (entKey in zone.entities) {
			ent = zone.entities[entKey];
			// Make new entity in game...
			this.game.entities[entKey] = new SREntityClass(ent.type);
			newEnt = this.game.entities[entKey];

			// Loop through all attributes in the default (new) entity
			for (attributeName in newEnt) {
				if (typeof ent[attributeName] !== 'undefined') {
					//console.log("Found attribute " + attributeName + " in zone's entity " + entKey);
					// newEnt[attributeName] = this.cloneDataObject(ent[attributeName]);
					//console.log(typeof ent[attributeName]);
					
					// If it's an object, let's go down one more level to do the copy
					if (typeof ent[attributeName] === "object") {
						console.log("Copying subattributes");
						for (subAttributeName in ent[attributeName]) {
							newEnt[attributeName][subAttributeName] = this.cloneDataObject(ent[attributeName][subAttributeName]);
						}
					} else {
						newEnt[attributeName] = ent[attributeName];
					}
				}
			}
			newEnt.halfSize.x = newEnt.size.x / 2;
			newEnt.halfSize.y = newEnt.size.y / 2;
			newEnt.baseLoc.x = newEnt.loc.x;
			newEnt.baseLoc.y = newEnt.loc.y;
			//ent.radius = Math.max(ent.size.x, ent.size.y);
			
			newEnt.shirtName = "shirt" + this.roll1d(7);
			
			// Add new ent key to arrays
			this.entArrays.all.push(entKey);
			if (newEnt.isPhysics) {
				this.entArrays.physics.push(entKey);
			} else {
				this.entArrays.nearbyStatic.push(entKey);
			}
			
		}
		
		if (zone.dangerLevel > 0) {
			var numOfBandits = this.roll1d(10) * zone.dangerLevel + 1;
			var banditShirtName = "shirt" + this.roll1d(7);
			for (var b = 0; b < numOfBandits; b++) {
				entKey = "B" + b;
				// Make new bandits
				this.game.entities[entKey] = new SREntityClass("npc");
				newEnt = this.game.entities[entKey];
				newEnt.faction = "bandit";
				newEnt.isHostile = true;
				newEnt.aggro = 1;
				newEnt.race = this.availableRaces[ this.roll1d(this.availableRaces.length) - 1 ].raceSkin;
				newEnt.loc.x = this.roll1d( zone.rightEdgeX );
				newEnt.shirtName = banditShirtName;
				newEnt.likes[0] = this.allLikes[(this.roll1d(this.allLikes.length) - 1)];
				this.entArrays.physics.push(entKey);
			}
		}
		
		
		// Create signpost entities
		for (var s = 0; s < zone.exits.length; s++) {
			exit = zone.exits[s];
			entKey = "X" + s;
			this.game.entities[entKey] = new SREntityClass("exit");
			newEnt = this.game.entities[entKey];
			newEnt.loc.x = exit.x;
			newEnt.exit = this.cloneDataObject(exit);
			if (exit.x > (zone.rightEdgeX * 0.9)) {
				newEnt.imageName = "signpost_right";
			} else if (exit.x < (zone.rightEdgeX * 0.1)) {
				newEnt.imageName = "signpost_left";
			} else {
				newEnt.imageName = "signpost_three";
			}
			
			// Add new ent key to arrays
			this.entArrays.all.push(entKey);
			this.entArrays.nearbyStatic.push(entKey);
		}
		
		this.game.currentZoneKey = zoneKey;
		this.setNearbyEntities();
		if (zoneKey == "WHITERUN") {
			this.addTip("The city is under construction!");
		}
		this.addTip("Welcome to " + zone.name + ".", 2500); 
		
	}
	
	this.setNearbyEntities = function () 
	{
		// *** Make this more advanced 
		
		this.entArrays.nearby = this.cloneDataObject(this.entArrays.physics);
		this.entArrays.nearbyNPCs = this.cloneDataObject(this.entArrays.nearby);
		this.entArrays.nearbyNPCs.splice(0, 1);
	
	}

	
	
	
	
//=======SSSSSSS=========== SETUP ===============SSSSSSSSSSSSSSSSSSSSSS====

	this.setup = function()
	{
		var o = this;
		this.dataDelivery.deliver("game_data.json", function(){
			// Continue with setup after data is loaded...
			o.loadImages(refData.images);
			o.setupCanvas();
			o.setupEvents();
			o.zones = refData.zones;
			o.availableRaces = refData.availableRaces;
			o.unavailableRaces = refData.unavailableRaces;
			o.allLikes = refData.allLikes;			
			console.log("Load zone");
			o.loadZone("SOUTH");
			
			// Find DOM elements
			o.magickaElt = document.getElementById('magicka');
			o.staminaElt = document.getElementById('stamina');
			o.healthElt	= document.getElementById('health');		
			o.targetHealthElt	= $('#target .health')[0];
			o.$interface	= $('#interface');
			
			
			// *** Start screen
			
			o.whenImagesLoaded(0, function(){
				//o.launchGame(true);
				o.openMenu("begin");
			});
			
			
		});
	}
	
	this.loadImages = function (imagesRefObj) 
	{
		
		this.imagesCount = 0;
		this.imagesLoadedCount = 0;
		var o = this;
		for (v in imagesRefObj) {
			o.imagesCount++;
			o.images[v] = new Image();
			o.images[v].src = 'images/' + imagesRefObj[v];
			o.images[v].onload = function () {
				o.imagesLoadedCount++;
			}
		}
		console.log("Loading " + o.imagesCount + " images. (" + o.imagesLoadedCount + " done so far.)");
		
		// *** Do some loop to wait for images to load	
	}
	
	this.whenImagesLoaded = function (loadCounter, callback)
	{
		if (this.imagesLoadedCount == this.imagesCount) {
			console.log("All " + this.imagesCount + " images loaded.");
			callback();
			//return true;
		} else if (loadCounter > 100) {
			console.error("Could not load images.");
			alert("ERROR - Could not load images.");
		} else {
			var o = this;
			loadCounter++;
			window.setTimeout(function(){
				o.whenImagesLoaded(loadCounter, callback);
			}, 200);
			//return false;
		}
	
	}
	
	this.setupCanvas = function () {
		this.canvasElt.setAttribute('width', this.dim.x * this.canvasScale);
		this.canvasElt.setAttribute('height', this.dim.y * this.canvasScale);

		this.ctx.imageSmoothingEnabled = false; // http://stackoverflow.com/questions/18547042/resizing-a-canvas-image-without-blurring-it
		this.ctx.save();
		this.ctx.scale(this.canvasScale,this.canvasScale);
	}
	
	this.setupEvents = function() {
		var o = this;
		o.$tips = $('#tips');
		o.$notifications = $('#notifications');
		o.$background = $('#canvasContainer');
		var $doc = $(document);
		var $canvas = $(this.canvasElt);
		var $beginMenuList = $('#beginMenuList');
		var $startMenu = $('#startMenu');
		
		
		//==== Menus

		
		$beginMenuList.find('a.switchStart').click(function(e){
			$beginMenuList.removeClass("start");
			e.preventDefault();
		});
		
		$beginMenuList.find('.openNew').click(function(e){	
			o.openMenu("creation");
		});
		
		$('.openLaunch').click(function(e){
			o.launchGame(false);
			
		});
		
		$('.openCredits').click(function(e){
			o.openMenu("credits");
			e.preventDefault();
		});
		
		$('.openQuit').click(function(e){
			window.location.reload();
		});
		
		$('.openFuture, .NA').click(function(e){
			o.openMenu("future");
		});
		
		o.$tips.on("click", "div", function(e){
			var $target = $(e.target);
			$target.fadeOut(200).slideUp(400);
		});
		
		//==== Interactivity
		
		$('.left').on("mousedown touchstart", function(e){
			o.moveEntity(o.game.pc, 10, -1);
			console.log("Left down");
		}).on("mouseup mouseout touchend", function(e){
			console.log("Left up - Stop");
			o.stopEntity(o.game.pc);
		});
		$('.right').on("mousedown touchstart", function(e){
			o.moveEntity(o.game.pc, 10, 1);
			console.log("Right down");
		}).on("mouseup mouseout touchend", function(e){
			console.log("Right up - Stop");
			o.stopEntity(o.game.pc);
		});
		
		$('.rightHand').click(function(e){
			o.attack("PC", 1);
		});
		$('.leftHand').click(function(e){
			o.attack("PC", -1);
		});
		$('.sneak').click(function(e){
			o.toggleEntitySneaking(o.game.pc);
		});
		
		$('#startButton').click(function(e){
			o.openMenu("start");
		});
		
		$('.resume').click(function(e){
			o.closeAllMenus();
		});
		
		$('.selectedAction').click(function(e){
			if (o.selectedEntityKey == "") {
				o.openMenu("character");
			} else {
				var ent = o.game.entities[o.selectedEntityKey];
				if (o.isEntityFriendly(ent)) {
					o.openMenu("npc");
				}
			}
		});
		
		$canvas.click(function(e){
			var canvasOffset = $canvas.offset();
			//console.log("\nClick\ne.clientX " + e.clientX + ", Y " + e.clientY);
			//console.log("document.body.scroll Left " + document.body.scrollLeft + ", Top " + document.body.scrollTop);
			//console.log("document.documentElement.scrollLeft " + document.documentElement.scrollLeft + " Top " + document.documentElement.scrollTop);
			//console.log("canvasOffset left " + canvasOffset.left + " top " + canvasOffset.top);
			var clickCoords = { "x" : 0, "y" : 0 };
			clickCoords.x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - Math.floor(canvasOffset.left);
			clickCoords.y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop - Math.floor(canvasOffset.top) + 1;
			//console.log("Final click coords = ", clickCoords);
			var zoneCoords = o.getZoneCoords(clickCoords);
			//console.log("Final click coords in zone = ", zoneCoords);
			var entKey = o.getEntityKeyAtZoneCoords(zoneCoords);
			
			if (entKey == "") {
				o.selectedEntityKey = "";
			} else {
				console.log("Clicked on " + entKey);
				o.interactWithEntity(entKey);
			}
			//o.addParticles(2, zoneCoords);
		});
		
		$doc.keydown(function(e){
			//console.log("Key down - " + e.which);
			switch(e.which) {
				case 65:	// "a"
				case 37:	// Left
					o.moveEntity(o.game.pc,10,-1);
					//$('.left').addClass("activated");
				break;
				case 87:	// "e"
				case 38:	// Up Arrow
					o.jumpEnt(o.game.pc, 4); 
					//console.log("Up");
					//o.moveCharacter({ x : 0, y : 0 });
				break;
				case 68:	// "d"
				case 39:	// Right
					o.moveEntity(o.game.pc,10,1);
				break;
				case 40:
					//console.log("Down");
					//o.moveCharacter({ x : 0, y : 0 });
				break;
				case 16:	// Shift
				break;
				case 32:	// Space
					//$('.btn-SPACE').addClass("activated");
				break;
				case 69:	// "e"
					//$('.btn-E').addClass("activated");
				break;
				case 27:	// ESC
					//$('.btn-ESC').addClass("activated");
				break;


				default: return; // allow other keys to be handled
			}

			// prevent default action (eg. page moving up/down)
			// but consider accessibility (eg. user may want to use keys to choose a radio button)
			e.preventDefault();	
			
		}).keyup(function(e){
			console.log("Key up - " + e.which);
			switch(e.which) {
				case 65:	// "a"
				case 37:	// Left
					o.stopEntity(o.game.pc);
					//o.isMovingLeft = false;
					//$('.btn-A').removeClass("activated");
				break;
				case 38:	// Up
				break;
				case 68:	// "d"
				case 39:	// Right
					o.stopEntity(o.game.pc);
					//o.isMovingRight = false;
					//$('.btn-D').removeClass("activated");
				break;
				case 83:	// "s"
				case 40:	// Down
					o.toggleEntitySneaking(o.game.pc);
				break;
				case 16:	// Shift
					
				break;
				case 32:	// Space
					o.jumpEnt(o.game.pc, 4);
					//o.activateReadiedInventoryItem();
					//$('.btn-SPACE').removeClass("activated");
				break;
				case 67:	// "c"
					// Crafting
				break;
				case 69:	// "e"
					o.attack("PC", 1);
					//o.activateTalk(0);
					//$('.btn-E').removeClass("activated");
				break;
				case 88:	// "x"
					// ?
				break;	
				case 81:	// "q"
					o.attack("PC", -1);
				break;
				case 90:	// "z"
					// ?
				break;
				case 27:	// ESC
					o.openMenu("start");
					//$('.btn-ESC').removeClass("activated");
				break;					
				case 49:	// 1
				case 50:	// 2
				case 51:	// 3
				case 52:	// 4
				case 53:	// 5
				case 54:	// 6
				case 55:	// 7
				case 56:	// 8
				case 57:	// 9
					//o.readyInventoryItem(e.which - 49);
				break;
				case 80:	// "p"
					o.togglePause();
				break;				
				case 109:	// - (numeric)
				case 189:	// -
					o.zoomOut();
				break;
				case 221:	// ]
					o.alterCanvasSize( 40 );
				break;
				case 219:	// [
					o.alterCanvasSize( -40 );
				break;
				case 107:	// + (numeric)
				case 187:	// = (+ with shift)
					o.zoomIn();
				break;
				default: return; // allow other keys to be handled
			}
			// prevent default action (eg. page moving up/down)
			// but consider accessibility (eg. user may want to use keys to choose a radio button)
			e.preventDefault();		
		});	
	}
	
	this.launchGame = function (quickStart) 
	{
		var o = this;
		if (typeof quickStart !== 'boolean') quickStart = false;
		var fadeInTime = (quickStart) ? 50 : 2000;
		// Official start of the game!
		o.hasGameStarted = true;
		o.game.pc.loc.x = 500;
		
		// Set Race
		if (quickStart) o.game.pc.race = "redguard";
		else {
			o.game.pc.race = $('#creationMenu').find("input:radio[name='race']:checked").val();
		}
		//	$('.faceStatus').css("background", "url('images/" + o.game.pc.race + "/" + o.game.pc.race + "_head_right.png')");
		
		
		o.closeAllMenus(false);
		$('header').fadeIn(fadeInTime);
		this.$interface.fadeIn(fadeInTime, function(){	
			
			o.zoomScale 			= 2.0;
			o.playersLastZoomScale 	= 2.0;
			// Draw it to start
			o.redraw();
			o.blackIn();
			o.isLooping = true;
			o.loop();
			o.addTip("Try moving around and trying out combat. Good luck on your adventure!");
			o.addTip("This zone has exits at the left and right edges. Tap on the signposts to switch zones.");
			o.addTip("The start button at the top right brings up the start menu ('Esc' on keyboard).");
			o.addTip("Keyboard users may use 'a', 'd' or arrows to move and 'q' and 'e' for actions.");
			o.addTip("The buttons in the middle will bring up the character menu and put you into sneak mode.");
			o.addTip("You may use whatever is in your hands by clicking the appropriate left and right buttons.");
			o.addTip("To move around the world of Skyray, use the left and right arrow buttons at the bottom.");
			o.addTip("Welcome to Primeval Codex: Skyray. This is a tip. You can dismiss tips by tapping on them.");
		});	
	}

	//========================================= Helper Functions

	this.roll1d = function (sides) {
		return (Math.floor(Math.random()*sides) + 1);
	}
	
	this.cloneDataObject = function (o) {
		return JSON.parse(JSON.stringify(o));
	}
	
	this.getRandomTreeArray = function (n) {
		var numberOfTrees = 5 + this.roll1d(15);
		var treeArray = [];
		for (var i = 0; i < numberOfTrees; i++) {
			treeArray.push( this.roll1d(n) );
		}
		console.log(JSON.stringify(treeArray));
	}

	//=///======================================== Construction ==\\\\\========
	this.construction = function () {
		
		if (!window.localStorage) {
			alert("This browser does not support localStorage, so this app will not run properly. Please try another browser, such as the most current version of Google Chrome.");
		}
		if (!window.jQuery) { alert("ERROR - jQuery is not loaded!"); }
	}
	this.construction();


}