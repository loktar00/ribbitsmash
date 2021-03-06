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

    this.rate = options.rate || 2;
    this.duration = options.duration || 70;
    this.thrustRange = options.thrustRange || {min: 0, max: 6};
    this.angleRange = options.angleRange || {max: 360};
    this.particles = [];
    this.updateOnly = true;
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
    this.ctx.fillRect(this.width - 20, 0, 20, this.height);

    // grass
    this.ctx.fillStyle  = "#00d12c";
    this.ctx.fillRect(this.width - 70, 0, 50, this.height);

    // road lines
    this.ctx.fillStyle = "#d4d4d4";
    for(var y = 0; y < 5; y++) {
        for(var x = 1; x < 5; x++) {
            this.ctx.fillRect(x * 150, 30 + (y * 120), 3, 60);
        }
    }
}

Map.prototype = new Sprite();

// Add stuff to our canvas image.
Map.prototype.battleDamage = function(img, x, y) {
    this.ctx.drawImage(img, x, y);
}

Map.prototype.render = function() {
    ctx.drawImage(this.canvas, 0, 0, this.width, this.height);
};

/** Game UI **/
var GameUI = function(options) {
    options = options || {};
    Sprite.call(this, options);
    this.x = 0;
    this.y = 0;
    this.z = 100;
    this.width = WIDTH;
    this.height = 30;

    gameStartTime = Date.now();
    timeLimit = 60000 + Date.now();
}

GameUI.prototype = new Sprite();

GameUI.prototype.render = function() {
    ctx.textAlign = 'start';

    ctx.fillStyle = "#000042";
    ctx.fillRect(this.x, this.y, this.width, this.height);

    if(gameMode === 1) {
        drawText('Time : ' + ((Date.now() - gameStartTime) / 1000).toFixed(2), 3, 40, 8, '#fff');
        drawText('Escaped : ' + frogsSaved + '/' + maxSaved, 3, 600, 8, '#fff');

        if(frogsSaved >= maxSaved && gameMode === 1) {
            endTime = ((Date.now() - gameStartTime) / 1000).toFixed(2);
            arcadeAudio.play('lose');
            RibbitSmash.switchState('Lost');
        }
    } else if(gameMode === 2) {
        drawText('Time Left : ' + Math.abs((Date.now() - timeLimit) / 1000).toFixed(2), 3, 40, 8, '#fff');

        if(((Date.now() - timeLimit) / 1000).toFixed(2) >= 0 ) {
            RibbitSmash.switchState('Lost');
            endTime = ((Date.now() - gameStartTime) / 1000);
        }
    }
    drawText('Frogs Killed : ' + frogsKilled, 3, 300, 8, '#fff');
}

/** FROG SPAWNER **/

function FrogSpawner() {
    this.updateOnly = true;
    this.live = true;

    this.lastUpdate = Date.now();
    this.spawnFreq = 1400;
    this.spawnCount = 0;

    if(gameMode === 1) {
        this.spawnFreq = 1000;
        this.spawnCount = 0;
    } else {
        this.spawnFreq = 30;
    }
}

FrogSpawner.prototype.update = function() {
    if (Date.now() > this.lastUpdate + this.spawnFreq) {
        this.lastUpdate = Date.now();

        this.spawnCount++;
        RibbitSmash.add(new Frog({x : (Math.random() * -WIDTH), y : randomRange(45, HEIGHT - 30)}));

        if(gameMode === 1 || gameMode === 3) {
            if(this.spawnCount > 12) {
                this.spawnCount = 0;
                this.spawnFreq -= 100;
                if(this.spawnFreq < 200) {
                    this.spawnFreq = 200;
                }
            }
        }
    }
}

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
    this.speed = (Math.random() * 1.5) + 1.5;
    this.jump = 0;
    this.jumpSpeed = (Math.random() * 0.24) + 0.12;
}

Frog.prototype = new Sprite();

Frog.prototype.hit = function() {
    this.live = false;

    // Create the background 
    var deathCanvas = createTempCanvas(this.width, this.height);

    deathCanvas.ctx.fillStyle = "rgb(10,120,0)";
    deathCanvas.ctx.fillRect(0, 0, this.width, this.height);
    gameMap.battleDamage(deathCanvas.canvas, this.x, this.y);
    RibbitSmash.shake = randomRange(4, 6);

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
        this.live = false;
        frogsSaved++;

        if( gameMode === 1) {
            arcadeAudio.play('escaped');
        }
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
    this.x = options.x || WIDTH - 120;
    this.z = 2;

    this.vel = { x : 0, y : 0 };
    this.acc = { x : 0, y : 0};

    this.angle = 0;
    this.turnSpeed = 3;
    this.thrust = 0.32;
    this.isThrusting = false;
    this.maxAcc = 4.5;

    this.colId = 1;
    this.color = {r : 255, g : 255, b : 255, a : 1};
    this.shape = true;
}

Car.prototype = new Sprite();

Car.prototype.hit = function() {
    frogsKilled++;
    arcadeAudio.play('damage');
};

Car.prototype.turn = function(dir){
    this.angle += this.turnSpeed * dir;
};

Car.prototype.drawSkids = function() {
    arcadeAudio.play('screech');

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

    // Magic number. 40 is the height of the upper UI
    if(this.y < 40) {
        this.y = 40;
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

    // magic number.. 20 away from the edge is the water.
    if(this.x + this.width > WIDTH - 20) {
        this.x = WIDTH - this.width - 20;
        this.vel.x = -this.vel.x * 0.25;
    }

    this.isThrusting = false;

    if (RibbitSmash.getKey(87) || RibbitSmash.getKey(38) || RibbitSmash.getKey(83) || RibbitSmash.getKey(40)) {
        this.isThrusting = true;
        
        // up
        if(RibbitSmash.getKey(83) || RibbitSmash.getKey(40)) {
                this.acc.x = Math.cos(radians) * (this.thrust*0.4);
                this.acc.y = Math.sin(radians) * (this.thrust*0.4);
        }

        // down
        if(RibbitSmash.getKey(87) || RibbitSmash.getKey(38)) {
                this.acc.x = Math.cos(radians) * -((this.thrust));
                this.acc.y = Math.sin(radians) * -((this.thrust));
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
        this.vel.x *= 0.96;
        this.vel.y *= 0.96;
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

        ctx.fillStyle = "#fff";
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        ctx.fillStyle = '#9400f7';
        ctx.fillRect(-this.height + 20, -10, 15, 20);

        ctx.fillStyle = '#000';
        ctx.fillRect(this.height - 30, -28, 20, 8);
        ctx.fillRect(this.height - 30, 20, 20, 8);

        ctx.fillRect(-this.height + 10, -28, 20, 8);
        ctx.fillRect(-this.height + 10, 20, 20, 8);
    ctx.restore();
}

/** MENU stuff **/
var Menu = function(options) {
    options = options || {};
    Sprite.call(this, options);
    this.x = 0;
    this.y = 0;
    this.bg = 1;
    this.width = WIDTH;
    this.height = HEIGHT;

    // Main song, thanks @phenominal!
    var ac = AudioContext ? new AudioContext() : new webkitAudioContext(),
        when = ac.currentTime,
        tempo = 132,
        lead = ['F#4 e','G#4 e','A#4 e','B4  e','C#5 e','D#5 e','D#5 e','G#4 e','G#4 e', 'A#4 e', 'A#4 e', 'B4  e', 'B4  q', '-   q',
        'G#4 e', 'A#4 e', 'A#4 e', 'B4  e', 'B4  e', 'F#4 e', 'F#4 e', 'F#4 e','A#4 e','F#4 e','F#4 e','F#4 e','A#4 q','-   q'
        ],
        bass = ['A#3 e','B3  e','C#2 e','B#3 e','G#3 e','B3  e','C#2 e','B3  e','G#3 e','B3  e','C#2 e','B3  e','G#3 e','B3  e','C#2 e','B3  e',
                'G#3 e','B3  e','C#2 e','B3  e','G#3 e','A#3 e','C#2 e','A#3  e','F#3 e','A#3 e','C#2 e','A#3 e','F#3 q','-   q'
        ];

    this.lead = new TinyMusic.Sequence(ac, tempo, lead);
    this.bass = new TinyMusic.Sequence(ac, tempo, bass);

    // set staccato and smoothing values for maximum coolness
    this.lead.staccato = 0.1;
    this.bass.staccato = 0.1;

    this.lead.gain.gain.value = 0.3;
    this.bass.gain.gain.value = 0.3;

    when = ac.currentTime;
    this.lead.play(when);
    this.bass.play(when);

    gameMode = 3;
    RibbitSmash.add(new FrogSpawner());
}

Menu.prototype = new Sprite();

Menu.prototype.update = function() {
     if(RibbitSmash.getKey(32) || RibbitSmash.getKey(13)) {
        this.lead.stop();
        this.bass.stop();
        gameMode = 1;

        if(RibbitSmash.getKey(13)) {
            gameMode = 2;
        }

        gameStartTime = Date.now();
        timeLimit = 60000 + Date.now();
        gameState();
        RibbitSmash.switchState('Game');
     }
}

Menu.prototype.render = function() {
    ctx.fillStyle = 'rgb(100,100,100)';
    ctx.fillRect(0,0,this.width, this.height);

    drawText('Ribbet Smash', 10, 152, 72, '#000');
    drawText('Ribbet Smash', 10, 150, 70, '#21de00');

    drawText('Survival HighScore ' + survivalHighScore + ' Seconds', 3, 224, 253, '#000');
    drawText('Survival HighScore ' + survivalHighScore + ' Seconds', 3, 222, 250, '#ffff00');

    drawText('Rampage HighScore ' + rampageHighScore + ' Kills in one Minute', 3, 154, 302, '#000');
    drawText('Rampage HighScore ' + rampageHighScore + ' Kills in one Minute', 3, 152, 300, '#ff42f7');

    ctx.font = '30px monospace';

    drawText('Press Space to Play Survival', 5, 122, 482, '#000');
    drawText('Press Space to Play Survival', 5, 120, 480, '#ffff00');

    drawText('Press Enter to Play Rampage', 5, 132, 532, '#000');
    drawText('Press Enter to Play Rampage', 5, 130, 530, '#ff42f7');

}

/** Lose Screen **/
var Lose = function(options) {
    options = options || {};
    Sprite.call(this, options);
    this.x = 0;
    this.y = 0;
    this.width = WIDTH;
    this.height = HEIGHT;
}

Lose.prototype = new Sprite();

Lose.prototype.update = function() {
     if(RibbitSmash.getKey(32)) {
        RibbitSmash.keys[32] = false;
        // getting close to the end this is terrible.
        menuState();
     }
}

Lose.prototype.render = function() {
    ctx.fillStyle = 'rgb(100,100,100)';
    ctx.fillRect(0,0,this.width, this.height);

    var x = WIDTH / 2;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '70px monospace';

    if(gameMode === 1) {        
        if(endTime > survivalHighScore) {
            survivalHighScore = endTime;
            localStorage.setItem('survivalHighScore', survivalHighScore);
        }
        drawText('Too Many Got Away', 8, 115, 72, '#000');
        drawText('Too Many Got Away', 8, 113, 70, '#21de00');

        drawText('You stopped ' + frogsKilled + ' in ' + endTime, 4, 227, 222, '#000');
        drawText('You stopped ' + frogsKilled + ' in ' + endTime, 4, 225, 220, '#ff42f7');

       drawText('Longest Survival Time ' + survivalHighScore, 4, 202, 322, '#000');
       drawText('Longest Survival Time ' + survivalHighScore, 4, 200, 320, '#ff42f7');
    } else {
         if(frogsKilled > rampageHighScore) {
            rampageHighScore = frogsKilled;
            localStorage.setItem('rampageHighScore', rampageHighScore);
        }

        drawText('Frog Killing Machine', 8, 55, 72, '#000');
        drawText('Frog Killing Machine', 8, 53, 70, '#21de00');

        drawText('You killed ' + frogsKilled + ' in one minute!', 4, 187, 222, '#000');
        drawText('You killed ' + frogsKilled + ' in one minute!', 4, 185, 220, '#ff42f7');

        drawText('Most Killed in a minute ' + rampageHighScore, 4, 172, 322, '#000');
        drawText('Most Killed in a minute ' + rampageHighScore, 4, 170, 320, '#ff42f7');
    }

    drawText('Press Space to Return to Menu', 5, 122, 492, '#000');
    drawText('Press Space to Return to Menu', 5, 120, 490, '#ffff00');
}
/** GAME SETUP **/

function Game() {
    this.states = {};
    this.curState = {};

    this.shakeCount = 0;
    this.shake = 0;
    this.shakeDec = 1;

    this.keys = [];
    document.addEventListener('keydown', function(event){ 
        this.keyDown(event);
    }.bind(this), false);

    document.addEventListener('keyup', function(event){
        this.keyUp(event);
    }.bind(this), false);

    this.renderCanvas = createTempCanvas(WIDTH, HEIGHT);
    document.body.appendChild(this.renderCanvas.canvas);

    this.addState('init');
    this.update();
}

Game.prototype = {
    add: function(ent, updateOnly) {
        this.curState.entities.push(ent);
    },
    remove: function(ent) {
        var entities = this.curState.entities,
            entLen = entities.length,
            entity = entities.indexOf(ent);

        if(entity.kill !== undefined){
            entity.kill();
        }

        entities.splice(entity, 1);
    },
    switchState: function(stateName) {
        this.curState = this.states[stateName];
    },
    addState: function(state, init) {
        this.states[state]  = {entities: [], init : init};
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
    render: function() {
        var entities = this.curState.entities,
            entLen = entities.length;

        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // Sort the display order, backgrounds are always on the bottom
        entities.sort(function(a,b){
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

        while(entLen--){
            if(!entities[entLen].updateOnly) {
                entities[entLen].render();
            }
        }

        // This is the displayed canvas, now we can shake shit up.
        var shakeX = 0,
            shakeY = 0;

        if (this.shake > 0){
            shakeX = (Math.random()-0.5) * this.shake;
            shakeY = (Math.random()-0.5) * this.shake;
            this.shake -= 0.1 * this.shakeDec;
        }

        cX = shakeX + (0.5 + 0) << 0;
        cY = shakeY + (0.5 + 0) << 0;

        this.renderCanvas.ctx.clearRect(0, 0, WIDTH, HEIGHT);
        this.renderCanvas.ctx.drawImage(canvas, 0, 0, WIDTH, HEIGHT, cX, cY, WIDTH, HEIGHT);
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

        this.render();
        requestAnimationFrame(function(){this.update()}.bind(this));
    }
}

var RibbitSmash = new Game();

/** States **/

function menuState() {
    RibbitSmash.addState('Menu');
    RibbitSmash.add(new Menu());
}

function lostState() {
    RibbitSmash.addState('Lost');
    RibbitSmash.add(new Lose());
}

function gameState () {
    RibbitSmash.addState('Game');
    frogsKilled = 0,
    frogsSaved = 0,
    maxSaved = 20;
    gameStartTime = Date.now();

    gameMap = new Map();
    RibbitSmash.add(gameMap);
    RibbitSmash.add(new GameUI());
    RibbitSmash.add(new FrogSpawner());
    RibbitSmash.add(new Car());
}

// global gamemap.. yay.
// Getting late.. lets just global all the things!
var gameMap,
    gameMode = 1,
    frogsKilled = 0,
    frogsSaved = 0,
    maxSaved = 20,
    gameStartTime = Date.now(),
    endTime = ((Date.now() - gameStartTime) / 1000),
    timeLimit = 0,
    survivalHighScore = localStorage.getItem('survivalHighScore'),
    rampageHighScore = localStorage.getItem('rampageHighScore');

survivalHighScore = survivalHighScore || 0;
rampageHighScore = rampageHighScore || 0;

gameState();
lostState();
menuState();

RibbitSmash.switchState('Menu');
