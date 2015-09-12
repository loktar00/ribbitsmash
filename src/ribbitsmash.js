var canvas = document.querySelector('canvas'),
    ctx = canvas.getContext('2d'),
    WIDTH = 800,
    HEIGHT = 600;

canvas.width = WIDTH;
canvas.height = HEIGHT;

/* random util */
function randomRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* util for templ canvas */
function createTempCanvas(width, height) {
    var tempCanvas = document.createElement('canvas'),
        tCtx = tempCanvas.getContext('2d');

    tempCanvas.width = width;
    tempCanvas.height = height;

    return { canvas : tempCanvas, ctx : tCtx };
}

function getDistance(a, b){
    var ax = a.x + a.width / 2,
        ay = a.y + a.height / 2,
        bx = b.x + b.width / 2,
        by = b.y + b.height / 2;

    return Math.sqrt((bx - ax) *(bx - ax) + (by - ay) * (by - ay));
}

/**  Renderer **/
var Renderer = function() {
    this.list = [];
}

Renderer.prototype = {
    render: function() {
        var id = this.list.length;

        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // Sort the display order, backgrounds are always on the bottom
        this.list.sort(function(a,b){
            if(a.bg && b.bg){
                return b.bgIndex - a.bgIndex;
            }else if(a.bg){
                return 1;
            }else if(b.bg){
                return -1;
            }else if(a.z && b.z){
                return b.z - a.z;
            }
            return 0;
        });

        while(id--){
            this.list[id].render();
        }
    },
    add: function(item) {
        this.list.push(item);
    },
    remove: function(item) {
        var list = this.list,
            itemIdx = list.indexOf(item);

        if(itemIdx !== -1){
            list.splice(list.indexOf(item), 1);
        }
    }
};

/** SPRITE **/

var Sprite = function(options) {
    options = options || {};
    this.width = options.width || 0;
    this.height = options.height || 0;
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.z = options.z || 0;
    this.color = options.color || {r : 0, g : 0, b : 0, a : 1};
    this.shape = options.shape || false;
    this.img = options.img;

    this.live = true;
}

Sprite.prototype = {
    update: function() {},
    render: function() {
        var color = this.color;
        ctx.save();
        ctx.fillStyle = "rgba(" + color.r + "," + color.g + "," + color.b + "," + color.a + ")";
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.restore();
    }
}


/** Emitter **/

var Emitter = function(options) {
    this.live = true;
    // Timing specifics
    this.lastUpdate = Date.now();
    this.startTime =  Date.now();

    options = options || {};
    this.color = options.color || {r: 0, g: 0, b: 0, a: 0};
    this.width = options.width || WIDTH;
    this.height = options.height || WIDTH;
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.z = options.z || 0;

    this.rate = options.rate || 1;
    this.duration = options.duration || 70;
    this.thrustRange = options.thrustRange || {min: 0, max: 2};
    this.angleRange = options.angleRange || {max: 360};
    this.particles = [];
};

Emitter.prototype = {
    kill: function() {
        var parts = this.particles.length;
        this.particles = [];
    },
    update: function() {
        this.lastUpdate = Date.now();
        if (this.lastUpdate >= 1000 / this.rate) {
            if (this.lastUpdate - this.startTime < this.duration) {
                rate = this.rate;

                while(rate--) {
                    var thrust = randomRange(this.thrustRange.min, this.thrustRange.max),
                        angle = randomRange(0, this.angleRange.max),
                        curParticle = new Particle({
                            x: this.x,
                            y: this.y,
                            z: 1, 
                            thrust: thrust,
                            angle: angle,
                            color: this.color,
                            size: randomRange(2, 6)
                        });

                    this.particles.push(curParticle);

                    // this is terrible.
                    RibbitSmash.add(curParticle);
                }
            } else {
                this.kill();
            }
        }
    }
};

/** Particle **/
var Particle = function(options) {
    Sprite.call(this, options);

    this.startLife = Date.now();
    this.curStep = 0;
    this.vel = {x : 0, y : 0};

    options = options || {};

    this.lifeTime = (options.lifeTime !== undefined) ? options.lifeTime : 100;

    this.size = options.size || 6;
    this.width = this.height = this.size;

    this.thrust = options.thrust || 0;
    this.gravity = options.gravity || 0;

    this.angle = options.angle || 0;

    this.endLife = this.startLife + this.lifeTime;
};

Particle.prototype = new Sprite();

Particle.prototype.update = function() {
    this.curStep =  this.endLife - Date.now();

    this.vel.x = Math.cos(this.angle *  Math.PI / 180) * this.thrust;
    this.vel.y = (Math.sin(this.angle *  Math.PI / 180) * this.thrust) + this.gravity * (this.lifeTime - this.curStep);

    this.x += this.vel.x;
    this.y += this.vel.y;

    if(this.y < 0 || this.y > HEIGHT ||
        this.x < 0 || this.x > WIDTH
        || Date.now() > this.endLife) {
        this.live = false;

        //  last render to the world for left behind blood.
        this.render(true);
    }
};

Particle.prototype.render = function(static){
    var tempCanvas,
        particleCtx = ctx,
        x = this.x,
        y = this.y;

    if(static) {
        tempCanvas = createTempCanvas(this.width, this.height);
        particleCtx = tempCanvas.ctx;
        x = 0;
        y = 0;
    }

    var scale = this.scale || {x:0, y:0};
    particleCtx.fillStyle = "rgba(" + this.color.r + "," + this.color.g + "," + this.color.b + "," + this.color.a + ")";
    particleCtx.fillRect(x, y, this.width - scale.x, this.height - scale.y); 

    if(static) {
        gameMap.battleDamage(tempCanvas.canvas, this.x, this.y);
    }
};

/** Map**/

function Map(options) {
    Sprite.call(this, options);

    this.bg = true;
    this.bgIndex = 1;

    this.x = 0;
    this.y = 0;

    this.width = WIDTH;
    this.height = HEIGHT;

    // Create the background 
    var tempCanvas = createTempCanvas(this.width, this.height);
    this.canvas = tempCanvas.canvas;
    this.ctx = tempCanvas.ctx;

    this.ctx.fillStyle = "rgb(100,100,100)";
    this.ctx.fillRect(this.x, this.y, this.width, this.height);

    // water
    this.ctx.fillStyle  = "#009dd1";
    this.ctx.fillRect(this.width - 50, 0, 50, this.height);

    // grass
    this.ctx.fillStyle  = "#00d12c";
    this.ctx.fillRect(this.width - 70, 0, 20, this.height);
}

Map.prototype = new Sprite();

// Add stuff to our canvas image.
Map.prototype.battleDamage = function(img, x, y) {
    this.ctx.drawImage(img, x, y);
}

Map.prototype.render = function() {
    ctx.drawImage(this.canvas, 0, 0, this.width, this.height);
};

/** FROG **/

function Frog(options) {
    Sprite.call(this, options);

    this.x = options.x || 0;
    this.y = options.y || 10;
    this.z = 1;

    this.width = 20;
    this.height = 16;
    this.radius = 14;

    this.color = {r : 0, g : 255, b : 0, a : 1};
    this.shape = true;

    this.colId = 0;
    this.speed = (Math.random() * 0.5) + 0.5;
    this.jump = 0;
    this.jumpSpeed = (Math.random() * 0.08) + 0.04;
}

Frog.prototype = new Sprite();

Frog.prototype.hit = function() {
    this.live = false;

    // Create the background 
    var deathCanvas = createTempCanvas(this.width, this.height);

    deathCanvas.ctx.fillStyle = "rgb(10,120,0)";
    deathCanvas.ctx.fillRect(0, 0, this.width, this.height);
    gameMap.battleDamage(deathCanvas.canvas, this.x, this.y);

    RibbitSmash.add(new Emitter({
        color: {r: 250, g: 0, b: 0, a: 1},
        x: this.x,
        y: this.y
    }), true)
};

Frog.prototype.update = function(dt) {
    this.jump += this.jumpSpeed;
    if( Math.abs(Math.sin(this.jump)) === Math.sin(this.jump)) {
        this.x += this.speed + Math.sin(this.jump);
    }

    if(this.x > WIDTH) {
        this.x = -this.width;
    }
}

Frog.prototype.render = function(){
    // add shadows while jumping
    var shadowY = this.y,
        shadowX = this.x;

    if( Math.abs(Math.sin(this.jump)) === Math.sin(this.jump)) {
        shadowY = (this.y + (Math.sin(this.jump)*5));
        shadowX = (this.x - (Math.sin(this.jump)*5));
    }
    ctx.save();
    ctx.fillStyle = "rgba(50,50,50,0.3)";
    ctx.fillRect(shadowX, shadowY, this.width, this.height);
    ctx.restore();

    Sprite.prototype.render.call(this);
}

/** CAR **/

function Car(options) {
    options = options || {};
    Sprite.call(this, options);

    this.skidCanvas = createTempCanvas(WIDTH, HEIGHT);
    this.width = 60;
    this.height = 40;
    this.radius = 30;

    this.y = options.y || HEIGHT / 2;
    this.x = options.x || 50;
    this.z = 2;

    this.vel = { x : 0, y : 0 };
    this.acc = { x : 0, y : 0};

    this.angle = 180;
    this.turnSpeed = 1.5;
    this.thrust = 0.05;
    this.isThrusting = false;
    this.maxAcc = 3;

    this.colId = 1;
    this.color = {r : 255, g : 255, b : 255, a : 1};
    this.shape = true;
}

Car.prototype = new Sprite();

Car.prototype.hit = function() {
    // Do stuff when a car hits a frog.
};

Car.prototype.turn = function(dir){
    this.angle += this.turnSpeed * dir;
};

Car.prototype.drawSkids = function() {
    this.skidCanvas.ctx.clearRect(0, 0, WIDTH, HEIGHT);
    this.skidCanvas.ctx.save();
        this.skidCanvas.ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        this.skidCanvas.ctx.rotate(this.angle * Math.PI / 180);

        this.skidCanvas.ctx.fillStyle = 'rgba(10,10,10, 0.2)';

        this.skidCanvas.ctx.fillRect(this.height - 30, -28, 10, 8);
        this.skidCanvas.ctx.fillRect(this.height - 30, 20, 10, 8);

    this.skidCanvas.ctx.restore();
    gameMap.battleDamage(this.skidCanvas.canvas, 0, 0 );
}

Car.prototype.update = function() {
    var radians = this.angle * Math.PI / 180;

    if(this.y < 0) {
        this.y = 0;
        this.vel.y = -this.vel.y * 0.25;
    }

    if(this.y + this.height > HEIGHT) {
        this.y = HEIGHT - this.height;
        this.vel.y = -this.vel.y * 0.25;
    }

    if(this.x < 0) {
        this.x = 0;
        this.vel.x = -this.vel.x * 0.25;
    }

    // magic number.., 50 away from the edge is the water.
    if(this.x + this.width > WIDTH - 50) {
        this.x = WIDTH - this.width - 50;
        this.vel.x = -this.vel.x * 0.25;
    }

    this.isThrusting = false;

    if(RibbitSmash.getKey(87) || RibbitSmash.getKey(38) || RibbitSmash.getKey(83) || RibbitSmash.getKey(40)) {
        this.isThrusting = true;

        // up
        if(RibbitSmash.getKey(83) || RibbitSmash.getKey(40)) {
                this.acc.x = Math.cos(radians) * this.thrust;
                this.acc.y = Math.sin(radians) * this.thrust;
        }

        // down
        if(RibbitSmash.getKey(87) || RibbitSmash.getKey(38)) {
                this.acc.x = Math.cos(radians) * -this.thrust;
                this.acc.y = Math.sin(radians) * -this.thrust;
        }
    }

    // Left
    if(RibbitSmash.getKey(65) || RibbitSmash.getKey(37)) {
        this.turn(-1);
        this.vel.x *= 0.98;
        this.vel.y *= 0.98;
        if(this.isThrusting){
            this.drawSkids();
        }
    }

    // right
    if(RibbitSmash.getKey(68) || RibbitSmash.getKey(39)) {
        this.turn(1);
        this.vel.x *= 0.98;
        this.vel.y *= 0.98;
        if(this.isThrusting){
            this.drawSkids();
        }
    }

    // Friction
    if(!this.isThrusting) {
        this.acc.x = 0;
        this.acc.y = 0;
        this.vel.x *= 0.97;
        this.vel.y *= 0.97;
    }

    this.vel.x += this.acc.x;
    this.vel.y += this.acc.y;

    this.x += this.vel.x;
    this.y += this.vel.y;
}

Car.prototype.render = function() {
    var color = this.color;
    ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        ctx.rotate(this.angle * Math.PI / 180);

        ctx.fillStyle = "rgba(" + color.r + "," + color.g + "," + color.b + "," + color.a + ")";
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.fillStyle = 'rgb(30,30,30)';

        ctx.fillRect(-this.height + 20, -10, 15, 20);

        ctx.fillRect(this.height - 30, -28, 20, 8);
        ctx.fillRect(this.height - 30, 20, 20, 8);

        ctx.fillRect(-this.height + 10, -28, 20, 8);
        ctx.fillRect(-this.height + 10, 20, 20, 8);
    ctx.restore();
}

/** GAME SETUP **/

function Game() {
    this.states = {};
    this.curState = {};
    this.renderer = new Renderer();

    this.keys = [];
    document.addEventListener('keydown', function(event){ 
        this.keyDown(event);
    }.bind(this), false);

    document.addEventListener('keyup', function(event){
        this.keyUp(event);
    }.bind(this), false);


    this.addState('init');
    this.update();
}

Game.prototype = {
    add: function(ent, updateOnly) {
        this.curState.entities.push(ent);
        if (!updateOnly) {
            this.renderer.add(ent);
        }
    },
    remove: function(ent) {
        var entities = this.curState.entities,
            entLen = entities.length,
            entity = entities.indexOf(ent);

        if(entity.kill !== undefined){
            entity.kill();
        }

        entities.splice(entity, 1);

        this.renderer.remove(ent);
    },
    switchState: function(stateName) {
        this.curState = this.states[stateName];
    },
    addState: function(state) {
        this.states[state]  = {entities: []};
        this.switchState(state);
    },
    getKey: function(key) {
        return this.keys[key];
    },
    keyDown: function(event) {
       this.keys[event.keyCode] = true;
    },
    keyUp: function(event) {
        this.keys[event.keyCode] = false;
    },
    update: function() {
        var entities = this.curState.entities,
            entLen = entities.length;

        // Collision check.
        for(var i = 0; i < entLen; i++){
            if(entities[i].colId === undefined){
                continue;
            }

            var curEnt = entities[i];

            for(var j = i+1; j < entLen; j++){
                if(entities[j].colId === undefined){
                    continue;
                }

                var checkEnt = entities[j];

                // Only check for collisions if they have diff collision ids.
                if(curEnt.colId === checkEnt.colId){
                    continue;
                }

                var checkRadius = curEnt.radius + checkEnt.radius;

                if(getDistance(curEnt, checkEnt) < checkRadius){
                        curEnt.hit();
                        checkEnt.hit();
                }
            }
        }

        // Update entities
        while(entLen--){
            var ent = entities[entLen];
            if(ent){
                if(ent.live){
                    ent.update();
                }else{
                    this.remove(ent);
                }
            }
        }

        this.renderer.render();
        requestAnimationFrame(function(){this.update()}.bind(this));
    }
}

var RibbitSmash = new Game();

/** States **/

function menuState() {

}

function lostState() {

}

function gameState () {
    RibbitSmash.addState('Game');

    RibbitSmash.add(gameMap);
    for(var i = 0; i < 100; i ++) {
        RibbitSmash.add(new Frog({x : (Math.random() * -WIDTH) -300, y : randomRange(20, HEIGHT - 30)}));
    }

    RibbitSmash.add(new Car());
}

// global gamemap.. yay.
var gameMap = new Map();
gameState();