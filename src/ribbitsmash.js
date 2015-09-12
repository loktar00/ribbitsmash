var canvas = document.querySelector('canvas'),
    ctx = canvas.getContext('2d'),
    WIDTH = 800,
    HEIGHT = 600;
    canvas.width

canvas.width = WIDTH;
canvas.height = HEIGHT;

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
            console.log('remove');
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

/** Map**/
function Map(options) {
    Sprite.call(this, options);

    this.bg = true;
    this.bgIndex = 1;

    this.x = 0;
    this.y = 0;

    this.width = WIDTH;
    this.height = HEIGHT;

    this.shape = true;
}

Map.prototype = new Sprite();

Map.prototype.render = function() {
    ctx.save();
        // main road.
        ctx.fillStyle = "rgb(100,100,100)";
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // water
        ctx.fillStyle  = "#009dd1";
        ctx.fillRect(this.width - 100, 0, 100, this.height);

        // grass
        ctx.fillStyle  = "#00d12c";
        ctx.fillRect(this.width - 120, 0, 20, this.height);
    ctx.restore();
};

/** FROG **/

function Frog(options) {
    Sprite.call(this, options);

    this.x = options.x || 0;
    this.y = options.y || 10;
    this.z = 1;

    this.width = 16;
    this.height = 14;

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
};

Frog.prototype.update = function(dt) {
    this.jump+= this.jumpSpeed;
    if( Math.abs(Math.sin(this.jump)) === Math.sin(this.jump)) {
        this.x += this.speed + Math.sin(this.jump);
    }

    if(this.x > WIDTH) {
        this.x = -this.width;
    }
}

/** CAR **/

function Car(options) {
    options = options || {};
    Sprite.call(this, options);

    this.width = 32;
    this.height = 64;

    this.y = options.y || HEIGHT + this.height;
    this.x = options.x || 50;
    this.z = 2;

    this.colId = 1;
    this.color = {r : 255, g : 255, b : 255, a : 1};
    this.shape = true;
    this.speed = (Math.random() * 2) + 0.5;
}

Car.prototype = new Sprite();

Car.prototype.hit = function() {
    // Do stuff when a car hits a frog.
};

Car.prototype.update = function(dt) {
    this.y -= this.speed;
    if(this.y + this.height < 0) {
        this.y = HEIGHT + this.height;
    }
}

/** GAME SETUP **/

function Game() {
    this.states = {};
    this.curState = {};
    this.renderer = new Renderer();

    this.addState('init');
    this.update();
}

Game.prototype = {
    add: function(ent) {
        this.curState.entities.push(ent);
        this.renderer.add(ent);
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

                if (curEnt.x < checkEnt.x + checkEnt.width &&
                    curEnt.x + curEnt.width > checkEnt.x &&
                    curEnt.y < checkEnt.y + checkEnt.height &&
                    curEnt.height + curEnt.y > checkEnt.y) {
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

function winState() {

}

function lostState() {

}

function gameState () {
    RibbitSmash.addState('Game');

    RibbitSmash.add(new Map());
    for(var i = 0; i < 10; i ++) {
        RibbitSmash.add(new Frog({x : Math.random() * WIDTH, y : Math.random() * HEIGHT}));
    }

    RibbitSmash.add(new Car());
}

gameState();