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
            "Additional support or hints would also be provided according to the challenge faced by accessing to this terminal which will be avaialbe in every room you visit.",
            "For now, lets get started on how you did previously!"
        ];

        this.learningStep = [
            "Now that we have generated your learning path, lets get you ready for the upcoming challenges!",
            "Head to the pile of books on the left side of the terminal to begin your lesson!",
            "When you are done, you can either skip the lessons or head to the door straight to begin the game!",
            "Good luck and have fun."
        ]
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
            if (this.nearDoor && introductionAccessed) {
                this.askForPasscode();
                const doorOpening = this.sound.add('doorOpen');
                doorOpening.play({volume: 0.5});
                this.scene.start('Classroom');
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
                    this.showTutorialDialogBox();
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

        let timerOffsetX = -50;
        let timerOffsetY = 100;
        let timerX = this.player.x + timerOffsetX;
        let timerY = this.player.y - timerOffsetY;

        //Hint
        let hintX  = timerX;
        let hintY = timerY + 20;

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

        let hintX  = timerX;
        let hintY = timerY + 20;
        
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
    
        // Create dialog component that covers a large portion of the screen
        const gptDialogBoxcx = document.createElement('div');
        gptDialogBoxcx.style.position = 'fixed';
        gptDialogBoxcx.style.top = '10%'; // 10% from the top
        gptDialogBoxcx.style.left = '50%';
        gptDialogBoxcx.style.transform = 'translateX(-50%)';
        gptDialogBoxcx.style.width = '80%';  // 80% of the viewport width
        gptDialogBoxcx.style.height = '80%'; // 80% of the viewport height
        gptDialogBoxcx.style.padding = '30px'; // More padding around the content
        gptDialogBoxcx.style.backgroundColor = '#f5deb3'; // Wheat-like backup color
        gptDialogBoxcx.style.backgroundSize = 'cover';
        gptDialogBoxcx.style.color = '#000000';
        gptDialogBoxcx.style.border = '5px solid #8B4513'; // Brown border
        gptDialogBoxcx.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        gptDialogBoxcx.style.zIndex = '1000';
        gptDialogBoxcx.style.overflowY = 'auto'; // Scroll if content overflows
    
        document.body.appendChild(gptDialogBoxcx);

        const npcTitle = document.createElement('h2');
        npcTitle.innerText = "Professor Algebrus";
        Object.assign(npcTitle.style, {
            fontSize: '24px',
            marginBottom: '10px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#8B4513'
        });
        gptDialogBoxcx.appendChild(npcTitle);
    
        // Create and append response text, left-aligned with extra space
        const gptResponseText = document.createElement('p');
        gptResponseText.innerText = gptResponse;
        gptResponseText.style.fontSize = '20px';
        gptResponseText.style.margin = '0 0 20px 0';
        gptResponseText.style.fontFamily = '"Press Start 2P", monospace'; // Pixelated font
        gptResponseText.style.imageRendering = 'pixelated';
        gptResponseText.style.color = '#4B0082'; // Brown color
        gptResponseText.style.textAlign = 'left'; // Left align text
        gptResponseText.style.wordSpacing = '5px';
        gptResponseText.style.lineHeight = '1.6';
        gptResponseText.style.padding = '10px';
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
    gptDialog() {
        console.log("inside function of gptDialog()");
        this.scene.pause();
        this.gptDialogActive = true;
    
        // Create modal view background
        const modalBackground = document.createElement('div');
        Object.assign(modalBackground.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '999'
        });
    
        // Create dialog container similar to tutorialDialogue design
        const dialogContainer = document.createElement('div');
        Object.assign(dialogContainer.style, {
            width: '600px',
            maxHeight: '400px',
            backgroundColor: '#f5deb3',
            border: '5px solid #8B4513',
            borderRadius: '10px',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            animation: 'fadeIn 0.5s ease',
            overflowY: 'auto'
        });
    
        // Create clue text styled like in tutorialDialogue
        const clueText = document.createElement('p');
        clueText.innerText = "Access the books on the ground!";
        Object.assign(clueText.style, {
            fontSize: '35px',
            color: '#8B4513',
            fontFamily: '"Press Start 2P", monospace',
            wordSpacing: '5px',
            lineHeight: '1.6',
            padding: '10px',
            textAlign: 'center',
            marginBottom: '20px'
        });
    
        // Create button to get hint; onclick triggers GPT API
        const getHintButton = document.createElement('a');
        getHintButton.innerText = 'Get Hint';
        Object.assign(getHintButton.style, {
            display: 'inline-block',
            padding: '15px 30px',
            background: 'linear-gradient(45deg, #6a11cb, #2575fc)',
            color: 'white',
            textAlign: 'center',
            textDecoration: 'none',
            fontSize: '18px',
            borderRadius: '25px',
            fontFamily: '"Poppins", sans-serif',
            boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            marginBottom: '20px'
        });
        // Add hover effects for the hint button
        getHintButton.addEventListener('mouseenter', function() {
            getHintButton.style.transform = 'scale(1.05)';
            getHintButton.style.boxShadow = '0px 6px 10px rgba(0, 0, 0, 0.2)';
        });
        getHintButton.addEventListener('mouseleave', function() {
            getHintButton.style.transform = 'scale(1)';
            getHintButton.style.boxShadow = '0px 4px 6px rgba(0, 0, 0, 0.1)';
        });
    
        // Create Close button similar to tutorialDialogue design
        const closeBtn = document.createElement('button');
        closeBtn.innerText = "Close";
        Object.assign(closeBtn.style, {
            padding: '10px 20px',
            backgroundColor: '#333',
            color: '#ffffff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '24px',
            fontFamily: '"Press Start 2P", monospace',
            marginTop: '20px'
        });
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modalBackground); // Remove the dialog box
            this.scene.resume(); // Resume the scene
            this.gptDialogActive = false;
        });
    
        // Event listener for the Get Hint button: trigger GPT API call
        getHintButton.addEventListener('click', () => {
            let prompt = "2 + 2 = ?";
            const data = { prompt: prompt };
            // Remove modal before calling API
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
                let fetchResponse = data.response.replace(/(\*\*|__|~~|###?|`{1,3}|>-?|\[.*?\]\(.*?\)|!?\[.*?\]\(.*?\)|\|)/g, "");
                console.log('fetchedResponse', fetchResponse);
                // Display the response on the game using your displayGptResponse method
                this.displayGptResponse(fetchResponse);
                this.gptDialogActive = false;
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
        });
    
        // Assemble the dialog components
        dialogContainer.appendChild(clueText);
        dialogContainer.appendChild(getHintButton);
        dialogContainer.appendChild(closeBtn);
        modalBackground.appendChild(dialogContainer);
        document.body.appendChild(modalBackground);
    }

    //dynamic tutorials based on student weakest topic
    showTutorialDialogBox() {
        const masteries = {
            fdp: parseFloat(sessionStorage.getItem('fdpMastery')) || 0.1,
            prs: parseFloat(sessionStorage.getItem('prsMastery')) || 0.1,
            pfm: parseFloat(sessionStorage.getItem('pfmMastery')) || 0.1,
            rpr: parseFloat(sessionStorage.getItem('rprMastery')) || 0.1
        };

        let masteryArray = [
            {
                topic: 'Fractions, Decimals, and Percentages', 
                level: masteries.fdp, 
                content: [
                    {
                        heading: "Introduction to Fractions, Decimals, and Percentages",
                        description: "Fractions represent a part of a whole, decimals are a way to express fractions with denominators as powers of 10, and percentages are fractions with a denominator of 100.",
                        examples: [
                            "Fraction: 3/4 means 3 parts out of 4",
                            "Decimal: 0.75 is equivalent to 3/4",
                            "Percentage: 75% is equivalent to 0.75"
                        ]
                    },
                    {
                        heading: "Converting Fractions to Decimals",
                        description: "To convert a fraction to a decimal, divide the numerator by the denominator.",
                        example: "Example: 3/4 = 3 ÷ 4 = 0.75"
                    },
                    {
                        heading: "Converting Decimals to Percentages",
                        description: "To convert a decimal to a percentage, multiply the decimal by 100.",
                        example: "Example: 0.75 × 100 = 75%"
                    },
                    {
                        heading: "Solving FDP Problems Step-by-Step",
                        description: "Follow the steps to convert between fractions, decimals, and percentages and solve related problems.",
                        example: "Problem: Convert 5/8 to a percentage. Step 1: 5 ÷ 8 = 0.625 Step 2: 0.625 × 100 = 62.5%"
                    }
                ]
            },
            {
                topic: 'Power, Roots, and Standard Form', 
                level: masteries.prs, 
                content: [
                    {
                        heading: "Introduction to Powers",
                        description: "A power represents repeated multiplication. It's written as a^b, where a is the base and b is the exponent.",
                        example: "Example: 2^3 = 2 × 2 × 2 = 8"
                    },
                    {
                        heading: "Understanding Square Roots",
                        description: "The square root of a number is the value that, when multiplied by itself, gives the original number. It’s written as √a.",
                        example: "Example: √16 = 4, because 4 × 4 = 16"
                    },
                    {
                        heading: "Working with Standard Form",
                        description: "Standard form expresses numbers as a product of a number between 1 and 10 and a power of 10.",
                        example: "Example: 4500 = 4.5 × 10^3"
                    },
                    {
                        heading: "Solving Problems Using Powers and Roots",
                        description: "Apply powers and square roots in mathematical problems.",
                        example: "Problem: Simplify 3^2 × √16. Step 1: 3^2 = 9 Step 2: √16 = 4 Step 3: 9 × 4 = 36"
                    }
                ]
            },
            {
                topic: 'Prime Numbers, Factors, and Multiples', 
                level: masteries.pfm, 
                content: [
                    {
                        heading: "Introduction to Prime Numbers",
                        description: "A prime number is greater than 1 and has no divisors other than 1 and itself.",
                        examples: [
                            "Example: 2, 3, 5, 7, 11 are prime numbers."
                        ]
                    },
                    {
                        heading: "Finding Factors of Numbers",
                        description: "Factors are numbers that divide exactly into another number.",
                        example: "Example: The factors of 12 are 1, 2, 3, 4, 6, 12."
                    },
                    {
                        heading: "Understanding Multiples",
                        description: "Multiples are numbers that can be obtained by multiplying a number by any whole number.",
                        example: "Example: The multiples of 5 are 5, 10, 15, 20, etc."
                    },
                    {
                        heading: "Working with Prime Factorization",
                        description: "Prime factorization involves breaking down a number into its prime factors.",
                        example: "Example: The prime factorization of 12 is 2 × 2 × 3 = 2^2 × 3"
                    },
                    {
                        heading: "Prime Factorization Example",
                        description: "Step-by-step example of prime factorization.",
                        example: "Problem: Find the prime factorization of 60. Step 1: 60 ÷ 2 = 30 Step 2: 30 ÷ 2 = 15 Step 3: 15 ÷ 3 = 5 The prime factorization of 60 is 2^2 × 3 × 5."
                    }
                ]
            },
            {
                topic: 'Ratio, Proportion, and Rates', 
                level: masteries.rpr, 
                content: [
                    {
                        heading: "Understanding Ratios",
                        description: "A ratio compares two quantities by division.",
                        example: "Example: The ratio of boys to girls in a class of 6 boys and 4 girls is 6:4, which simplifies to 3:2."
                    },
                    {
                        heading: "Proportions in Real Life",
                        description: "Proportions express the equality of two ratios.",
                        example: "Example: If 5 apples cost $3, how much do 10 apples cost? Solution: 5/3 = 10/x. Cross-multiply: 5x = 30, x = 6."
                    },
                    {
                        heading: "Working with Rates",
                        description: "A rate compares two quantities with different units.",
                        example: "Example: If a car travels 60 miles in 1 hour, the rate is 60 miles per hour (mph)."
                    },
                    {
                        heading: "Solving Ratio and Proportion Problems",
                        description: "Apply ratio and proportion rules to solve problems.",
                        example: "Problem: Solve the proportion 3/4 = 9/x. Step 1: Cross-multiply: 3x = 4 × 9 Step 2: Solve for x: x = 12."
                    }
                ]
            }
        ];
        

        masteryArray.sort((a, b) => a.level - b.level);

        const tutorialDialogBox = document.createElement('div');
        tutorialDialogBox.style.position = 'fixed';
        tutorialDialogBox.style.top = '50%';
        tutorialDialogBox.style.left = '50%';
        tutorialDialogBox.style.transform = 'translate(-50%, -50%)';
        tutorialDialogBox.style.padding = '20px';
        tutorialDialogBox.style.backgroundColor = '#f5deb3'; // Wheat-like color
        tutorialDialogBox.style.color = '#000000';
        tutorialDialogBox.style.borderRadius = '10px';
        tutorialDialogBox.style.border = '5px solid #8B4513'; // Brown border
        tutorialDialogBox.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        tutorialDialogBox.style.zIndex = '1000';
        tutorialDialogBox.style.display = 'flex';
        tutorialDialogBox.style.flexDirection = 'column';
        tutorialDialogBox.style.justifyContent = 'center';
        tutorialDialogBox.style.alignItems = 'center';
        tutorialDialogBox.style.width = '80%';
        tutorialDialogBox.style.maxWidth = '900px';
        tutorialDialogBox.style.maxHeight = '600px';
        tutorialDialogBox.style.overflowY = 'auto';
        document.body.appendChild(tutorialDialogBox);

        const titleText = document.createElement('h2');
        titleText.innerText = 'Learning Path - Tutorial';
        titleText.style.textAlign = 'center';
        titleText.style.color = '#8B4513'; // Brown color
        tutorialDialogBox.appendChild(titleText);

        const tutorialContent = document.createElement('div');
        tutorialContent.style.fontFamily = '"Press Start 2P", monospace';
        tutorialContent.style.fontSize = '18px';
        tutorialContent.style.textAlign = 'center';
        tutorialDialogBox.appendChild(tutorialContent);

        let currentStep = 0; // Track the current step in the tutorial

        function updateContent(stepIndex) {
            tutorialContent.innerHTML = ''; // Clear previous content
            const currentTopic = masteryArray[stepIndex];
            
            const stepTitle = document.createElement('h3');
            stepTitle.innerText = `Step ${stepIndex + 1}: Learn about "${currentTopic.topic}"`;
            tutorialContent.appendChild(stepTitle);
        
            // Show the learning content for the current topic
            currentTopic.content.forEach((section, index) => {
                const sectionTitle = document.createElement('h4');
                sectionTitle.innerText = `${index + 1}. ${section.heading}`;
                tutorialContent.appendChild(sectionTitle);
        
                const sectionDescription = document.createElement('p');
                sectionDescription.innerText = section.description;
                tutorialContent.appendChild(sectionDescription);
        
                if (section.examples) {
                    section.examples.forEach(example => {
                        const exampleText = document.createElement('p');
                        exampleText.innerText = `Example: ${example}`;
                        exampleText.style.fontStyle = 'italic';
                        tutorialContent.appendChild(exampleText);
                    });
                } else if (section.example) {
                    const exampleText = document.createElement('p');
                    exampleText.innerText = `Example: ${section.example}`;
                    exampleText.style.fontStyle = 'italic';
                    tutorialContent.appendChild(exampleText);
                }
            });
        
            // Add navigation buttons for Next and Back
            const navigationButtons = document.createElement('div');
            navigationButtons.style.display = 'flex';
            navigationButtons.style.justifyContent = 'space-between';
            navigationButtons.style.width = '100%';
            tutorialContent.appendChild(navigationButtons);
        
            // Back Button
            const backButton = document.createElement('button');
            backButton.innerText = 'Back';
            backButton.style.padding = '10px 20px';
            backButton.style.backgroundColor = '#333';
            backButton.style.color = '#ffffff';
            backButton.style.border = 'none';
            backButton.style.borderRadius = '5px';
            backButton.style.cursor = 'pointer';
            navigationButtons.appendChild(backButton);
            
            backButton.disabled = stepIndex === 0; // Disable Back button if at the first step
            backButton.addEventListener('click', () => {
                if (stepIndex > 0) {
                    currentStep -= 1;
                    updateContent(currentStep);
                }
            });
        
            // Next Button
            const nextButton = document.createElement('button');
            nextButton.innerText = 'Next';
            nextButton.style.padding = '10px 20px';
            nextButton.style.backgroundColor = '#333';
            nextButton.style.color = '#ffffff';
            nextButton.style.border = 'none';
            nextButton.style.borderRadius = '5px';
            nextButton.style.cursor = 'pointer';
            navigationButtons.appendChild(nextButton);
        
            nextButton.disabled = stepIndex === masteryArray.length - 1; // Disable Next button if at the last step
            nextButton.addEventListener('click', () => {
                if (stepIndex < masteryArray.length - 1) {
                    currentStep += 1;
                    updateContent(currentStep);
                }
            });
        }
        
    
        // Initial content for the first step
        updateContent(currentStep);

        const skipButton = document.createElement('button');
        skipButton.innerHTML = 'Skip Tutorial';
        skipButton.style.marginTop = '20px';
        skipButton.style.padding = '10px 20px';
        skipButton.style.backgroundColor = '#333';
        skipButton.style.color = '#ffffff';
        skipButton.style.border = 'none';
        skipButton.style.borderRadius = '5px';
        skipButton.style.cursor = 'pointer';
        tutorialDialogBox.appendChild(skipButton);

        skipButton.addEventListener('click', () => {
            document.body.removeChild(tutorialDialogBox); // Close the tutorial dialog
            if (confirm("Are you sure you want to skip the tutorial and begin the game?")) {
                //start classroom scene
                this.scene.start('Classroom');
            }
        });
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

                //begin learning objectives
                this.defineLearningObjectives();
            }
        });
    
        // Initialize the first step
        updateTutorialStep();
    }

    // separate to diff mastery lvls and define learning obj in tutorial room
    defineLearningObjectives(){
       //masteries are stored in sessionStorage
       //retrieve them and sort 

       const masteries = {
            fdp: parseFloat(sessionStorage.getItem('fdpMastery')) || 0,
            prs: parseFloat(sessionStorage.getItem('prsMastery')) || 0,
            pfm: parseFloat(sessionStorage.getItem('pfmMastery')) || 0,
            rpr: parseFloat(sessionStorage.getItem('rprMastery')) || 0
        };

        //convert to an array to sort
        let masteryArray = Object.entries(masteries).map(([topic, level]) => ({ topic, level }));
        // Sort mastery levels from weakest to strongest
        masteryArray.sort((a, b) => a.level - b.level);
        console.log("Sorted Mastery Levels:", masteryArray);

         // Create learning objectives dialog box
        const learningObjDialogBox = document.createElement('div');
        learningObjDialogBox.style.position = 'fixed';
        learningObjDialogBox.style.top = '50%';
        learningObjDialogBox.style.left = '50%';
        learningObjDialogBox.style.transform = 'translate(-50%, -50%)';
        learningObjDialogBox.style.padding = '20px';
        learningObjDialogBox.style.backgroundColor = '#f5deb3'; // Wheat-like color
        learningObjDialogBox.style.backgroundSize = 'cover';
        learningObjDialogBox.style.color = '#000000';
        learningObjDialogBox.style.borderRadius = '10px';
        learningObjDialogBox.style.border = '5px solid #8B4513'; // Brown border
        learningObjDialogBox.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        learningObjDialogBox.style.zIndex = '1000';
        learningObjDialogBox.style.display = 'flex';
        learningObjDialogBox.style.flexDirection = 'column';
        learningObjDialogBox.style.justifyContent = 'center';
        learningObjDialogBox.style.alignItems = 'center';
        learningObjDialogBox.style.width = '80%';
        learningObjDialogBox.style.maxWidth = '900px';
        learningObjDialogBox.style.maxHeight = '600px';
        learningObjDialogBox.style.overflowY = 'auto';

        document.body.appendChild(learningObjDialogBox);

        const titleText = document.createElement('h2');
        titleText.innerText = "Professor Algebrus' Tutorial";
        titleText.style.textAlign = 'center';
        titleText.style.color = '#8B4513'; // Brown color
        learningObjDialogBox.appendChild(titleText);

        const learningObjectivesContent = document.createElement('p');
        learningObjectivesContent.innerHTML = "<b>Let's assess your skills!</b><br>Here's your mastery level in each topic:";
        learningObjectivesContent.style.textAlign = 'center';
        learningObjDialogBox.appendChild(learningObjectivesContent);

        masteryArray.forEach(item => {
            const detailText = document.createElement('p');
            detailText.innerHTML = `${item.topic}: <b>${(item.level * 100).toFixed(1)}%</b>`;
            detailText.style.fontSize = '16px';
            detailText.style.margin = '5px 0';
            detailText.style.fontFamily = '"Press Start 2P", monospace';
            detailText.style.textAlign = 'left';
            learningObjDialogBox.appendChild(detailText);
        });

        const closingText = document.createElement('p');
        closingText.innerHTML = "<b>Based on your weakest topics, we will tailor a learning path for you!</b>";
        closingText.style.textAlign = 'center';
        closingText.style.marginTop = '10px';
        learningObjDialogBox.appendChild(closingText);

        const closeButton = document.createElement('button');
        closeButton.innerHTML = 'Close';
        closeButton.style.marginTop = '20px';
        closeButton.style.padding = '10px 20px';
        closeButton.style.backgroundColor = '#333';
        closeButton.style.color = '#ffffff';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        learningObjDialogBox.appendChild(closeButton);

        closeButton.addEventListener('click', () => {
            document.body.removeChild(learningObjDialogBox);
            this.createTutorialDialogue(this.learningStep);
        });
        
    }
   
}