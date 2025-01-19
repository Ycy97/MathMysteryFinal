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
}