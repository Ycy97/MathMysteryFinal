class ClassroomHard extends Phaser.Scene{
    constructor(){
        super('ClassroomHard');
    }

    init(data){
        this.easyQuestions = data.easyQuestions;
        console.log("Easy Questions" + this.easyQuestions)
    }
}