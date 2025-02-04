//Tutorial room for Digital Escape Room Game
class Tutorial extends Phaser.Scene{
    constructor(){
        super('Tutorial')
        this.isInteractable = false;
        this.canInteract = true;
        this.questions = []; // to store fetched questions
        this.dialogWidth = null;  
        this.dialogHeight = null;
        this.questionActive = false;
        this.gptDialogActive = false;
        this.currentQuestionIndex = null;
        this.lastSolvedId = 0;
        this.passcodeNumbers = [];
        this.hudText = null;
        this.hintText = [];
        this.hintRemaining = 1;
        this.knowledge_state = 0.1; //need to save to /read from session storage /database
        this.startTime = null; //timer to calculate time spent in the game for engagement
        this.endTime = null;
        this.introductionAccessed = false;
        this.gptAccessed = false;
        this.consecutiveWrongAttempts = 0;

        this.introductionStep = [
            "Welcome to MathMystery! Please begin by heading towards to the terminal located in the middle of the room using the WASD keys and click on the E key!" 
        ];

        //Tutorial session
        this.tutorialStep = [
            "Good Day! My name is Professor Algebrus and i am the director of the academy.",
            "You are a student invited to study at the prestigious Math Academy, a school hidden deep within a different dimensions.",
            "However, upon arrival, you discover something is terribly wrong- the academy's Grand Math Codex, a powerful artifact that maintains the balance of the realm, has been missing!",
            "Without it, the magical barriers protecting the academy will fail, exposing it to dark forces lurking beyond.",
            "There are 3 different rooms, where you will be presented with different kind of questions and in order to progress through you will have to answer each of them correctly to obtain the needed code to leave the current room.",
            "Additional support or hints would also be provided according to the challenge faced by accessing to this terminal again.",
            "Try to interact with the pile of books at the left side of the room!",
            "An Algebra question will be shown and you are required to solve it by selecting the right answer, upon selecting the right answer you will be given a code!",
            "The obtained code will be stored above your character along with the number of hints available to assist you!",
            "Try to solve it and exit the room using the code."
        ];
    }

    preload(){
        this.load.image('door', 'static/assets/themes/1_Generic_32x32.png');
        this.load.image('roombuilder', 'static/assets/themes/Room_Builder_32x32.png');
        this.load.image('classroom','static/assets/themes/5_Classroom_and_library_32x32.png');

        this.load.tilemapTiledJSON('tutorialMap', 'static/assets/tutorialMap.json');

        this.load.spritesheet('player', 'static/assets/player.png', {
            frameWidth: 32,
            frameHeight: 50,
        });
        
        //bg music
        this.load.audio('escapeRoomBGMusic','static/assets/sounds/escapeRoom.mp3');
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

    create(){
        const music = this.sound.add('escapeRoomBGMusic');
        music.play({
            loop : true,
            volume : 0.5
        });
        //Define movespeed
        this.movespeed = 120;

        const map = this.make.tilemap({key: 'tutorialMap'});
        const doorTiles = map.addTilesetImage('Doors', 'door');
        const roombuilderTiles = map.addTilesetImage('RoomBuilder', 'roombuilder');
        const classroomTiles = map.addTilesetImage('Classroom','classroom');

        const layoutLayer = map.createLayer('Layout', [doorTiles, roombuilderTiles,classroomTiles]);
        const furnitureLayer = map.createLayer('Furniture', [doorTiles, roombuilderTiles,classroomTiles]);

        layoutLayer.setCollisionByProperty({ collision: true });
        furnitureLayer.setCollisionByProperty({ collision: true });

        const mapWidth = map.widthInPixels;
        const mapHeight = map.heightInPixels;
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

        this.player = this.physics.add.sprite(480, 500, 'player');
        this.cameras.main.startFollow(this.player, true);
        this.cameras.main.setZoom(2.0);
        this.physics.add.collider(this.player, layoutLayer);
        this.physics.add.collider(this.player, furnitureLayer);
        
        //player walking animation
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

        keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        this.physics.add.overlap(this.player, furnitureLayer, (player, tile) => {
            if (tile.properties.interactable) {
                this.isInteractable = true;
                this.currentInteractable = tile;
            }
        }, null, this);

        // Overlap check for interactable objects in layoutLayer
        this.physics.add.overlap(this.player, layoutLayer, (player, tile) => {
            if (tile.properties.door) {
                console.log('Player is near the door');
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
        
            // Check if near the door and if all previous puzzles are solved (new condition after done all the pretest)
            if (this.nearDoor && this.lastSolvedId === 1 && this.passcodeNumbers.length === 1) {
                this.askForPasscode();
                return; // Exit the function after triggering the passcode dialog
            }

            // Handle interactions with other objects
            if (this.isInteractable) {
                const interactableId = this.currentInteractable.properties['id'];
                if(interactableId <=1 && interactableId === this.lastSolvedId + 1){
                    if(!this.introductionAccessed){
                        alert("Please interact with the terminal first!");
                        return;
                    }
                    console.log('Interacting with object:', interactableId);
                    this.showDialogBox();
                } 
                else if(interactableId === -1){
                    const bootUp = this.sound.add('bootUp');
                    bootUp.play({volume : 0.5});
                    console.log("GPT hint accessed");
                    if(!this.introductionAccessed){
                        this.createTutorialDialogue(this.tutorialStep);
                        this.introductionAccessed = true;
                    }
                    else if(this.introductionAccessed && !this.gptAccessed){
                        this.gptDialog();
                        this.gptAccessed = true;
                    }
                }
                else {
                    //this.showPopupMessage('Please solve the previous challenge first.', 3000);
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

        this.createDialogComponents();

        let timerOffsetX = -50;
        let timerOffsetY = 100;
        let timerX = this.player.x + timerOffsetX;
        let timerY = this.player.y - timerOffsetY;

        //HUD for passcode
        let hudTextX = timerX; 
        let hudTextY = timerY + 20; 

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

        this.createTutorialDialogue(this.introductionStep);
    }

    update(){

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

        let hudTextX = timerX; 
        let hudTextY = timerY + 20;
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

        if(this.questionActive || this.gptDialogActive){
            this.player.body.setVelocity(0);
            return;
        }
    }

    displayGptResponse(gptResponse) {
        console.log("Entered prompt area");
    
        // Create full-screen overlay
        const gptDialogBoxcx = document.createElement('div');
        gptDialogBoxcx.style.position = 'fixed';
        gptDialogBoxcx.style.top = '0';
        gptDialogBoxcx.style.left = '0';
        gptDialogBoxcx.style.width = '100vw';
        gptDialogBoxcx.style.height = '100vh';
        gptDialogBoxcx.style.backgroundColor = 'rgba(0,0,0,0.7)';
        gptDialogBoxcx.style.zIndex = '1000';
        gptDialogBoxcx.style.display = 'flex';
        gptDialogBoxcx.style.justifyContent = 'center';
        gptDialogBoxcx.style.alignItems = 'center';
    
        // Main content container
        const contentContainer = document.createElement('div');
        contentContainer.style.width = 'min(90vw, 800px)';
        contentContainer.style.height = 'min(80vh, 600px)';
        contentContainer.style.backgroundColor = '#f5e6c8';
        contentContainer.style.backgroundImage = 'linear-gradient(to bottom right, #f5deb3, #e6d0a9)';
        contentContainer.style.border = '3px solid #8B4513';
        contentContainer.style.borderRadius = '10px';
        contentContainer.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
        contentContainer.style.display = 'flex';
        contentContainer.style.flexDirection = 'column';
    
        // Header section
        const header = document.createElement('div');
        header.style.padding = '15px';
        header.style.borderBottom = '2px solid #8B4513';
        header.style.backgroundColor = '#8B451322';
        header.innerHTML = '<h2 style="margin:0; color:#5a2d0c; font-family: \'MedievalSharp\', cursive;">Ancient Scroll</h2>';
        contentContainer.appendChild(header);
    
        // Scrollable content area
        const scrollContent = document.createElement('div');
        scrollContent.style.flex = '1';
        scrollContent.style.padding = '20px';
        scrollContent.style.overflowY = 'auto';
        scrollContent.style.position = 'relative';
    
        // Response text with proper alignment
        const gptResponseText = document.createElement('div');
        gptResponseText.innerHTML = gptResponse;
        gptResponseText.style.color = '#4a2c0d';
        gptResponseText.style.fontFamily = '\'Crimson Text\', serif';
        gptResponseText.style.fontSize = '1.1rem';
        gptResponseText.style.lineHeight = '1.6';
        gptResponseText.style.textAlign = 'left';
        gptResponseText.style.textShadow = '1px 1px 2px rgba(255,255,255,0.3)';
        
        // Add parchment-like texture
        const textureOverlay = document.createElement('div');
        textureOverlay.style.position = 'absolute';
        textureOverlay.style.top = '0';
        textureOverlay.style.left = '0';
        textureOverlay.style.width = '100%';
        textureOverlay.style.height = '100%';
        textureOverlay.style.background = `
            linear-gradient(to bottom, 
                rgba(255,255,255,0.1) 0%, 
                rgba(0,0,0,0.1) 100%),
            url('data:image/png;base64,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')
        `;
        textureOverlay.style.pointerEvents = 'none';
    
        scrollContent.appendChild(gptResponseText);
        scrollContent.appendChild(textureOverlay);
        contentContainer.appendChild(scrollContent);
    
        // Footer with close button
        const footer = document.createElement('div');
        footer.style.padding = '15px';
        footer.style.borderTop = '2px solid #8B4513';
        footer.style.textAlign = 'right';
    
        const closeButton = document.createElement('button');
        closeButton.innerHTML = 'Close Scroll ✖';
        closeButton.style.padding = '8px 20px';
        closeButton.style.backgroundColor = '#8B4513';
        closeButton.style.color = '#fff';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '4px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontFamily = '\'MedievalSharp\', cursive';
        closeButton.style.transition = 'all 0.3s ease';
        
        // Hover effects
        closeButton.onmouseover = () => {
            closeButton.style.backgroundColor = '#6b3010';
            closeButton.style.transform = 'scale(1.05)';
        };
        closeButton.onmouseout = () => {
            closeButton.style.backgroundColor = '#8B4513';
            closeButton.style.transform = 'scale(1)';
        };
    
        closeButton.addEventListener('click', () => {
            document.body.removeChild(gptDialogBoxcx);
            this.scene.resume();
        });
    
        footer.appendChild(closeButton);
        contentContainer.appendChild(footer);
    
        gptDialogBoxcx.appendChild(contentContainer);
        document.body.appendChild(gptDialogBoxcx);
    
        // Add custom font dynamically
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=MedievalSharp&family=Crimson+Text:wght@400;700&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);
    }

    //ChatGPT API
    gptDialog(){
        console.log("inside function of gptDialog()");
        this.scene.pause();
        this.gptDialogActive = true;
        //display clue and also a button to get hint

        // Create modal view background
        const modalBackground = document.createElement('div');
        modalBackground.style.position = 'fixed';
        modalBackground.style.top = '0';
        modalBackground.style.left = '0';
        modalBackground.style.width = '100%';
        modalBackground.style.height = '100%';
        modalBackground.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modalBackground.style.display = 'flex';
        modalBackground.style.justifyContent = 'center';
        modalBackground.style.alignItems = 'center';
        modalBackground.style.zIndex = '999';

        const clueText = document.createElement('p');
        clueText.innerText = "Access the books on the ground!";
        clueText.style.position = 'absolute';
        clueText.style.top = '30%';
        clueText.style.left = '50%';
        clueText.style.transform = 'translate(-50%, -50%)';
        clueText.style.fontSize = '35px';
        clueText.style.color = '#8B4513';
        clueText.style.width = '1200px';
        clueText.style.backgroundColor = '#f5deb3';
        clueText.style.fontFamily = '"Press Start 2P", monospace';
        clueText.style.imageRendering = 'pixelated';
        clueText.style.wordSpacing = '5px';
        clueText.style.lineHeight = '1.6';
        clueText.style.padding = '10px';
        clueText.style.textAlign = 'center';

        //button to getHint; onclick triggers GPT API
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

        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modalBackground); // Remove the dialog box
            this.scene.resume(); // Resume the scene
            this.gptDialogActive = false;
        });

        getHintButton.addEventListener('click', () => {
            let prompt = "2 + 2 = ?";
            const data = {prompt};
            document.body.removeChild(modalBackground);
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
        });
        
        this.closeButton.setVisible(false); 
    }

    showDialogBox() {

        console.log('Question Opened');
        // Only generate a new question if one isn't already active.
        if (this.currentQuestionIndex === null) {
            this.currentQuestionIndex = Phaser.Math.Between(0, this.questions.length - 1);
        }
        this.questionActive = true; // Set the flag to true when a question is shown
        this.questionText.setText("What is 2 + 2 = ?");
        this.questionText.setVisible(true);
    
        this.questionText.setY(this.dialogBox.y - this.dialogHeight / 4);
        const answers = ["2", "3", "4", "5"];
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
            button.setData('isCorrect', answers[i] === "4");
        }
    
        this.dialogBox.setVisible(true);
        this.closeButton.setVisible(true);

    }

    selectAnswer(selected) {
        // Hide the answer buttons
        this.answerButtons.forEach(button => button.setVisible(false));
    
        // Get the correct answer for the current question
        const correctAnswer = "4";
    
        // Check if the selected answer is correct
        const isCorrect = selected === correctAnswer;
        const resultText = isCorrect ? 'Correct!' : 'Incorrect!';
    
        // Prepare the result lines
        let resultLines = [
            `Selected Answer: ${selected}`,
            resultText
        ];
        
        //need to add logic here to log all response and save into a data structure before being processed into SQL -CY
        //what i need is to log student id, skill id/name, correctness, question ID [[]]
        if (isCorrect) {
            const correctSound = this.sound.add('correct');
            correctSound.play({volume : 0.5});
            //generate the passcode to exit the door
            const passcodeNumber = Phaser.Math.Between(0, 9);
            this.passcodeNumbers.push(passcodeNumber);
            this.hudText.setText(`Passcode: ${this.passcodeNumbers.join('')}`);
            resultLines.push(`\nNumber collected for passcode: ${passcodeNumber}`);
            this.currentQuestionIndex = null;
            this.lastSolvedId = this.currentInteractable.properties['id'];
        }
        else{
            const wrongSound = this.sound.add('wrong');
            wrongSound.play({volume : 0.5});
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

        if(document.getElementById('user-passcode-input')){
            console.log("input field active");
            return;
        }

        // Create an HTML input element overlay
        const element = document.createElement('input');
        element.type = 'text';
        element.maxLength = 1; 
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
                    // Correct passcode
                    //play sound of opening door
                    const doorOpening = this.sound.add('doorOpen');
                    doorOpening.play({volume: 0.5});
                    this.scene.start('Classroom');
                } else {
                    // Incorrect passcode
                    this.showPopupMessage('Incorrect passcode.', 3000);
                }
            }
        });
    }

    // askForPasscode() {
    //     if (this.dialLockActive) return;
    //     this.dialLockActive = true;
    
    //     // Overlay background (darkens screen)
    //     this.overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7)
    //         .setDepth(9);
    
    //     // Lock Panel UI
    //     this.lockPanel = this.add.rectangle(400, 300, 360, 260, 0x222222, 0.9)
    //         .setDepth(10)
    //         .setStrokeStyle(4, 0xffffff, 1)
    //         .setOrigin(0.5);
    
    //     // Title text
    //     this.lockText = this.add.text(400, 170, '🔒 Dial Lock', {
    //         fontSize: '28px',
    //         fill: '#fff',
    //         fontStyle: 'bold',
    //         fontFamily: 'Arial',
    //     }).setOrigin(0.5).setDepth(11);
    
    //     // Create dial numbers (0-9 rotation)
    //     this.dials = [];
    //     this.passcodeInput = [0];
    
    //     for (let i = 0; i < 1; i++) {
    //         let dialContainer = this.add.container(400, 240).setDepth(11);
    
    //         // Background Circle for Dial
    //         let dialBg = this.add.circle(0, 0, 30, 0x444444).setStrokeStyle(3, 0xffffff, 1);
    
    //         // Number Text
    //         let dialNumber = this.add.text(0, 0, '0', {
    //             fontSize: '36px',
    //             fill: '#ffffff',
    //             fontStyle: 'bold',
    //             fontFamily: 'Courier New'
    //         }).setOrigin(0.5);
    
    //         // Add elements to container
    //         dialContainer.add([dialBg, dialNumber]);
    //         this.dials.push(dialNumber);
    
    //         // Click interaction to rotate numbers
    //         dialContainer.setInteractive(new Phaser.Geom.Circle(0, 0, 30), Phaser.Geom.Circle.Contains)
    //             .on('pointerdown', () => {
    //                 this.passcodeInput[i] = (this.passcodeInput[i] + 1) % 10;
    //                 this.tweens.add({
    //                     targets: dialNumber,
    //                     scale: 1.2,
    //                     duration: 100,
    //                     yoyo: true,
    //                     ease: 'Power1'
    //                 });
    //                 dialNumber.setText(this.passcodeInput[i]);
    //             });
    
    //         // Add dial container to main panel
    //         this.add.existing(dialContainer);
    //     }
    
    //     // "Enter" button
    //     this.enterButton = this.add.text(400, 300, '✔ ENTER', {
    //         fontSize: '22px',
    //         fill: '#fff',
    //         backgroundColor: '#4CAF50',
    //         padding: { x: 20, y: 10 },
    //         borderRadius: '5px'
    //     })
    //     .setOrigin(0.5)
    //     .setDepth(11)
    //     .setInteractive()
    //     .on('pointerover', () => this.enterButton.setStyle({ backgroundColor: '#66bb6a' }))
    //     .on('pointerout', () => this.enterButton.setStyle({ backgroundColor: '#4CAF50' }))
    //     .on('pointerdown', () => this.checkPasscode());
    // }
    
    // checkPasscode() {
    //     let enteredPasscode = this.passcodeInput.join('');
    //     if (enteredPasscode === this.passcodeNumbers.join('')) {
    //         // Correct passcode logic
    //         this.sound.play('doorOpen', { volume: 0.7 });
    //         this.closeDialLock();
    //         this.scene.start('Classroom');
    //     } else {
    //         this.closeDialLock(); // Close the lock before showing the message
    //         this.showPopupMessage('❌ Incorrect passcode!', 2000);
    //     }
    // }
    
    // closeDialLock() {
    //     this.overlay.destroy();
    //     this.lockPanel.destroy();
    //     this.lockText.destroy();
    //     this.enterButton.destroy();
    //     this.dials.forEach(dial => dial.destroy());
    //     this.dialLockActive = false;
    // }
    
    createTutorialDialogue(tutorialSteps) {
        let currentStep = 0;
    
        // Pause the current scene
        this.scene.pause();
    
        // Create dialog component for the tutorial
        const tutorialDialogBox = document.createElement('div');
        Object.assign(tutorialDialogBox.style, {
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
            maxHeight: '400px',
            overflowY: 'auto'
        });
    
        document.body.appendChild(tutorialDialogBox);
    
        // Add NPC Portrait and Title
        const npcTitle = document.createElement('h2');
        npcTitle.innerText = "Professor Algebrus";
        Object.assign(npcTitle.style, {
            fontSize: '24px',
            marginBottom: '10px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#8B4513'
        });
        tutorialDialogBox.appendChild(npcTitle);
    
        // Create the content container for tutorial steps
        const tutorialContent = document.createElement('div');
        Object.assign(tutorialContent.style, {
            textAlign: 'center',
            fontSize: '18px',
            fontFamily: '"Press Start 2P", monospace',
            lineHeight: '1.6',
            color: '#4B0082', // Indigo for variety
            padding: '10px'
        });
        tutorialDialogBox.appendChild(tutorialContent);
    
        // Add navigation buttons
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
        tutorialDialogBox.appendChild(buttonContainer);
    
        // Function to update tutorial content
        const updateTutorialStep = () => {
            tutorialContent.innerHTML = tutorialSteps[currentStep];
    
            prevButton.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
            nextButton.innerText = currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next';
        };
    
        // Add event listeners for navigation buttons
        prevButton.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                updateTutorialStep();
            }
        });
    
        nextButton.addEventListener('click', () => {
            if (currentStep < tutorialSteps.length - 1) {
                currentStep++;
                updateTutorialStep();
            } else {
                // Close the tutorial on the last step
                document.body.removeChild(tutorialDialogBox);
                this.scene.resume();
                this.canInteract = false; // Disable further interactions
                this.time.delayedCall(500, () => { 
                    this.canInteract = true;
                });
            }
        });
    
        // Initialize the first step
        updateTutorialStep();
    }
    
}