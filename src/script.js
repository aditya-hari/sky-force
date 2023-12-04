import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Box3 } from 'three';

class MovingEntiy{
    constructor(object){
        this.object = object
        this.active = true
    }
}

class Bird extends MovingEntiy {
    constructor(object){
        super(object);
        this.dir = 0
        if(this.object.position.x < -15){
            this.dir = 1
        }
        if(this.object.position.x > 15){
            this.dir = -1
        }
    }
}

var container, scene, camera, renderer, controls, loader;
var score, health;
var keyboard = new THREEx.KeyboardState();
var clock = new THREE.Clock;

var frustum = new THREE.Frustum();

var player;
var player_missiles = [];

var enemies = [];
var enemy_missiles = [];

var stars = []

var score_hud, health_hud; 
var gameover = document.getElementById("gameover");

const manager = new THREE.LoadingManager();
manager.onLoad = init;

const models = {
    plane: { url: "./plane_only.glb"},
    bird: { url: "./bird.glb"},
    missile: {url: "./missile.glb"},
    star: {url: "./star.glb"},
}

{
    loader = new GLTFLoader(manager);
    for (const model of Object.values(models)) {
        loader.load(model.url, (gltf) => {
        model.gltf = gltf;
        });
    }
}

function addLight(...pos) {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...pos);
    scene.add(light);
    scene.add(light.target);
  }
scene = new THREE.Scene();

addLight(5, 5, 2);
addLight(-5, 5, 5);  

var screenWidth = window.innerWidth/2;
var screenHeight = window.innerHeight;
camera = new THREE.PerspectiveCamera(45, screenWidth/screenHeight, 0.1, 1000);
camera.position.set(0, 75, 100);

renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(screenWidth, screenHeight);
renderer.setClearColor(  0x60d2dd ); 
renderer.gammaOutput = true;
renderer.gammaFactor = 2.2;

container = document.getElementById("main");
container.appendChild(renderer.domElement);
document.addEventListener( 'mousedown', onDocumentMouseDown, false );

THREEx.WindowResize(renderer, camera);
controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false

// init();
animate();
function init() {
    player = models.plane.gltf.scene;
    player.position.set(0, 25, 50);
    scene.add(player);
    score = 0;
    health = 5;
    score_hud = document.getElementById("score")
    health_hud = document.getElementById("health")
    score_hud.value = score;
    health_hud.value = health;
}

function onDocumentMouseDown() {
	shootMissilePlayer()
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    updateAll();
    addRandomEnemy();
    addRandomStar();
}

function updateAll() {
    if(health == 0){
        gameover.style.visibility = 'visible';
    }
    updatePlayer();
    updateProjectiles();
    updateEnemies();
    updateStars();
    updateHUD();
}

function checkOnScreen(pos){
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));  
    if(!frustum.containsPoint(pos)) {
        return false
    }
}

function updateProjectiles(){
    var moveDistance = 0.7;
    player_missiles.forEach(function(missile){
        if(missile.active){
            var missile_obj = missile.object
            missile_obj.position.z-=moveDistance
            if(checkOnScreen(missile_obj.position) == false){
                missile.active = false
            }
        }
    })

    player_missiles.forEach(function(missile){
        if(missile.active == false){
            scene.remove(missile.object);
        }
    })
    player_missiles = player_missiles.filter((missile) => missile.active != false)

    enemy_missiles.forEach(function(missile){
        if(missile.active){
            var missile_obj = missile.object
            missile_obj.position.z+=moveDistance
            if(checkOnScreen(missile_obj.position) == false){
                missile.active = false
            }
        }
    })

    enemy_missiles.forEach(function(missile){
        if(missile.active == false){
            scene.remove(missile.object);
        }
    })
    enemy_missiles = enemy_missiles.filter((missile) => missile.active != false)
}

function shootMissilePlayer(){
    if(score >= 3){
        score -= 3
        var position = player.position.clone()
        var obj = models.missile.gltf.scene;
        obj.position.set(position.x, position.y, position.z);
        obj.rotation.x = -Math.PI/2;
        obj.rotation.z = Math.PI;
        var missile = new MovingEntiy(obj.clone())
        player_missiles.push(missile)
        scene.add(missile.object);
    }
}

function shootMissileEnemy(enemy){
    var position = enemy.position.clone()
    var obj = models.missile.gltf.scene;
    obj.position.set(position.x, position.y, position.z);
    var missile = new MovingEntiy(obj.clone())
    enemy_missiles.push(missile)
    scene.add(missile.object);
}

function updatePlayer() {
    var delta = clock.getDelta();
    var moveDistance = 20 * delta;
    var rotateAngle = Math.PI / 2 * delta;

    if (keyboard.pressed("A")) {
        player.rotation.z += rotateAngle;
    }
    if (keyboard.pressed("D")) {
        player.rotation.z -= rotateAngle;
    }

    if (keyboard.pressed("left")) {
        player.position.x -= moveDistance;
        player.rotation.z += rotateAngle/10;
    }
    if (keyboard.pressed("right")) {
        player.position.x += moveDistance;
        player.rotation.z -= rotateAngle/10;
    }
    if (keyboard.pressed("up")) {
        player.position.z -= moveDistance;
    }
    if (keyboard.pressed("down")) {
        player.position.z += moveDistance;
    }
    controls.update();
    checkEnemyCollisions();
    checkMissileCollisions();
}

function checkMissileCollisions(){
    var player_bounding_box = new Box3(new THREE.Vector3(), new THREE.Vector3());
    player_bounding_box.setFromObject(player);
    enemy_missiles.forEach(function(missile_obj){
        var missile = missile_obj.object
        var missile_bounding_box = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
        missile_bounding_box.setFromObject(missile);
        if(missile_bounding_box.intersectsBox(player_bounding_box)){
            missile_obj.active = false;
            score-=5;
            health-=1;
        }
    })
}

function checkEnemyCollisions(){
    var player_bounding_box = new Box3(new THREE.Vector3(), new THREE.Vector3());
    player_bounding_box.setFromObject(player);
    for(var i = 0; i < enemies.length; i++){
        var enemy_obj = enemies[i];
        var enemy = enemy_obj.object;
        if(enemy_obj.active){
            var bbox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
            bbox.setFromObject(enemy);
            if(bbox.intersectsBox(player_bounding_box)){
                enemy_obj.active = false
                health-=1
                score-=10
            }
        }
    }
}

function addRandomEnemy(){
    if(enemies.length < 10 && Math.random() < 0.05){
        randomEnemy();
    }
}

function addRandomStar(){
    if(stars.length < 3 && Math.random() < 0.03){
        randomStar();
    }
}

function updateEnemies(){
    var moveDistance = 0.5;
    enemies.forEach(function(enemy){
        if(enemy.active){
            var enemy_obj = enemy.object
            if(Math.random() < 0.0025) {
                shootMissileEnemy(enemy_obj);
            }
            var enemy_bounding_box = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
            enemy_bounding_box.setFromObject(enemy_obj);
            enemy_obj.position.z+=moveDistance
            enemy_obj.position.x+=enemy.dir*0.05
            if(enemy_obj.position.z > 70){
                enemy.active = false;
            }
            
            player_missiles.every(function(missile_obj){
              var missile = missile_obj.object
              var missile_bounding_box = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
              missile_bounding_box.setFromObject(missile);
              if(missile_bounding_box.intersectsBox(enemy_bounding_box)){
                  enemy.active = false;
                  missile_obj.active = false;
                  score+=10
              }
              if(enemy.active == false) return false
              else return true
            })
        }
    })

    enemies.forEach(function(enemy){
        if(enemy.active == false){
            scene.remove(enemy.object);
        }
    })
    enemies = enemies.filter((enemy) => enemy.active == true);
}

function updateStars(){
    var player_bounding_box = new Box3(new THREE.Vector3(), new THREE.Vector3());
    player_bounding_box.setFromObject(player);

    var moveDistance = 0.3;
    stars.forEach(function(star){
        if(star.active){
            var star_obj = star.object
            var star_bounding_box = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
            star_bounding_box.setFromObject(star_obj);
            star_obj.position.z+=moveDistance
            if(star_bounding_box.intersectsBox(player_bounding_box)){
                star.active = false;
                score+=10;
            }
            if(star_obj.position.z > 70){
                star.active = false;
            }
        }
    })

    stars.forEach(function(star){
        if(star.active == false){
            scene.remove(star.object);
        }
    })
    stars = stars.filter((star) => star.active == true);
}


function randomEnemy(){
    var x_pos = Math.floor(Math.random()*101 - 50);
    var bird = models.bird.gltf.scene;
    bird.position.set(x_pos, 25, -100);
    var enemy = new Bird(bird.clone())
    scene.add(enemy.object);
    enemies.push(enemy);
}


function randomStar(){
    var x_pos = Math.floor(Math.random()*101 - 50);
    var star = models.star.gltf.scene;
    star.position.set(x_pos, 25, -100);
    star.rotation.z += Math.PI/2
    star.rotation.x += Math.PI/2
    var reward = new MovingEntiy(star.clone())
    scene.add(reward.object);
    stars.push(reward);
}

function updateHUD(){
    score_hud.value = score;
    health_hud.value = health
}