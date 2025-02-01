class BossRoom extends Phaser.Scene{
    constructor(){
        super('BossRoom');
        this.isInteractable = false;
        this.canInteract = true;
        this.dialogText = null;
        this.dialogWidth = null;  
        this.dialogHeight = null; 
        this.knowledge_state = 0.9;
        this.startTime = null;
        this.endTime = null;
        this.responseFlag = true;

        this.endingDialogue = [
            "After solving countless mathematical challenges, you finally step through the Forgotten Chamber where lies the Grand Math Codex",
            "At the center of the vast, ancient hall stands the Grand Math Codex",
            "You have come far, student. Your journey through the academy has tested your wit, logic, and perseverance",
            "But only those who have truly mastered the art of mathematics may restore the Codex and claim its wisdom",
            "Now, extend your hand towards the Codex as it scan your very essence - the measure of your mathematical mastery."
        ]

        this.failDialogue = [
            "...",
            "...",
            "Not yet...",
            "The Codex recognizes potential, but you have more to learn.",
            "Return to the academy, strengthen your knowledge, and when you are ready...the path to this chamber will reveal itself once more.",
            "Here is the summarized version of your progress!"
        ]

        this.successDialogue = [
            "...",
            "You have proven yourself worthy!",
            "With your mastery, the balance of the academy is restored.",
            "The Codex now recognizes you as one of its guardian, a protector of knowledge and topic.",
            "However, in order to prepare for future battles, do remember to keep up the good work!",
            "[Grand Math Codex obtained!]",
            "Congratulations! Here is the summarized version of your progress!"
        ]
    }

    init(data){
        //this.knowledge_state = data.knowledge_state;
        //this.hintRemaining = data.hintRemaining;
    }

    preload(){
        this.load.image('classroom', 'static/assets/themes/5_Classroom_and_library_32x32.png');
        this.load.image('museum', 'static/assets/themes/22_Museum_32x32.png');
        this.load.image('roombuilder', 'static/assets/themes/Room_Builder_32x32.png');
        this.load.tilemapTiledJSON('bossRoom', 'static/assets/bossRoom.json');
        this.load.spritesheet('player', 'static/assets/player.png', {
            frameWidth: 32,
            frameHeight: 50,
        });
        this.load.audio('aphelion','static/assets/sounds/aphelion.mp3');
        this.load.audio('step1', 'static/assets/sounds/fstep1.wav');
        this.load.audio('step2', 'static/assets/sounds/fstep2.wav');
        this.load.audio('step3', 'static/assets/sounds/fstep3.wav');
        this.load.audio('step4', 'static/assets/sounds/fstep4.wav');
        this.load.audio('step5', 'static/assets/sounds/fstep5.wav');
        this.load.audio('correct', 'static/assets/sounds/correct.mp3');
        this.load.audio('wrong', 'static/assets/sounds/wrong.mp3');
    }

    create(){
        const music = this.sound.add('aphelion');
        music.play({
            loop : true,
            volume : 0.5
        });
        this.movespeed = 120;

        const map = this.make.tilemap({key: 'bossRoom'});
        const classroomTiles = map.addTilesetImage('Classroom', 'classroom');
        const roomBuilderTiles = map.addTilesetImage('RoomBuilder', 'roombuilder');
        const museumTiles = map.addTilesetImage('Museum', 'museum');

        this.layoutLayer = map.createLayer('Layout', [classroomTiles, roomBuilderTiles,museumTiles]);
        this.furnitureLayer = map.createLayer('Furniture', [classroomTiles, roomBuilderTiles,museumTiles]);
        this.layoutLayer.setCollisionByProperty({ collision: true });
        this.furnitureLayer.setCollisionByProperty({ collision: true });

        const mapWidth = map.widthInPixels;
        const mapHeight = map.heightInPixels;
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

        this.player = this.physics.add.sprite(432, 500, 'player');
        this.cameras.main.startFollow(this.player, true);
        this.cameras.main.setZoom(2.2);

        this.physics.add.collider(this.player, this.layoutLayer);
        this.physics.add.collider(this.player, this.furnitureLayer);

        this.anims.create({
            key: 'down',
            frameRate: 8,
            repeat: -1,
            frames: this.anims.generateFrameNumbers('player', { start: 18, end: 23 }),
        });
        this.anims.create({
            key: 'up',
            frameRate: 8,
            repeat: -1,
            frames: this.anims.generateFrameNumbers('player', { start: 6, end: 11 }),
        });
        this.anims.create({
            key: 'left',
            frameRate: 8,
            repeat: -1,
            frames: this.anims.generateFrameNumbers('player', { start: 12, end: 17 }),
        });
        this.anims.create({
            key: 'right',
            frameRate: 8,
            repeat: -1,
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 5 }),
        });

        this.steps = ['step1', 'step2', 'step3','step4','step5'];
        this.stepping = false;

        // define keys
        keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        this.physics.add.overlap(this.player, this.furnitureLayer, (player, tile) => {
            if (tile.properties.interactable) {
                this.isInteractable = true;
                this.currentInteractable = tile;
            }
        }, null, this);

        keyE.on('down', () => {
            if (!this.canInteract) return; // Exit if interaction is on cooldown

            // Handle interactions for math codex
            if (this.isInteractable) {
                const interactableId = this.currentInteractable.properties['id'];
                if (interactableId === -1) {
                    const currentKnowledgeState = this.knowledge_state;
                    if(currentKnowledgeState >= 0.75){
                        this.createEndingDialogue(this.successDialogue, true);
                    }
                    else{
                        this.createEndingDialogue(this.failDialogue, true);
                    }
                    
                } 
                else {
                    console.log('No interactable objects in range')
                }
                return; // Exit the function after triggering the object interaction
            } 

            this.canInteract = false; // Disable further interactions
            this.time.delayedCall(500, () => { // Re-enable interactions after 500ms
                this.canInteract = true;
            });
        
            // If the code execution reaches this point, the player is not interacting with any object or door
            console.log('No interactable object in range.');
        });

        this.createEndingDialogue(this.endingDialogue,false);
    }

    update(){
        let stillNearInteractable = false;
        
        [this.furnitureLayer, this.layoutLayer].forEach(layer => {
            const tile = layer.getTileAtWorldXY(this.player.x, this.player.y);
            if (tile && tile.properties.interactable) {
                stillNearInteractable = true;
                this.currentInteractable = tile;
            }
        });
        
        if (!stillNearInteractable) {
            this.isInteractable = false;
        }

        if (this.player.body.speed != 0) {
            // pick random from this.steps and play with a delay
            if (!this.stepping) {
                this.stepping = true;
                this.playStep = this.sound.add(
                    this.steps[Math.floor(Math.random() * 5)]
                );
                this.playStep.play({ detune: Math.floor(Math.random() * 300), rate: 1.5, volume: 0.3});
                this.time.delayedCall(this.movespeed * 2.5, () => {
                    this.stepping = false;
                }, null, this);
            }
        }

        // Reset velocity
        this.player.body.setVelocity(0);

        // Horizontal movement
        if (keyA.isDown) {
            this.player.body.setVelocityX(-this.movespeed);
            this.player.direction = "left";
        } else if (keyD.isDown) {
            this.player.body.setVelocityX(this.movespeed);
            this.player.direction = "right";
        }

        // Vertical movement
        if (keyW.isDown) {
            this.player.body.setVelocityY(-this.movespeed);
            this.player.direction = "up";
        } else if (keyS.isDown) {
            this.player.body.setVelocityY(this.movespeed);
            this.player.direction = "down";
        }

        // Play animations
        if (keyW.isDown || keyS.isDown || keyA.isDown || keyD.isDown) {
            this.player.anims.play(`${this.player.direction}`, true);
        } else {
            this.player.anims.stop();
        }
    }

    createEndingDialogue(endingDialogue, endGame) {
        let currentStep = 0;
        this.scene.pause();

        const endingDialogBox = document.createElement('div');
        Object.assign(endingDialogBox.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px',
            backgroundColor: '#f5deb3', // Wheat-like color
            backgroundSize: 'cover',
            color: '#000000',
            borderRadius: '10px',
            border: '5px solid #8B4513', // Brown border
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
            zIndex: '1000',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: '80%',
            maxWidth: '900px',
            maxHeight: '600px',
            overflowY: 'auto',
            animation: 'fadeIn 0.5s ease'
        });

        document.body.appendChild(endingDialogBox);
        const npcTitle = document.createElement('h2');
        npcTitle.innerText = "Professor Algebrus";
        Object.assign(npcTitle.style, {
            fontSize: '24px',
            marginBottom: '10px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#8B4513'
        });
        endingDialogBox.appendChild(npcTitle);

        const endingContent = document.createElement('div');
        Object.assign(endingContent.style, {
            textAlign: 'center',
            fontSize: '18px',
            fontFamily: '"Press Start 2P", monospace',
            lineHeight: '1.6',
            color: '#4B0082', // Indigo for variety
            padding: '10px'
        });
        endingDialogBox.appendChild(endingContent);

        const buttonContainer = document.createElement('div');
        Object.assign(buttonContainer.style, {
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            marginTop: '20px'
        });

        const prevButton = document.createElement('button');
        prevButton.innerText = 'Previous';
        Object.assign(prevButton.style, {
            padding: '10px 20px',
            backgroundColor: '#333',
            color: '#ffffff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            fontFamily: '"Press Start 2P", monospace',
            visibility: 'hidden' // Initially hidden
        });

        const nextButton = document.createElement('button');
        nextButton.innerText = 'Next';
        Object.assign(nextButton.style, {
            padding: '10px 20px',
            backgroundColor: '#333',
            color: '#ffffff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            fontFamily: '"Press Start 2P", monospace'
        });

        buttonContainer.appendChild(prevButton);
        buttonContainer.appendChild(nextButton);
        endingDialogBox.appendChild(buttonContainer);

        const updateEndingStep = () => {
            endingContent.innerHTML = endingDialogue[currentStep];
    
            prevButton.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
            nextButton.innerText = currentStep === endingDialogue.length - 1 ? 'Finish' : 'Next';
        };

        prevButton.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                updateEndingStep();
            }
        });

        nextButton.addEventListener('click', () => {
            if (currentStep < endingDialogue.length - 1) {
                currentStep++;
                updateEndingStep();
            } else {
                //condition to check which ending dialogue
                if(endGame){
                    this.showProgress();
                }
                else{
                    // Close the tutorial on the last step
                    document.body.removeChild(endingDialogBox);
                    this.scene.resume();
                    this.canInteract = false; // Disable further interactions
                    this.time.delayedCall(500, () => { 
                        this.canInteract = true;
                    });
                }  
            }
        });
        
        updateEndingStep();
    }

    //this has to be replicated througout the games room
    showProgress(){
        //get total time taken using window global storage
        //display user's progress with, upon exiting game is over and redirected to dashboard
        this.scene.pause();

        //create post-game dialog
        const summaryDialogBox = document.createElement('div');
        summaryDialogBox.style.position = 'fixed';
        summaryDialogBox.style.top = '50%';
        summaryDialogBox.style.left = '50%';
        summaryDialogBox.style.transform = 'translate(-50%, -50%)';
        summaryDialogBox.style.padding = '20px';
        summaryDialogBox.style.backgroundColor = '#f5deb3'; // Wheat-like color
        summaryDialogBox.style.backgroundSize = 'cover';
        summaryDialogBox.style.color = '#000000';
        summaryDialogBox.style.borderRadius = '10px';
        summaryDialogBox.style.border = '5px solid #8B4513'; // Brown border
        summaryDialogBox.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        summaryDialogBox.style.zIndex = '1000';
        summaryDialogBox.style.display = 'flex';
        summaryDialogBox.style.flexDirection = 'column';
        summaryDialogBox.style.justifyContent = 'center';
        summaryDialogBox.style.alignItems = 'center';
        summaryDialogBox.style.width = '80%';
        summaryDialogBox.style.maxWidth = '900px';
        summaryDialogBox.style.maxHeight = '600px';
        summaryDialogBox.style.overflowY = 'auto';

        document.body.appendChild(summaryDialogBox);

        const titleText = document.createElement('h2');
        titleText.innerText = 'Post-Game Summary';
        titleText.style.textAlign = 'center';
        titleText.style.color = '#8B4513'; // Brown color
        summaryDialogBox.appendChild(titleText);

        const performanceDetails = [
            `Topic: Numbers`, //fixed for now
            `Status: Game completed`, //changes according to which room
            `Mastery: ${this.knowledge_state}`, //data passed
            `Total Time Taken: 90 minutes`, //data stored in window variable
            `Hints Used: 3`, //data passed
            `Life Remaining:22`, //data passed
            `Remark: Good job! Keep up the good work.`
        ];

        performanceDetails.forEach(detail => {
            const detailText = document.createElement('p');
            detailText.innerText = detail;
            detailText.style.fontSize = '16px';
            detailText.style.margin = '5px 0';
            detailText.style.fontFamily = '"Press Start 2P", monospace';
            detailText.style.textAlign = 'left';
            summaryDialogBox.appendChild(detailText);
        });

        const closeButton = document.createElement('button');
        closeButton.innerHTML = 'Close';
        closeButton.style.marginTop = '20px';
        closeButton.style.padding = '10px 20px';
        closeButton.style.backgroundColor = '#333';
        closeButton.style.color = '#ffffff';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        summaryDialogBox.appendChild(closeButton);
    
        // Close button functionality
        closeButton.addEventListener('click', () => {
            document.body.removeChild(summaryDialogBox); // Remove dialog box
            //thank the player for playing ; if final boss room congratulate them and then try the game again also
            this.closingDialogue();
        });

        
    }

    closingDialogue(){
        //x need to pause scene as prev is still paused
        const finalDialogBox = document.createElement('div');
        Object.assign(finalDialogBox.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px',
            backgroundColor: '#f5deb3',
            color: '#000000',
            borderRadius: '10px',
            border: '5px solid #8B4513',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
            zIndex: '1000',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            animation: 'fadeIn 0.5s ease',
            width: '600px',
            maxHeight: '300px',
            textAlign: 'center'
        });
    
        document.body.appendChild(finalDialogBox);

        const finalMessage = document.createElement('div');
        finalMessage.innerHTML = `
            <p>Thank you for playing!</p>
            <p>We hope you had fun and learned something new.</p>
            <p>Please try the game again!</p>
        `;
        Object.assign(finalMessage.style, {
            fontSize: '18px',
            fontFamily: '"Press Start 2P", monospace',
            lineHeight: '1.6',
            color: '#4B0082',
            padding: '10px'
        });
        finalDialogBox.appendChild(finalMessage);

        const exitButton = document.createElement('button');
        exitButton.innerText = 'Exit';
        Object.assign(exitButton.style, {
            padding: '10px 20px',
            backgroundColor: '#333',
            color: '#ffffff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            fontFamily: '"Press Start 2P", monospace',
            marginTop: '20px'
        });

        exitButton.addEventListener('click', () => {
            document.body.removeChild(finalDialogBox);
            this.scene.resume();
            this.canInteract = false; // Disable further interactions
            this.time.delayedCall(500, () => { 
                this.canInteract = true;
            });
            
            this.time.delayedCall(5000, () => { 
                // Redirect to the landing page after exit
                window.location.href = "/dashboard";
            });
            
        });
    
        finalDialogBox.appendChild(exitButton);
    }
}