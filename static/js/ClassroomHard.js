class ClassroomHard extends Phaser.Scene{
    constructor(){
        super('ClassroomHard');
        this.easyQuestions = null;
        this.knowledge_state = null;
    }

    init(data){
        this.easyQuestions = data.easyQuestions;
        console.log("Easy Questions" + this.easyQuestions)
        this.knowledge_state = data.knowledge_state;
        console.log("Knowledge State passed : " + this.knowledge_state);
    }

    preload(){

        this.load.image('art', 'static/assets/themes/7_Art_32x32.png');
        this.load.image('classroom', 'static/assets/themes/5_Classroom_and_library_32x32.png');
        this.load.image('door', 'static/assets/themes/1_Generic_32x32.png');
        this.load.image('roombuilder', 'static/assets/themes/Room_Builder_32x32.png');
        this.load.image('gym', 'static/assets/themes/8_Gym_32x32.png');
        this.load.image('japan', 'static/assets/themes/20_Japanese_interiors_32x32.png');
        this.load.image('museum', 'static/assets/themes/22_Museum_32x32.png');
        this.load.image('upstairs', 'static/assets/themes/17_Visibile_Upstairs_System_32x32.png');
        
        this.load.tilemapTiledJSON('classroomMapHard', 'static/assets/classroom3.json');

        this.load.spritesheet('player', 'static/assets/player.png', {
            frameWidth: 32,
            frameHeight: 50,
        });
    }

    create(){
        const map = this.make.tilemap({key: 'classroomMapHard'});
        const artTiles = map.addTilesetImage('Art', 'art');
        const classroomTiles = map.addTilesetImage('Classroom', 'classroom');
        const doorTiles = map.addTilesetImage('Doors', 'door');
        const roomBuilderTiles = map.addTilesetImage('RoomBuilder', 'roombuilder');
        const gymTiles = map.addTilesetImage('Gym', 'gym');
        const japanTiles = map.addTilesetImage('Japan', 'japan');
        const museumTiles = map.addTilesetImage('Museum', 'museum');
        const upstairTiles = map.addTilesetImage('Upstairs','upstairs')

        const layoutLayer = map.createLayer('Layout', [artTiles,classroomTiles,doorTiles,roomBuilderTiles,gymTiles,japanTiles,museumTiles,upstairTiles]);
        const secondLayoutLayer = map.createLayer('SecondLayout', [artTiles,classroomTiles,doorTiles,roomBuilderTiles,gymTiles,japanTiles,museumTiles,upstairTiles]);
        const furnitureLayer = map.createLayer('Furniture', [artTiles,classroomTiles,doorTiles,roomBuilderTiles,gymTiles,japanTiles,museumTiles,upstairTiles]);
        const museumItemsLayer = map.createLayer('MuseumItems', [artTiles,classroomTiles,doorTiles,roomBuilderTiles,gymTiles,japanTiles,museumTiles,upstairTiles]);
        const finalLayer = map.createLayer('FinalLayer', [artTiles,classroomTiles,doorTiles,roomBuilderTiles,gymTiles,japanTiles,museumTiles,upstairTiles]);

        // layoutLayer.setCollisionByProperty({ collision: true });
        // furnitureLayer.setCollisionByProperty({ collision: true });
        // secondLayoutLayer.setCollisionByProperty({ collision: true });
        // museumItemsLayer.setCollisionByProperty({ collision: true });
        // finalLayer.setCollisionByProperty({ collision: true });

        const mapWidth = map.widthInPixels;
        const mapHeight = map.heightInPixels;
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

        this.player = this.physics.add.sprite(432, 500, 'player');
        this.cameras.main.startFollow(this.player, true);
        this.cameras.main.setZoom(2.2);

        this.physics.add.collider(this.player, layoutLayer);
        this.physics.add.collider(this.player, furnitureLayer);
        this.physics.add.collider(this.player, secondLayoutLayer);
        this.physics.add.collider(this.player, museumItemsLayer);
        this.physics.add.collider(this.player, finalLayer);
    }
}