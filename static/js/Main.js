//Main file for Adaptive Group

//Phaser game configuration
let config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
        }
    },
    scene:[Tutorial, Classroom, ClassroomHard, LoungeHard,BossRoom]//fixed rooms
};

//Create Phaser game instance
let game = new Phaser.Game(config);

//Reserved keyboard variables
let keyE, keyW, keyA, keyS, keyD;
let key0, key1, key2, key3, key4, key5, key6, key7, key8, key9; //code entry to enter next room