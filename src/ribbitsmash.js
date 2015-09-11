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
        this.list.sort(function(a,b){return b.y-a.y});

        while(id--){
            this.list[id].update();
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

var Sprite = function(options) {
    options = options || {};
    this.width = options.width || 0;
    this.height = options.height || 0;
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.color = options.color || {r : 0, g : 0, b : 0, a : 1};
    this.shape = options.shape || false;
    this.img = options.img;
}

Sprite.prototype = {
    render: function() {
        var color = this.color;
        ctx.save();
        ctx.fillStyle = "rgba(" + color.r + "," + color.g + "," + color.b + "," + color.a + ")";
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.restore();
    }
}

function Frog(options) {
    Sprite.call(this, options);
    this.x = options.x || 0;
    this.y = options.y || 10;
    this.width = 16;
    this.height = 14;
    this.color = {r : 0, g : 255, b : 0, a : 1};
    this.shape = true;
    this.speed = (Math.random() * 0.5) + 0.5;
    this.jump = 0;
    this.jumpSpeed = (Math.random() * 0.08) + 0.04;
}

Frog.prototype = new Sprite();

Frog.prototype.update = function(dt) {
    this.jump+= this.jumpSpeed;
    if( Math.abs(Math.sin(this.jump)) === Math.sin(this.jump)) {
        this.x += this.speed + Math.sin(this.jump);
    }

    if(this.x > WIDTH) {
        this.x = -this.width;
    }
}

var RENDERER = new Renderer();

var MenuScreen = function() {

}

var WinScreen = function() {

}

var lostScreen = function() {

}

var GameScreen = function() {
    for(var i = 0; i < 10; i ++) {
        RENDERER.add(new Frog({x : Math.random() * WIDTH, y : Math.random() * HEIGHT}));
    }
}

function Game() {
    this.gameScreen = new GameScreen();
    this.update();
}

Game.prototype = {
    update: function() {
        RENDERER.render();
        requestAnimationFrame(function(){this.update()}.bind(this));
    }
}

var RibbitSmash = new Game();