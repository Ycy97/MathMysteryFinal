class Classroom extends Phaser.Scene {

    constructor() {
        super('Classroom')
        this.isInteractable = false; // Add a flag to check for interactable state
        this.canInteract = true; // Flag to control interaction cooldown
        this.dialogText = null; // Placeholder for the dialog text object
        this.questions = []; // Store fetched questions
        this.dialogWidth = null;  
        this.dialogHeight = null; 
        this.questionActive = false; // Flag to check if a question is currently active
        this.gptDialogActive = false;
        this.currentQuestionIndex = null;
        this.lastSolvedId = 0; // Start with 0, no puzzle solved
        this.passcodeNumbers = []; // Array to store passcode numbers
        this.hudText = null; // HUD text object
        this.hintText = [];
        this.hintActive = false;
        this.initialHint = 3;
        this.hintRemaining = this.initialHint;
        this.currentClueMessage = "Find the golden globe!"
        this.consecutiveWrongAttempts = 0; //if 2 in a row wrong provide cutscene to help, if correct reset
        this.knowledge_state = 0.1;//dynamically grab from database
        this.startTime = null;
        this.endTime = null;
        this.easyQuestions = [];
        this.mediumQuestions = [];
        this.hardQuestions = [];
        this.responseFlag = true;
        this.question = null;

        this.timerText = null;
        this.lifePointsText = null;
        this.initialLifeValue = 5; //for when passing through rooms and determine no. of questions wrong
        this.lifePointsValue = this.initialLifeValue; // initialized and carried over
        this.initialTime = 10 * 60; // 10 minutes in seconds
        this.statusText = null;

        //responseTime start and end to capture time taken for each questions
        this.questionStartTime = null;
        this.questionEndTime = null;

        this.hints = {
            1: 'Try looking at one of the bookshelves.',
            2: 'That plant seems oddly suspicious?',
            3: 'There is something written on the bookstand...',
            4: 'Try to look out of the window?',
            5: 'That was fun! Lets go to the next room!'
          };
    }

    init(){
        if(typeof window.totalTimeTaken === 'undefined'){
            window.totalTimeTaken = 0;
        }
    }

// Preload function to load assets
    preload() {

        // Load tileset images
        this.load.image('door', 'static/assets/themes/1_Generic_32x32.png');
        this.load.image('roombuilder', 'static/assets/themes/Room_Builder_32x32.png');
        this.load.image('classroom','static/assets/themes/5_Classroom_and_library_32x32.png');

        // Load the Tiled map JSON file
        this.load.tilemapTiledJSON('classroomMap', 'static/assets/classroom.json');

        this.load.spritesheet('player', 'static/assets/player.png', {
            frameWidth: 32,
            frameHeight: 50,
        });

        this.load.audio('step1', 'static/assets/sounds/fstep1.wav');
        this.load.audio('step2', 'static/assets/sounds/fstep2.wav');
        this.load.audio('step3', 'static/assets/sounds/fstep3.wav');
        this.load.audio('step4', 'static/assets/sounds/fstep4.wav');
        this.load.audio('step5', 'static/assets/sounds/fstep5.wav');
        this.load.audio('doorOpen', 'static/assets/sounds/door_open.wav');
        this.load.audio('correct', 'static/assets/sounds/correct.mp3');
        this.load.audio('wrong', 'static/assets/sounds/wrong.mp3');
        this.load.audio('bootUp', 'static/assets/sounds/bootUpPC.mp3');
    }

// Create function to create the map
    create() {

        this.fetchQuestions().then(() => {
            console.log('Questions loaded:', this.questions);
            this.createDialogComponents();
            // Proceed with other setup tasks that depend on questions
        }).catch(error => {
            console.error('Failed to load questions:', error);
        });

        // Define movespeed
        this.movespeed = 120; // Adjust the value as needed

        // Create the map object
        const map = this.make.tilemap({key: 'classroomMap'});

        // Add tilesets to the map
        const doorTiles = map.addTilesetImage('Doors', 'door');
        const roombuilderTiles = map.addTilesetImage('RoomBuilder', 'roombuilder');
        const classroomTiles = map.addTilesetImage('Classroom','classroom');

        // Create layers from the map data
        this.layoutLayer = map.createLayer('Layout', [doorTiles, roombuilderTiles,classroomTiles]);
        this.furnitureLayer = map.createLayer('Furniture', [doorTiles, roombuilderTiles,classroomTiles]);
        this.miscLayer = map.createLayer('Misc', [doorTiles, roombuilderTiles,classroomTiles]);

        // Set collision for tiles with custom property "collision"
        this.layoutLayer.setCollisionByProperty({ collision: true });
        this.furnitureLayer.setCollisionByProperty({ collision: true });
        this.miscLayer.setCollisionByProperty({ collision: true });

        // Center the map on the screen
        const mapWidth = map.widthInPixels;
        const mapHeight = map.heightInPixels;
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

        this.player = this.physics.add.sprite(432, 450, 'player');

        // Set camera properties
        this.cameras.main.startFollow(this.player, true); // Make the camera follow the player
        this.cameras.main.setZoom(2.0); // Zoom in x2

        // Enable collisions between the player and the map layers
        this.physics.add.collider(this.player, this.layoutLayer);
        this.physics.add.collider(this.player, this.furnitureLayer);
        this.physics.add.collider(this.player, this.miscLayer);

        // player animations (walking)
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

        // Overlap check for interactable objects in furnitureLayer
        this.physics.add.overlap(this.player, this.furnitureLayer, (player, tile) => {
            if (tile.properties.interactable) {
                this.isInteractable = true;
                this.currentInteractable = tile;
            }
        }, null, this);

        // Overlap check for interactable objects in miscLayer
        this.physics.add.overlap(this.player, this.miscLayer, (player, tile) => {
            if (tile.properties.interactable) {
                this.isInteractable = true;
                this.currentInteractable = tile;
            }
        }, null, this);

        // Overlap check for interactable objects in layoutLayer
        this.physics.add.overlap(this.player, this.layoutLayer, (player, tile) => {
            if (tile.properties.door) {
                //console.log('Player is near the door');
                this.nearDoor = true;
                this.doorTile = tile;
            }
        }, null, this);
  
        keyE.on('down', () => {
            if (!this.canInteract) return; // Exit if interaction is on cooldown

            // Early exit if a question is currently active
            if (this.questionActive) {
                return;
            }

            if(this.gptDialogActive){
                return;
            }
        
            // Check if near the door and if all previous puzzles are solved
            if (this.nearDoor && this.lastSolvedId === 5 && this.passcodeNumbers.length === 5) {
                this.askForPasscode();
                return; // Exit the function after triggering the passcode dialog
            }

            // Handle interactions with other objects
            if (this.isInteractable) {
                const interactableId = this.currentInteractable? this.currentInteractable.properties['id']: null;
                if (interactableId <= 5 && interactableId === this.lastSolvedId + 1) {
                    console.log('Interacting with object:', interactableId);
                    this.showDialogBox();
                } 
                else if(interactableId === -1){
                    const bootUp = this.sound.add('bootUp');
                    bootUp.play({volume : 0.5});
                    console.log("GPT hint accessed");
                    //dialog for GPT prompt and response
                    this.gptDialog();
                }
                else {
                    console.log('No interactable objects in range')
                }
                return; // Exit the function after triggering the object interaction
            } 

            this.canInteract = false; // Disable further interactions
            this.time.delayedCall(500, () => { // Re-enable interactions after 100ms
                this.canInteract = true;
            });
        
            // If the code execution reaches this point, the player is not interacting with any object or door
            console.log('No interactable object in range.');
        });
        
        // Call the function to create UI components for the dialog box
        this.createDialogComponents();

        let timerOffsetX = -50;
        let timerOffsetY = 100;
        let timerX = this.player.x + timerOffsetX;
        let timerY = this.player.y - timerOffsetY;

        //add in timer
        this.timerText = this.add.text(timerX, timerY, 'Time: 10:00', {
            fontSize: '16px',
            fill: '#ffffff'
        }).setScrollFactor(1); // Keep the timer static on the screen
        this.timerText.setStyle({
            backgroundColor: '#0008', // Semi-transparent black background
            padding: { x: 10, y: 5 }
        });

        //add life points
        let lifepointsX = timerX;
        let lifepointsY = timerY + 20;
        // Initialize the life points text
        this.lifePointsText = this.add.text(lifepointsX, lifepointsY, 'Lives: ' + this.lifePointsValue, {
            fontSize: '16px',
            fill: '#ffffff'
        }).setScrollFactor(1); // Keep the life points static on the screen
        this.lifePointsText.setStyle({
            backgroundColor: '#0008', // Semi-transparent black background
            padding: { x: 10, y: 5 }
        });

        //HUD for passcode
        let hudTextX = timerX; 
        let hudTextY = lifepointsY + 20; 

        // Create the HUD text at the specified position
        this.hudText = this.add.text(hudTextX, hudTextY, 'Passcode: ', {
            fontSize: '16px',
            fill: '#ffffff'
        }).setScrollFactor(1);

        this.hudText.setStyle({
            backgroundColor: '#0008', // Semi-transparent black background
            padding: { x: 10, y: 5 }
        });

        //Hint
        let hintX  = timerX;
        let hintY = hudTextY + 20;

        this.hintText = this.add.text(hintX,hintY, 'Hints Remaining:' + this.hintRemaining, {
            fontSize: '16px',
            fill: '#ffffff'
        }).setScrollFactor(1);

        this.hintText.setStyle({
            backgroundColor: '#0008', // Semi-transparent black background
            padding: { x: 10, y: 5 }
        });

        // Now create the welcome message
        this.createWelcomeMessage("Here is your first clue of the game : \nFind the golden globe!");

    }

    update() {
        
        //reset isInteractable when player moves away
        let stillNearInteractable = false;

        [this.furnitureLayer, this.miscLayer].forEach(layer => {
            const tile = layer.getTileAtWorldXY(this.player.x, this.player.y);
            if (tile && tile.properties.interactable) {
                stillNearInteractable = true;
                this.currentInteractable = tile;
            }
        });

        if (!stillNearInteractable) {
            this.isInteractable = false;
            //this.currentInteractable = null;
        }

        const doorTile = this.layoutLayer.getTileAtWorldXY(this.player.x, this.player.y);
        this.nearDoor = doorTile && doorTile.properties.door;
        
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

        let timerOffsetX = -50;
        let timerOffsetY = 100;
        let timerX = this.player.x + timerOffsetX; // 380 pixels from the right edge
        let timerY = this.player.y - timerOffsetY ; // 155 pixels from the top

        this.timerText.setPosition(timerX, timerY);
        
        let lifepointsX = timerX;
        let lifepointsY = timerY + 20;
        this.lifePointsText.setPosition(lifepointsX,lifepointsY);

        let hudTextX = timerX; 
        let hudTextY = lifepointsY + 20;
        this.hudText.setText(`Passcode: ${this.passcodeNumbers.join('')}`).setPosition(hudTextX,hudTextY);

        let hintX  = timerX;
        let hintY = hudTextY + 20;
        
        this.hintText.setPosition(hintX,hintY);

        // Use this.dialogWidth and this.dialogHeight here
        const camCenterX = this.cameras.main.scrollX + this.cameras.main.width / 2;
        const camCenterY = this.cameras.main.scrollY + this.cameras.main.height / 2;
        
        // Adjust these lines to use the class properties
        this.dialogBox.setPosition(camCenterX, camCenterY);
        this.questionText.setPosition(camCenterX, camCenterY - this.dialogHeight / 4); 
        this.closeButton.setPosition(camCenterX, camCenterY + this.dialogHeight / 4); 

        // Calculate the positions for the answer buttons
        const baseY = this.questionText.getBottomCenter().y + 10; // 10 pixels below the question text
        const totalButtonHeight = this.answerButtons.reduce((sum, btn) => sum + btn.height, 0);
        const totalSpacing = (this.closeButton.getTopCenter().y - baseY - totalButtonHeight);
        const buttonSpacing = totalSpacing / (this.answerButtons.length + 1);

        let currentY = baseY + buttonSpacing;
        this.answerButtons.forEach((button, index) => {
            button.setPosition(this.dialogBox.x, currentY);
            currentY += button.height + buttonSpacing;
        });

        //stop player movement when question is active (after questions populated)
        if(this.questionActive || this.gptDialogActive){
            this.player.body.setVelocity(0);
            return;
        }
        
    }

    displayGptResponse(gptResponse) {
        console.log("Entered prompt area");
    
        // Create dialog component
        const gptDialogBoxcx = document.createElement('div');
        gptDialogBoxcx.style.position = 'fixed';
        gptDialogBoxcx.style.top = '50%';
        gptDialogBoxcx.style.left = '50%';
        gptDialogBoxcx.style.transform = 'translate(-50%, -50%)';
        gptDialogBoxcx.style.padding = '20px';
        gptDialogBoxcx.style.backgroundColor = '#f5deb3'; // Backup color (wheat-like)
        gptDialogBoxcx.style.backgroundSize = 'cover'; // Ensures the texture covers the box
        gptDialogBoxcx.style.color = '#000000';
        gptDialogBoxcx.style.borderRadius = '10px';
        gptDialogBoxcx.style.border = '5px solid #8B4513'; // Brown border
        gptDialogBoxcx.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        gptDialogBoxcx.style.zIndex = '1000';
        gptDialogBoxcx.style.display = 'flex';
        gptDialogBoxcx.style.flexDirection = 'column';
        gptDialogBoxcx.style.justifyContent = 'center';
        gptDialogBoxcx.style.alignItems = 'center';
    
        // Dynamically set the dialog box width based on text length
        const approximateWidth = Math.min(600, Math.max(300, gptResponse.length * 10));
        gptDialogBoxcx.style.width = `${approximateWidth}px`;
        gptDialogBoxcx.style.maxHeight = '600px'; // Max height limit
        gptDialogBoxcx.style.overflowY = 'auto'; // Scroll for overflow content
    
        document.body.appendChild(gptDialogBoxcx);
    
        // Create and append response text
        const gptResponseText = document.createElement('p');
        gptResponseText.innerText = gptResponse;
        gptResponseText.style.textAlign = 'center';
        gptResponseText.style.fontSize = '20px';
        gptResponseText.style.margin = '0';
        gptResponseText.style.fontFamily = '"Press Start 2P", monospace'; // Pixelated font
        gptResponseText.style.imageRendering = 'pixelated'; // Makes the text look pixelated on certain browsers
        
        // Set text color to brown
        gptResponseText.style.color = '#8B4513'; // Brown color
    
        // Increase spacing between words and lines for better aesthetics
        gptResponseText.style.wordSpacing = '5px'; // Space between words
        gptResponseText.style.lineHeight = '1.6'; // Space between lines
        gptResponseText.style.padding = '10px'; // Add padding for better aesthetics
        gptDialogBoxcx.appendChild(gptResponseText);
    
        // Create Close button below the response
        const closeButton = document.createElement('button');
        closeButton.innerHTML = 'Close';
        closeButton.style.marginTop = '20px';
        closeButton.style.padding = '10px 20px';
        closeButton.style.backgroundColor = '#333';
        closeButton.style.color = '#ffffff';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        gptDialogBoxcx.appendChild(closeButton);
    
        // Close button functionality
        closeButton.addEventListener('click', () => {
            document.body.removeChild(gptDialogBoxcx); // Remove dialog box
            //this.scene.resume(); // Resume the scene
        });
    }
    
    gptDialog() {
        this.gptDialogActive = true;
    
        let hintLeft = parseInt(this.hintRemaining, 10);
        if (hintLeft < 1) {
            this.gptDialogActive = false;
            return;
        }
    
        // Create modal view background
        const modalBackground = document.createElement('div');
        modalBackground.style.position = 'fixed';
        modalBackground.style.top = '0';
        modalBackground.style.left = '0';
        modalBackground.style.width = '100%';
        modalBackground.style.height = '100%';
        modalBackground.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Grey background
        modalBackground.style.display = 'flex';
        modalBackground.style.justifyContent = 'center';
        modalBackground.style.alignItems = 'center';
        modalBackground.style.zIndex = '999'; // Ensure it's on top
    
        // Create current clue display
        const clueText = document.createElement('p');
        clueText.innerText = "Current Clue: " + this.currentClueMessage;
        clueText.style.position = 'absolute';
        clueText.style.top = '30%'; // Adjusted position
        clueText.style.left = '50%';
        clueText.style.transform = 'translate(-50%, -50%)'; // Centers the text
        clueText.style.fontSize = '35px';
        clueText.style.color = '#8B4513'; // Brown text color
        clueText.style.width = '1200px'; // Set a specific width
        clueText.style.backgroundColor = '#f5deb3'; // Wheat-like background
        clueText.style.fontFamily = '"Press Start 2P", monospace'; // Pixelated font
        clueText.style.imageRendering = 'pixelated'; // Makes the text look pixelated on certain browsers
        clueText.style.wordSpacing = '5px'; // Increase spacing between words
        clueText.style.lineHeight = '1.6'; // Increase line height for better aesthetics
        clueText.style.padding = '10px'; // Add padding for better aesthetics
        clueText.style.textAlign = 'center'; // Center-align text within the paragraph

        const getHintButton = document.createElement('a');
        getHintButton.innerText = 'Get Hint';
        getHintButton.style.display = 'inline-block';
        getHintButton.style.padding = '15px 30px';
        getHintButton.style.background = 'linear-gradient(45deg, #6a11cb, #2575fc)';
        getHintButton.style.color = 'white';
        getHintButton.style.textAlign = 'center';
        getHintButton.style.textDecoration = 'none';
        getHintButton.style.fontSize = '18px';
        getHintButton.style.borderRadius = '25px';
        getHintButton.style.fontFamily = '"Poppins", sans-serif';
        getHintButton.style.boxShadow = '0px 4px 6px rgba(0, 0, 0, 0.1)';
        getHintButton.style.transition = 'transform 0.2s, box-shadow 0.2s';

        // Add hover effect for interactivity
        getHintButton.addEventListener('mouseenter', () => {
            getHintButton.style.transform = 'scale(1.05)';
            getHintButton.style.boxShadow = '0px 6px 10px rgba(0, 0, 0, 0.2)';
        });

        getHintButton.addEventListener('mouseleave', () => {
            getHintButton.style.transform = 'scale(1)';
            getHintButton.style.boxShadow = '0px 4px 6px rgba(0, 0, 0, 0.1)';
        });
    
        // Create Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerText = "Close"; // Button text
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '75%'; // Adjusted position for more spacing
        closeBtn.style.left = '50%';
        closeBtn.style.transform = 'translate(-50%, -50%)';
        closeBtn.style.fontSize = '24px'; // Adjust the font size for the button
        closeBtn.style.padding = '10px 20px'; // Button padding
        closeBtn.style.cursor = 'pointer'; // Change cursor on hover
    
        // Close button functionality
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modalBackground); // Remove the dialog box
            //this.scene.resume(); // Resume the scene
            this.gptDialogActive = false;
        });

        getHintButton.addEventListener('click', () => {
            let prompt = this.currentQuestion.question;
            const data = {prompt};
            document.body.removeChild(modalBackground);
            let hintLeft = parseInt(this.hintRemaining, 10) - 1;
            this.hintText.setText('Hints Remaining: ' + hintLeft);
            this.hintRemaining = hintLeft.toString();
            fetch('https://mathmysteryfinal.onrender.com/chatgpt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                console.log('ChatGPT response', data);
                // Access the value obtained
                let fetchResponse = data.response;
                console.log('fetchedResponse', fetchResponse);
                // Display the response on the game
                this.displayGptResponse(fetchResponse);
                this.gptDialogActive = false;  
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
        });
    
        document.body.appendChild(modalBackground);
        modalBackground.appendChild(clueText);
        modalBackground.appendChild(getHintButton);
        modalBackground.appendChild(closeBtn);
    }
    
    createWelcomeMessage(clueMessage) {
        // Pause the current scene
        this.scene.pause();
    
        // Create dialog component for the welcome message
        const welcomeDialogBox = document.createElement('div');
        welcomeDialogBox.style.position = 'fixed';
        welcomeDialogBox.style.top = '50%';
        welcomeDialogBox.style.left = '50%';
        welcomeDialogBox.style.transform = 'translate(-50%, -50%)';
        welcomeDialogBox.style.padding = '20px';
        welcomeDialogBox.style.backgroundColor = '#f5deb3'; // Backup color (wheat-like)
        welcomeDialogBox.style.backgroundSize = 'cover'; // Ensures the texture covers the box
        welcomeDialogBox.style.color = '#000000';
        welcomeDialogBox.style.borderRadius = '10px';
        welcomeDialogBox.style.border = '5px solid #8B4513'; // Brown border
        welcomeDialogBox.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        welcomeDialogBox.style.zIndex = '1000';
        welcomeDialogBox.style.display = 'flex';
        welcomeDialogBox.style.flexDirection = 'column';
        welcomeDialogBox.style.justifyContent = 'center';
        welcomeDialogBox.style.alignItems = 'center';
    
        // Set the width based on the clue message length
        const approximateWidth = Math.min(600, Math.max(300, clueMessage.length * 10));
        welcomeDialogBox.style.width = `${approximateWidth}px`;
        welcomeDialogBox.style.maxHeight = '600px'; // Max height limit
        welcomeDialogBox.style.overflowY = 'auto'; // Scroll for overflow content
    
        document.body.appendChild(welcomeDialogBox);
    
        // Create and append clue message text
        const clueText = document.createElement('p');
        clueText.innerText = clueMessage;
        clueText.style.textAlign = 'center';
        clueText.style.fontSize = '20px';
        clueText.style.margin = '0';
        clueText.style.fontFamily = '"Press Start 2P", monospace'; // Pixelated font
        clueText.style.imageRendering = 'pixelated'; // Makes the text look pixelated on certain browsers
        clueText.style.color = '#8B4513'; // Brown color
    
        // Increase spacing between words and lines for better aesthetics
        clueText.style.wordSpacing = '5px'; // Space between words
        clueText.style.lineHeight = '1.6'; // Space between lines
        clueText.style.padding = '10px'; // Add padding for better aesthetics
    
        // Append the clue text to the dialog box
        welcomeDialogBox.appendChild(clueText);
    
        // Create Close button below the clue text
        const closeButton = document.createElement('button');
        closeButton.innerHTML = 'Close';
        closeButton.style.marginTop = '20px';
        closeButton.style.padding = '10px 20px';
        closeButton.style.backgroundColor = '#333';
        closeButton.style.color = '#ffffff';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        welcomeDialogBox.appendChild(closeButton);
    
        // Close button functionality
        closeButton.addEventListener('click', () => {
            document.body.removeChild(welcomeDialogBox); // Remove dialog box
            this.scene.resume(); // Resume the scene
            this.startTime = this.getCurrentDateTimeForSQL();
            //start timer when they enter the room
            this.time.addEvent({
                delay: 1000, // 1000ms = 1 second
                callback: this.updateTimer,
                callbackScope: this, // Corrected the typo here
                loop: true
            });
        });
    }
    
    //trigger when detect student facing issues
    cutSceneMessage() {
        // Pause scene -> Display Cutscene -> Close Button -> Resume gameplay
        this.gptDialogActive = true;
    
        //get current question and then prompt GPT for hints, steps, niche response and scaffolding
        const currQuest = this.currentQuestion.question;
        console.log("Current question : " + currQuest);

        let prompt = currQuest;
        const data = { prompt };

        fetch('https://mathmysteryfinal.onrender.com/chatgpt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            console.log('ChatGPT response', data);
            // Access the value obtained
            let fetchResponse = data.response;
            console.log('fetchedResponse', fetchResponse);
            //augment abit the fetchedResponse
            let troubleText = "You seem to be facing some issues...\n Here are some hints!\n";
            fetchResponse = troubleText + fetchResponse ;
            // Display the response on the game
            this.displayGptResponse(fetchResponse);
            this.gptDialogActive = false;  
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });

    }

    updateTimer() {
        this.initialTime -= 1; // Decrease the timer by one second
    
        // Calculate minutes and seconds from the initialTime
        var minutes = Math.floor(this.initialTime / 60);
        var seconds = this.initialTime % 60;
        
        // Format the time to fit 00:00
        var formattedTime = this.zeroPad(minutes, 2) + ':' + this.zeroPad(seconds, 2);
    
        this.timerText.setText('Time: ' + formattedTime);
    
        // If the timer reaches zero, end the game
        if(this.initialTime <= 0) {

            this.endTime = this.getCurrentDateTimeForSQL();
            // Correct passcode
            //adaptiveMoment
            let sessionUser = sessionStorage.getItem("username");
            let user_id = sessionUser;
            let skill = 'Numbers';
            let mastery = this.knowledge_state;
            let room = 'Room1';
            let timeTaken = this.calculateTimeTaken(this.startTime, this.endTime); //come back here
            let starting_hints = parseInt(this.initialHint,10);
            let hints_used = starting_hints - parseInt(this.hintRemaining, 10);
            let starting_life = parseInt(this.initialLifeValue,10);
            let life_remain = parseInt(this.lifePointsValue, 10);
            let game_status = "Time Runs Out";
            let created_at = this.endTime;
            this.saveLearnerProgress(user_id, skill, mastery, room, timeTaken, starting_hints, hints_used, starting_life , life_remain, game_status, created_at);

            this.timeExpired();
        }
    }

    zeroPad(number, size) {
        var stringNumber = String(number);
        while (stringNumber.length < (size || 2)) {
            stringNumber = "0" + stringNumber;
        }
        return stringNumber;
    }

    timeExpired() {
        // Stop all timers
        this.time.removeAllEvents();
    
        // Display the message to the player
        this.gameOverDisplay('Times up! You failed to escape.\n Game will restart in 10 seconds.',1);
       
    }

    async fetchQuestions() {
        try {
            const response = await fetch('https://mathmysteryfinal.onrender.com/numbers');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            this.questions = await response.json();
            console.log(this.questions);
            
            //split to diff categories here
            this.questions.forEach(question => {
                if (question.difficulty === 'Easy') {
                    this.easyQuestions.push(question);
                } else if (question.difficulty === 'Medium') {
                    this.mediumQuestions.push(question);
                } else if (question.difficulty === 'Hard') {
                    this.hardQuestions.push(question);
                }
            });

            console.log('Easy Questions:', this.easyQuestions);
            console.log('Medium Questions:', this.mediumQuestions);
            console.log('Hard Questions:', this.hardQuestions);

        } catch (error) {
            console.error('Error fetching algebra questions:', error);
            throw error; // rethrow to handle it in the calling context if needed
        }
    }

    showPopupMessage(message, duration) {
        // Activate the dialog box
        this.dialogBox.setVisible(true);
    
        // Set the text for the dialog box to the message
        this.questionText.setText(message);
        this.questionText.setVisible(true);
    
        // Hide the answer buttons and the close button as they are not needed for this popup
        this.answerButtons.forEach(button => button.setVisible(false));
        this.closeButton.setVisible(false);
    
        // After 'duration' milliseconds, hide the dialog box and the message
        this.time.delayedCall(duration, () => {
            this.dialogBox.setVisible(false);
            this.questionText.setVisible(false);
        });
    }
      
    createDialogComponents() {
        // Calculate scaled dimensions
        this.dialogWidth = this.cameras.main.width / this.cameras.main.zoom; // Class property
        this.dialogHeight = this.cameras.main.height / this.cameras.main.zoom; // Class property
    
        // Use these scaled dimensions for your dialog components
        this.dialogBox = this.add.rectangle(0, 0, this.dialogWidth, this.dialogHeight, 0x000000);
        this.dialogBox.setOrigin(0.5);
        this.dialogBox.setStrokeStyle(2, 0xffffff);
        this.dialogBox.setAlpha(0.8);
        this.dialogBox.setVisible(false);
      
        // Question text
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        this.questionText = this.add.text(centerX, centerY - 80, '', { 
          fontSize: '16px', 
          color: '#fff',
          align: 'center',
          wordWrap: { width: 280, useAdvancedWrap: true }
        }).setOrigin(0.5);
        this.questionText.setVisible(false);
    

        // Define the starting Y position of the first answer button.
        // It should be somewhere below the question text.
        let answerButtonY = centerY + 20; // adjust this value as needed

        // Define the spacing between the answer buttons.
        let buttonSpacing = 5; // adjust this value as needed

        // Create answer buttons
        this.answerButtons = [];
        for (let i = 0; i < 4; i++) {
            let button = this.add.text(centerX, answerButtonY, '', { 
                fontSize: '16px', 
                color: '#fff',
                backgroundColor: '#666',
                padding: { x: 10, y: 5 },
                align: 'center', // Add this line
                fixedWidth: 220, // adjust this width as needed
                fixedHeight: 20, // adjust this height as needed
            }).setOrigin(0.5).setInteractive();
  
            button.on('pointerdown', () => this.selectAnswer(button.text));
            button.setVisible(false);
            this.answerButtons.push(button);

            // Update the Y position for the next button.
            answerButtonY += button.height + buttonSpacing;
        }
    
        this.closeButton = this.add.text(centerX, centerY + 80, 'Close', { 
            fontSize: '16px', 
            color: '#fff',
            backgroundColor: '#666',
            padding: { x: 10, y: 5 },
        }).setOrigin(0.5).setInteractive();
        
        this.closeButton.on('pointerdown', () => {
            this.closeDialogBox(); // Corrected the function call
            let consecutiveWrongAttemptsVal = parseInt(this.consecutiveWrongAttempts, 10);
            
            // Check if consecutiveWrongAttemptsVal is greater than or equal to 2
            if (consecutiveWrongAttemptsVal >= 2) {
                console.log("Triggering cutscene...");
                this.cutSceneMessage();
            }

        });
        
        this.closeButton.setVisible(false); 
    }

    showDialogBox() {
        console.log('Question Opened');
        //if flag active generate new question (user answer correctly, else flag remains false so question dnt get regenerated)
        if(this.responseFlag){
            this.responseFlag = false; //dangerous
            this.questionStartTime = this.getCurrentDateTimeForSQL(); // put outside because need to get response time if wrong also; but need to reset it after recording response
            
            console.log("Question start Time when dialog opens: ", this.questionStartTime);
            const currentKnowledgeState = this.knowledge_state;
            console.log("Knwledge state b4 picking question : " + currentKnowledgeState);
            //easy level
            if(currentKnowledgeState < 0.5){
                //grab question from easyQuestions
                if (this.currentQuestionIndex === null) {
                    this.currentQuestionIndex = Phaser.Math.Between(0, this.easyQuestions.length - 1);   
                }
                this.question = this.easyQuestions[this.currentQuestionIndex];
            }
            else if(currentKnowledgeState <0.75 && currentKnowledgeState >= 0.5){
                //grab question from hardQuestions
                if (this.currentQuestionIndex === null) {
                    this.currentQuestionIndex = Phaser.Math.Between(0, this.mediumQuestions.length - 1);   
                }
                this.question = this.mediumQuestions[this.currentQuestionIndex];
            }
            else{
                //grab question from mediumQuestions
                if (this.currentQuestionIndex === null) {
                    this.currentQuestionIndex = Phaser.Math.Between(0, this.hardQuestions.length - 1);   
                }
                this.question = this.hardQuestions[this.currentQuestionIndex];
            }
            console.log("Current Question difficulty : " + this.question.difficulty);
        }
        //modify question to be dynamic based on knowledge_state
        
        this.questionActive = true; // Set the flag to true when a question is shown
        this.currentQuestion = this.question;
        this.questionText.setText(this.question.question);
        this.questionText.setVisible(true);
    
        this.questionText.setY(this.dialogBox.y - this.dialogHeight / 4);
        const answers = [this.question.answer1, this.question.answer2, this.question.answer3, this.question.answer4];
        Phaser.Utils.Array.Shuffle(answers);
    
        // Assuming the dialog box is centered and visible
        let startY = this.questionText.getBottomCenter().y + 20;
        let totalHeight = startY;
    
        // Calculate the total space needed for all buttons
        for (let i = 0; i < this.answerButtons.length; i++) {
            totalHeight += this.answerButtons[i].height + 10; // 10 is the spacing between buttons
        }
    
        let endY = this.closeButton.getTopCenter().y - 20; // 20 pixels above the close button
        let availableSpace = endY - startY;
        let spacing = (availableSpace - totalHeight) / (this.answerButtons.length + 1);
    
        for (let i = 0; i < this.answerButtons.length; i++) {
            let button = this.answerButtons[i];
            button.setText(answers[i]);
            button.setY(startY + (button.height + spacing) * i);
            button.setVisible(true);
            button.setData('isCorrect', answers[i] === this.question.correct_answer);
        }
    
        this.dialogBox.setVisible(true);
        this.closeButton.setVisible(true);

    }

    selectAnswer(selected) {
        this.questionEndTime = this.getCurrentDateTimeForSQL();
        console.log("Question Start Time when selected answer : ", this.questionStartTime);
        console.log("Question End time when open dialog", this.questionEndTime);
        //call method to calculate question response time diff in seconds
        let questionResponseTime = this.calculateTimeTakenSecondsForBKT(this.questionStartTime, this.questionEndTime);

        // Hide the answer buttons
        this.answerButtons.forEach(button => button.setVisible(false));
    
        // Get the correct answer for the current question
        const correctAnswer = this.currentQuestion.correct_answer;
    
        // Check if the selected answer is correct
        const isCorrect = selected === correctAnswer;
        const resultText = isCorrect ? 'Correct!' : 'Incorrect!';
    
        // Prepare the result lines
        let resultLines = [
            `Selected Answer: ${selected}`,
            resultText
        ];

        let currentTime = this.getCurrentDateTimeForSQL();
        
        //need to add logic here to log all response and save into a data structure before being processed into SQL -CY
        //what i need is to log student id, skill id/name, correctness, question ID [[]]
        if (isCorrect) {

            const correctSound = this.sound.add('correct');
            correctSound.play({volume : 0.5});

            //reset consecutiveWrongAttempts to 0
            this.consecutiveWrongAttempts = 0;
            //call the BKT API new & update the knowledge state
            this.getMastery(this.knowledge_state, 1, this.currentQuestion.difficulty, 0.8);
            console.log("Knowledge state updated : ", this.knowledge_state);

            setTimeout(()=>{
                let sessionUser = sessionStorage.getItem("username");
                this.recordResponse(sessionUser, this.currentQuestion.question_id, this.currentQuestion.question, this.currentQuestion.difficulty, selected, 1, "Numbers", this.knowledge_state, questionResponseTime, currentTime);
                console.log("saved correct response");
                this.questionStartTime = null;
            },500)
            
            // Get the correct hint for the next object ID
            const nextId = this.lastSolvedId + 1;
            const hintMessage = this.hints[nextId] || "You've solved all the challenges!";
            this.currentClueMessage = hintMessage;
    
            // Generate a random number for the passcode
            const passcodeNumber = Phaser.Math.Between(0, 9);
        
            // Add the number to the array of collected numbers
            this.passcodeNumbers.push(passcodeNumber);
    
            // Update the HUD text
            this.hudText.setText(`Passcode: ${this.passcodeNumbers.join('')}`);
    
            // Display the number along with the hint
            resultLines.push(`\nNumber collected for passcode: ${passcodeNumber}`);
            resultLines.push('', hintMessage); // Add the unique hint for the next object
            this.currentQuestionIndex = null;
            this.lastSolvedId = this.currentInteractable.properties['id'];

            this.responseFlag = true;
        }
        else{
            const wrongSound = this.sound.add('wrong');
            wrongSound.play({volume : 0.5});
            //get current value and + 1 for consecutiveWrongAttempts

            let consecutiveWrongAttemptsVal = parseInt(this.consecutiveWrongAttempts, 10) + 1;
            this.consecutiveWrongAttempts = consecutiveWrongAttemptsVal;
            console.log("Current consecutive wrong attempts : " + this.consecutiveWrongAttempts);
            //call the BKT API new & update the knowledge state
            this.getMastery(this.knowledge_state, 0, this.currentQuestion.difficulty, 0.8);
            console.log("Knowledge state updated : ", this.knowledge_state);
            this.responseFlag = false;

            setTimeout(()=>{
                let sessionUser = sessionStorage.getItem("username");
                this.recordResponse(sessionUser, this.currentQuestion.question_id, this.currentQuestion.question, this.currentQuestion.difficulty, selected, -1, "Numbers", this.knowledge_state, questionResponseTime,currentTime);
                console.log("saved wrong response");
                this.questionStartTime = null;
            },500)
            
            let updateLife = parseInt(this.lifePointsValue, 10) - 1;
            // Update the life points text
            this.lifePointsText.setText('Lives: ' + updateLife);

            //if life reaches 0, losing screen etc
            if (updateLife < 1){
                this.endTime = this.getCurrentDateTimeForSQL();
                let sessionUser = sessionStorage.getItem("username");
                let user_id = sessionUser;
                let skill = 'Numbers';
                let mastery = this.knowledge_state;
                let room = 'Room1';
                let timeTaken = this.calculateTimeTaken(this.startTime, this.endTime); //come back here
                let starting_hints = parseInt(this.initialHint,10);
                let hints_used = starting_hints - parseInt(this.hintRemaining, 10);
                let starting_life = parseInt(this.initialLifeValue,10);
                let life_remain = parseInt(this.lifePointsValue, 10);
                let game_status = "No Lives Remaining";
                let created_at = this.endTime;
                this.saveLearnerProgress(user_id, skill, mastery, room, timeTaken, starting_hints, hints_used, starting_life , life_remain, game_status, created_at);
                this.gameOverDisplay('No more lives!\n You will be redirected to the main menu screen in 5 seconds',0);
            }

            // Update the life points value
            this.lifePointsValue = updateLife.toString(); // Convert it back to string for consistency
        }
        
        // Update the question text to show the result and hint if applicable
        this.questionText.setText(resultLines.join('\n'));
    
        this.questionText.setStyle({
            fontSize: '16px',
            color: '#fff',
            backgroundColor: '#0008', // Semi-transparent black background
            padding: { x: 10, y: 5 },
            align: 'center',
            wordWrap: { width: this.dialogWidth * 0.8 } // Wrap text within 80% of dialog width
        });
        
        // Set the question text to visible and position it correctly
        this.questionText.setVisible(true);
        this.questionText.setOrigin(0.5);
        this.questionText.setPosition(this.dialogBox.x, this.dialogBox.y - this.dialogHeight / 4);
    
        // Set the question as answered
        this.questionActive = false;
    }
      
    closeDialogBox() {
        // Hide the question text and dialog box
        this.questionText.setVisible(false);
        this.dialogBox.setVisible(false);
      
        // Hide all answer buttons
        this.answerButtons.forEach(button => {
          button.setVisible(false);
        });

        this.questionActive = false; // Dialog is closed, reset flag
      
        // Reset interactable state
        this.isInteractable = false;

        this.closeButton.setVisible(false);

        this.questionActive = false; // Dialog is closed, reset flag
    }

    askForPasscode() {

        //check if input field exist
        if(document.getElementById('user-passcode-input')){
            console.log("input field active");
            return;
        }
        // Create an HTML input element overlay
        const element = document.createElement('input');
        element.type = 'text';
        element.maxLength = 5; // Limit to 5 characters
        element.id = 'user-passcode-input';
        element.placeholder = "Enter Passcode";

        Object.assign(element.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '24px',
            padding: '12px',
            textAlign: 'center',
            width: '250px',
            border: '2px solid #000',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            outline: 'none',
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
            zIndex: '1000'
        });
    
        document.body.appendChild(element);
        element.focus(); // Automatically focus the input field
    
        // Handle the input submission
        element.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                let userPasscode = element.value.trim();
                document.body.removeChild(element); // Remove the input field from the document
    
                if (userPasscode === this.passcodeNumbers.join('')) {
                    this.endTime = this.getCurrentDateTimeForSQL();
                    // Correct passcode
                    //adaptiveMoment
                    let sessionUser = sessionStorage.getItem("username");
                    let user_id = sessionUser;
                    let skill = 'Numbers';
                    let mastery = this.knowledge_state;
                    let room = 'Room1';
                    let timeTaken = this.calculateTimeTaken(this.startTime, this.endTime);
                    let starting_hints = parseInt(this.initialHint,10);
                    let hints_used = starting_hints - parseInt(this.hintRemaining, 10);
                    let created_at = this.endTime;
                    let starting_life = parseInt(this.initialLifeValue,10);
                    let life_remain = parseInt(this.lifePointsValue, 10);
                    let game_status = 'Game Completed';

                    this.saveLearnerProgress(user_id, skill, mastery, room, timeTaken, starting_hints, hints_used, starting_life , life_remain, game_status, created_at);
                    const doorOpening = this.sound.add('doorOpen');
                    doorOpening.play({volume: 0.5});
                    console.log("Time taken in this room in seconds : ", window.totalTimeTaken);
                    this.scene.start('ClassroomHard',{knowledge_state : this.knowledge_state, hintRemaining : this.hintRemaining, lifePointsValue : life_remain});
                } else {
                    // Incorrect passcode
                    this.showPopupMessage('Incorrect passcode.', 3000);
                }
            }
        });
    }

    //added function to record student interaction with questions
    recordResponse(user_id, question_id, question, difficulty, selected, correctness, skill, mastery, questionResponseTime, created_at){
        const data = {
            user_id,
            question_id,
            question,
            difficulty,
            selected,
            correctness,
            skill,
            mastery,
            questionResponseTime,
            created_at
        };
        
        console.log(JSON.stringify(data));
        //call the API here to save response
        fetch('https://mathmysteryfinal.onrender.com/save_response', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            console.log('Success:', data);
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
    }

    //function to save learner progress to learner model
    saveLearnerProgress(user_id, skill, mastery, room, timeTaken, starting_hints, hints_used, starting_life , life_remain, game_status,created_at){
        const data = {
            user_id,
            skill,
            mastery,
            room,
            timeTaken,
            starting_hints,
            hints_used,
            starting_life,
            life_remain,
            game_status,
            created_at
        };
        
        console.log(JSON.stringify(data));
        fetch('https://mathmysteryfinal.onrender.com/save_learner_progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            console.log('Success:', data);
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
    }

    //function to call bkt api
    getMastery(state, correct, difficulty, response_time){
        const data = {
            state,
            correct,
            difficulty,
            response_time
        };
        console.log(JSON.stringify(data));
        //API to call BKT and get student mastery
        fetch('https://mathmysteryfinal.onrender.com/getStudentMastery', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            console.log('Data from flask', data);
            //access the value obtained
            let fetchedMastery = data.mastery;
            console.log('fetchedMastery', fetchedMastery)
            this.knowledge_state = fetchedMastery
            console.log('Updated knowledge state', this.knowledge_state);
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
    }

    //function to get current time
    getCurrentDateTimeForSQL() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-based, so add 1
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
    
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    
    calculateTimeTaken(startTime, endTime) {
        
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);
    
        // Calculate the difference in milliseconds
        const differenceInMilliseconds = endDate - startDate;
    
        // Convert milliseconds to seconds, minutes, and hours
        const totalSeconds = Math.floor(differenceInMilliseconds / 1000);
        window.totalTimeTaken += totalSeconds;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        let timeTaken = hours + " hours" + minutes + " minutes" + seconds + " seconds"

        return timeTaken;
    }

    calculateTimeTakenSecondsForBKT(startTime, endTime) {
        
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);
    
        // Calculate the difference in milliseconds
        const differenceInMilliseconds = endDate - startDate;
    
        // Convert milliseconds to seconds, minutes, and hours
        const totalSeconds = Math.floor(differenceInMilliseconds / 1000);
        return totalSeconds;
    }

    //display timer's up and no more life game over text
    gameOverDisplay(gameOverMessage, gameOverType){
        this.scene.pause();
        const gameOverMsgBox = document.createElement('div');
        gameOverMsgBox.style.position = 'fixed';
        gameOverMsgBox.style.top = '50%';
        gameOverMsgBox.style.left = '50%';
        gameOverMsgBox.style.transform = 'translate(-50%, -50%)';
        gameOverMsgBox.style.padding = '20px';
        gameOverMsgBox.style.backgroundColor = '#f5deb3'; // Backup color (wheat-like)
        gameOverMsgBox.style.backgroundSize = 'cover'; // Ensures the texture covers the box
        gameOverMsgBox.style.color = '#000000';
        gameOverMsgBox.style.borderRadius = '10px';
        gameOverMsgBox.style.border = '5px solid #8B4513'; // Brown border
        gameOverMsgBox.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        gameOverMsgBox.style.zIndex = '1000';
        gameOverMsgBox.style.display = 'flex';
        gameOverMsgBox.style.flexDirection = 'column';
        gameOverMsgBox.style.justifyContent = 'center';
        gameOverMsgBox.style.alignItems = 'center';
    
        // Set the width based on the clue message length
        const approximateWidth = Math.min(600, Math.max(300, gameOverMessage.length * 10));
        gameOverMsgBox.style.width = `${approximateWidth}px`;
        gameOverMsgBox.style.maxHeight = '600px'; // Max height limit
        gameOverMsgBox.style.overflowY = 'auto'; // Scroll for overflow content
    
        document.body.appendChild(gameOverMsgBox);
    
        // Create and append clue message text
        const gameOverText = document.createElement('p');
        gameOverText.innerText = gameOverMessage;
        gameOverText.style.textAlign = 'center';
        gameOverText.style.fontSize = '20px';
        gameOverText.style.margin = '0';
        gameOverText.style.fontFamily = '"Press Start 2P", monospace'; // Pixelated font
        gameOverText.style.imageRendering = 'pixelated'; // Makes the text look pixelated on certain browsers
        gameOverText.style.color = '#8B4513'; // Brown color
    
        // Increase spacing between words and lines for better aesthetics
        gameOverText.style.wordSpacing = '5px'; // Space between words
        gameOverText.style.lineHeight = '1.6'; // Space between lines
        gameOverText.style.padding = '10px'; // Add padding for better aesthetics
    
        // Append the clue text to the dialog box
        gameOverMsgBox.appendChild(gameOverText);
    
        // Create Close button below the clue text
        const closeButton = document.createElement('button');
        closeButton.innerHTML = 'Close';
        closeButton.style.marginTop = '20px';
        closeButton.style.padding = '10px 20px';
        closeButton.style.backgroundColor = '#333';
        closeButton.style.color = '#ffffff';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        gameOverMsgBox.appendChild(closeButton);
    
        // Close button functionality
        closeButton.addEventListener('click', () => {
            document.body.removeChild(gameOverMsgBox); // Remove dialog box
            this.scene.resume();
            console.log("Triggered close btn for gameover");
            this.showProgress(gameOverType);
        
        });
    }

    showProgress(gameOverTypeStatus){
        console.log("entered show progress");
        //get total time taken using window global storage
        //display user's progress with, upon exiting game is over and redirected to dashboard
        this.scene.pause();

        if(gameOverTypeStatus == 1){
            this.statusText = "Time's up";
        }
        else{
            this.statusText = "No lives remaining";
        }

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
        console.log("Time before trigger : ", window.totalTimeTaken);
        console.log("Time after trigger : ", window.totalTimeTaken);

        let totalTimeTakenSeconds = (window.totalTimeTaken / 60).toFixed(2);
        console.log("TotalTimeTakenSeconds (after divided and rounded)", totalTimeTakenSeconds);
        const performanceDetails = [
            `Topic: Numbers`, //fixed for now
            `Status: ${this.statusText}`, //changes according to which room
            `Mastery: ${this.knowledge_state}`, //data passed
            `Total Time Taken: ${totalTimeTakenSeconds} minutes`, //data stored in window variable
            `Hints Remaining: ${this.hintRemaining}`, //data passed
            `Life Remaining: ${this.lifePointsValue}`, //data passed
            `Remark: Dont worry! Keep trying!.`
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
            window.location.href = '/dashboard';
        }); 
    }

}