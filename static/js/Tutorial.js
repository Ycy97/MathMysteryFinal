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
        this.hintRemaining = 3;
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

        this.load.audio('escapeRoomBGMusic','static/assets/sounds/escapeRoom.png')
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
            this.scene.resume(); // Resume the scene
        });
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
            //generate the passcode to exit the door
            const passcodeNumber = Phaser.Math.Between(0, 9);
            this.passcodeNumbers.push(passcodeNumber);
            this.hudText.setText(`Passcode: ${this.passcodeNumbers.join('')}`);
            resultLines.push(`\nNumber collected for passcode: ${passcodeNumber}`);
            this.currentQuestionIndex = null;
            this.lastSolvedId = this.currentInteractable.properties['id'];
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
        // Create an HTML input element overlay
        const element = document.createElement('input');
        element.type = 'text';
        element.style.position = 'absolute';
        element.style.top = '50%'; // Center on screen
        element.style.left = '50%';
        element.style.transform = 'translate(-50%, -50%)';
        element.style.fontSize = '20px'; // Big enough to match your game's style
        element.maxLength = 5; // Limit to 5 characters
        element.id = 'user-passcode-input';
    
        document.body.appendChild(element);
        element.focus(); // Automatically focus the input field
    
        // Handle the input submission
        element.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                let userPasscode = element.value;
                document.body.removeChild(element); // Remove the input field from the document
    
                if (userPasscode === this.passcodeNumbers.join('')) {
                    // Correct passcode
                    this.scene.start('Classroom');
                } else {
                    // Incorrect passcode
                    this.showPopupMessage('Incorrect passcode.', 3000);
                }
            }
        });
    }
    
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