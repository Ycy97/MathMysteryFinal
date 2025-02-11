from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from collections import defaultdict
import os
from bktModel import update_knowledge
import openai

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*", "supports_credentials": True}})

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL","postgresql://chengyee:HSpcoYAt98LuINAIlpwKkOAv9LPGpCiq@dpg-cu535rggph6c73dte0og-a.singapore-postgres.render.com/mathmystery")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

##User model
class Users(db.Model):
    __table_args__ = {'schema': 'learnerModel'}
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)

## Numbers Question Table model
class Numbers(db.Model):
    __tablename__ = 'numbersmodified'
    __table_args__ = {'schema': 'learnerModel'}
    question_id = db.Column(db.Integer, primary_key=True)
    difficulty = db.Column(db.String(255), nullable=False)
    topic = db.Column(db.String(255), nullable=False)
    subtopic = db.Column(db.String(255), nullable=False)
    question = db.Column(db.String(255), nullable=False)
    answer1 = db.Column(db.String(255), nullable=False)
    answer2 = db.Column(db.String(255), nullable=False)
    answer3 = db.Column(db.String(255), nullable=False)
    answer4 = db.Column(db.String(255), nullable=False)
    correct_answer = db.Column(db.String(255), nullable=False)

## Student Interaction Table, for data processing and to display at Dashboard
class StudentInteraction(db.Model):
    __tablename__ = 'studentinteraction'
    __table_args__ = {'schema': 'learnerModel'}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Text, nullable=False)
    question_id = db.Column(db.Integer, nullable=False)
    question = db.Column(db.Text, nullable=False)
    difficulty = db.Column(db.Text, nullable=False)
    selected = db.Column(db.Text, nullable=False)
    correctness = db.Column(db.Integer, nullable=False)
    skill = db.Column(db.Text, nullable=False)
    mastery = db.Column(db.Float, nullable=False)
    questionresponsetime = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)

    ##for querying and for smoother JSON serialization
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "question_id": self.question_id,
            "question": self.question,
            "selected": self.selected,
            "correctness": self.correctness,
            "skill": self.skill,
            "mastery": self.mastery,
            "questionResponseTime" : self.questionresponsetime,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }

class StudentInteractionPreTest(db.Model):
    __tablename__ = 'studentinteractionpretest'
    __table_args__ = {'schema': 'learnerModel'}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Text, nullable=False)
    question_id = db.Column(db.Integer, nullable=False)
    question = db.Column(db.Text, nullable=False)
    difficulty = db.Column(db.Text, nullable=False)
    selected = db.Column(db.Text, nullable=False)
    correctness = db.Column(db.Integer, nullable=False)
    skill = db.Column(db.Text, nullable=False)
    mastery = db.Column(db.Float, nullable=False)
    questionresponsetime = db.Column(db.Text, nullable=False) 
    created_at = db.Column(db.DateTime, nullable=False)

    ##for querying and for smoother JSON serialization
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "question_id": self.question_id,
            "question": self.question,
            "selected": self.selected,
            "correctness": self.correctness,
            "skill": self.skill,
            "mastery": self.mastery,
            "questionResponseTime": self.questionresponsetime,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }

class StudentInteractionPostTest(db.Model):
    __tablename__ = 'studentinteractionposttest'
    __table_args__ = {'schema': 'learnerModel'}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Text, nullable=False)
    question_id = db.Column(db.Integer, nullable=False)
    question = db.Column(db.Text, nullable=False)
    difficulty = db.Column(db.Text, nullable=False)
    selected = db.Column(db.Text, nullable=False)
    correctness = db.Column(db.Integer, nullable=False)
    skill = db.Column(db.Text, nullable=False)
    mastery = db.Column(db.Float, nullable=False)
    questionresponsetime = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)

    ##for querying and for smoother JSON serialization
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "question_id": self.question_id,
            "question": self.question,
            "selected": self.selected,
            "correctness": self.correctness,
            "skill": self.skill,
            "mastery": self.mastery,
            "questionResponseTime": self.questionresponsetime,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }    

## Student Interaction Table, for data processing and to display at Dashboard
class LearnerProgress(db.Model):
    __tablename__ = 'learnerprogress'
    __table_args__ = {'schema': 'learnerModel'}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Text, nullable=False)
    skill = db.Column(db.Text, nullable=False)
    fdpmastery = db.Column(db.Float, nullable=False)
    prsmastery = db.Column(db.Float, nullable=False)
    pfmmastery = db.Column(db.Float, nullable=False)
    rprmastery = db.Column(db.Float, nullable=False)
    room = db.Column(db.Text, nullable=False)
    timetaken = db.Column(db.Text, nullable=False)
    starting_hint = db.Column(db.Integer, nullable=False)
    hints_used = db.Column(db.Integer, nullable=False)
    starting_life = db.Column(db.Integer, nullable=False)
    life_remain = db.Column(db.Integer, nullable=False)
    game_status = db.Column(db.Text, nullable=False) 
    created_at = db.Column(db.DateTime, nullable=False)

    ##for querying and for smoother JSON serialization
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "skill": self.skill,
            "fdpMastery": self.fdpmastery,
            "prsMastery": self.prsmastery,
            "pfmMastery": self.pfmmastery,
            "rprMastery": self.rprmastery,
            "room" : self.room,
            "timetaken" : self.timetaken,
            "starting_hint" : self.starting_hint,
            "hints_used" : self.hints_used,
            "starting_life" : self.starting_life,
            "life_remain" : self.life_remain,
            "game_status" : self.game_status,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
    
class Engagement(db.Model):
    __tablename__ = 'engagement'
    __table_args__ = {'schema': 'learnerModel'}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Text, nullable=False)
    startingtime = db.Column(db.DateTime, nullable=False)
    endingtime = db.Column(db.DateTime, nullable=False)
    sessionduration = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)
    category = db.Column(db.Text, nullable=False)

class UserLatestMastery(db.Model):
    __tablename__ = 'usermasterylatest'
    __table_args__ = {'schema': 'learnerModel'}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Text, nullable=False)
    fdp_mastery = db.Column(db.Float, nullable=False)
    prs_mastery = db.Column(db.Float, nullable=False)
    pfm_mastery = db.Column(db.Float, nullable=False)
    rpr_mastery = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)
    category = db.Column(db.Text, nullable=False)

    ##for querying and for smoother JSON serialization
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "fdp_mastery" : self.fdp_mastery,
            "prs_mastery" : self.prs_mastery,
            "pfm_mastery" : self.pfm_mastery,
            "rpr_mastery" : self.rpr_mastery,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "category" : self.category
        }

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@app.route('/signup', methods=['GET'])
def signup():
    return render_template('signup.html')

@app.route('/login', methods=['GET'])
def login():
    return render_template('login.html')

@app.route('/logout', methods=['GET'])
def logout():
    return render_template('index.html')

@app.route('/dashboard', methods=['GET'])
def dashboard():
    return render_template('dashboard.html')

@app.route('/pretest', methods=['GET'])
def pretest():
    return render_template('pretest.html')

@app.route('/posttest', methods=['GET'])
def posttest():
    return render_template('posttest.html')

@app.route('/mathModules', methods=['GET'])
def mathModules():
    return render_template('mathModules.html')

@app.route('/traditionalLearning', methods=['GET'])
def traditionalLearning():
    return render_template('traditionalLearning.html')

@app.route('/game', methods=['GET'])
def game():
    return render_template('game.html')   

@app.route('/signupUser', methods=['POST'])
def gameSignup():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    new_user = Users(username=username, password=password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/loginUser', methods=['POST'])
def loginUser():
    data = request.get_json()
    print(f"Received login request: {data}")  # Debugging line
    username = data.get('username')
    password = data.get('password')

    user = Users.query.filter_by(username=username).first()
    print(user)

    if user:
        if user.password  == password:
            return jsonify({'message': 'Login successful'}), 200
        else:
            print("Password mismatch")  # Debugging line
            return jsonify({'message': 'Incorrect password'}), 401
    else:
        print("User not found")  # Debugging line
        return jsonify({'message': 'User not found'}), 404

#API to call chatGPT completion
@app.route('/chatgpt', methods=['POST'])
def chatgpt_prompt():
    openai.api_key = os.getenv('OPENAI_API_KEY')

    messages = []
    data = request.json
    prompt = data.get('prompt')
    #Augment the prompt to not provide answers but hints instead
    #augment =  "Do not provide the direct answers. Give me the hints only with simple and casual explanation within 3 sentences for a young student. Dont have to bold or italic the response."
    augment = "Short bullet point explanation on how to solve the following math problem. Use simple language appropriate for Year 9 to 11 IGCSE students. Make it so that user understand it and give the response as simple and straightforward as possible."
    prompt = prompt + augment

    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400
    
    try:
        messages.append({"role": "user", "content": prompt})

        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages = messages,
            max_tokens= 1500
        )
        chat_message = response.choices[0].message.content
        messages.append({"role": "assistant", "content": chat_message})
        return jsonify({"response": chat_message})
    except Exception as e:
         return jsonify({"error": str(e)}), 500

@app.route('/numbers', methods=['GET'])
def get_numbers_questions():
    questions = Numbers.query.all()
    
    question_bank = defaultdict(lambda: {"Easy": [], "Medium": [], "Hard": []})
    
    for q in questions:
        question_entry = {
            "id": q.question_id,
            "subtopic": q.subtopic,
            "question": q.question,
            "answers": [q.answer1, q.answer2, q.answer3, q.answer4],
            "correct_answer": q.correct_answer
        }
        question_bank[q.topic][q.difficulty].append(question_entry)

    return jsonify(question_bank)

#API to save user interaction (question-answer) response
@app.route('/save_response', methods=['POST'])
def save_responses():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    user_id = data.get('user_id')
    question_id = data.get('question_id')
    question = data.get('question')
    difficulty = data.get('difficulty')
    selected = data.get('selected')
    correctness = data.get('correctness')
    skill = data.get('skill')
    mastery = data.get('mastery')
    questionResponseTime = data.get('questionResponseTime')
    created_at = data.get('created_at')

    ##validate all fields before saving into database
    if not all([user_id, question_id, question, difficulty, selected, correctness, skill, mastery,questionResponseTime, created_at]):
        return jsonify({"error": "Missing required fields"}), 400
    
    interaction = StudentInteraction(
        user_id=user_id,
        question_id=question_id,
        question=question,
        difficulty=difficulty,
        selected=selected,
        correctness=correctness,
        skill=skill,
        mastery=mastery,
        questionresponsetime=questionResponseTime,
        created_at=created_at
    )
    db.session.add(interaction)
    db.session.commit()

    return jsonify({"message": "Response saved successfully"}), 201

#API to save user interaction (question-answer) response
@app.route('/save_response_preTest', methods=['POST'])
def save_responses_preTest():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    user_id = data.get('user_id')
    question_id = data.get('question_id')
    question = data.get('question')
    difficulty = data.get('difficulty')
    selected = data.get('selected')
    correctness = data.get('correctness')
    skill = data.get('skill')
    mastery = data.get('mastery')
    questionResponseTime= data.get('response_time'),
    created_at = data.get('created_at')

    ##validate all fields before saving into database
    if not all([user_id, question_id, question, difficulty, selected, correctness, skill, mastery,questionResponseTime, created_at]):
        return jsonify({"error": "Missing required fields"}), 400
    
    interaction = StudentInteractionPreTest(
        user_id=user_id,
        question_id=question_id,
        question=question,
        difficulty=difficulty,
        selected=selected,
        correctness=correctness,
        skill=skill,
        mastery=mastery,
        questionresponsetime=questionResponseTime,
        created_at=created_at
    )
    db.session.add(interaction)
    db.session.commit()

    return jsonify({"message": "Response saved successfully"}), 201

@app.route('/save_response_postTest', methods=['POST'])
def save_responses_postTest():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    user_id = data.get('user_id')
    question_id = data.get('question_id')
    question = data.get('question')
    difficulty = data.get('difficulty')
    selected = data.get('selected')
    correctness = data.get('correctness')
    skill = data.get('skill')
    mastery = data.get('mastery')
    questionResponseTime= data.get('response_time'),
    created_at = data.get('created_at')

    ##validate all fields before saving into database
    if not all([user_id, question_id, question, difficulty, selected, correctness, skill, mastery, questionResponseTime, created_at]):
        return jsonify({"error": "Missing required fields"}), 400
    
    interaction = StudentInteractionPostTest(
        user_id=user_id,
        question_id=question_id,
        question=question,
        difficulty=difficulty,
        selected=selected,
        correctness=correctness,
        skill=skill,
        mastery=mastery,
        questionresponsetime=questionResponseTime,
        created_at=created_at
    )
    db.session.add(interaction)
    db.session.commit()

    return jsonify({"message": "Response saved successfully"}), 201

#API to call BKT model
@app.route('/getStudentMastery', methods=['POST'])
def getStudentMasteries():
    data = request.get_json()
    state = float(data.get('state'))
    correct = data.get('correct')
    difficulty = str(data.get('difficulty'))
    response_time = float(data.get('response_time'))
    latest_state = update_knowledge(state, correct, difficulty, response_time)
    obtainedMastery ={
        'mastery' : latest_state
    }

    return jsonify(obtainedMastery)

#API to save user profile to learner model upon room completion for logging purposes
@app.route('/save_learner_progress', methods=['POST'])
def save_learner_progress():
    data = request.get_json()
    user_id = data.get('user_id')
    skill = data.get('skill')
    fdpMastery = data.get('fdpMastery')
    prsMastery = data.get('prsMastery')
    pfmMastery = data.get('pfmMastery')
    rprMastery = data.get('rprMastery')
    room = data.get('room')
    timetaken = data.get('timeTaken')
    starting_hint = data.get('starting_hints')
    hints_used = data.get('hints_used')
    starting_life = data.get('starting_life')
    life_remain = data.get('life_remain')
    game_status = data.get('game_status')
    created_at = data.get('created_at')

    progress = LearnerProgress(
        user_id=user_id,
        skill=skill,
        fdpmastery=fdpMastery,
        prsmastery=prsMastery,
        pfmmastery=pfmMastery,
        rprmastery=rprMastery,
        room=room,
        timetaken=timetaken,
        starting_hint=starting_hint,
        hints_used=hints_used,
        starting_life=starting_life,
        life_remain=life_remain,
        game_status=game_status,
        created_at=created_at
    )
   
    db.session.add(progress)
    db.session.commit()

    return jsonify({"message": "Response saved successfully"}), 201

#API to save sessionDuration for engagement
@app.route('/saveSessionDuration', methods=['POST'])
def save_session_duration():
    data = request.get_json()
    user_id = data.get('username')
    startingtime = data.get('startTime')
    endingtime = data.get('endTime')
    sessionduration = data.get('sessionDuration')
    created_at = data.get('created_at')

    engagement = Engagement(
        user_id=user_id,
        startingtime=startingtime,
        endingtime=endingtime,
        sessionduration=sessionduration,
        created_at=created_at,
    )

    db.session.add(engagement)
    db.session.commit()

    return jsonify({"message": "Session data saved successfully"}), 201

@app.route('/userMasteryLatest', methods=['POST'])
def updateUserLatestMastery():
    data = request.get_json()
    user_id = data.get('user_id')
    fdp_mastery = data.get('fdp_mastery')
    prs_mastery = data.get('prs_mastery')
    pfm_mastery = data.get('pfm_mastery')
    rpr_mastery = data.get('rpr_mastery')
    created_at = data.get('created_at')
    category = data.get('category')
    user_mastery = UserLatestMastery(
        user_id = user_id,
        fdp_mastery = fdp_mastery,
        prs_mastery = prs_mastery,
        pfm_mastery = pfm_mastery,
        rpr_mastery = rpr_mastery,
        created_at = created_at,
        category = category
    )
    db.session.add(user_mastery)
    db.session.commit()
    return jsonify({'message': 'Mastery saved successfully'}), 201

@app.route('/getLatestMastery', methods=['POST'])
def get_latest_mastery():
    data = request.get_json()
    print(f"Received request for latest mastery: {data}")  # Debugging line
    
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'message': 'User ID is required'}), 400

    latest_mastery = (UserLatestMastery.query
        .filter_by(user_id=user_id)
        .order_by(UserLatestMastery.created_at.desc())
        .first()
    )

    if latest_mastery:
        return jsonify({'message': 'Success', 'data': latest_mastery.to_dict()}), 200
    else:
        print("No mastery data found")  # Debugging line
        return jsonify({'message': 'No mastery data found for this user'}), 404

    
if __name__ == '__main__':
    app.run(debug=True)
