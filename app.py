from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
from bktModel import update_knowledge
from openai import OpenAI

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

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@app.route('/signup', methods=['GET'])
def signup():
    return render_template('signup.html')

@app.route('/login', methods=['GET'])
def login():
    return render_template('login.html')

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
    client = OpenAI()
    messages = []
    data = request.json
    prompt = data.get('prompt')
    #Augment the prompt to not provide answers but hints instead
    augment =  "Do not provide the direct answers. Give me the hints only with simple and casual explanation within 3 sentences for a young student. Dont have to bold or italic the response."
    prompt = prompt + augment

    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400
    
    try:
        messages.append({"role": "user", "content": prompt})
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages = messages,
            max_tokens= 1500
        )
        chat_message = response.choices[0].message.content
        messages.append({"role": "assistant", "content": chat_message})
        return jsonify({"response": chat_message})
    except Exception as e:
         return jsonify({"error": str(e)}), 500
   
if __name__ == '__main__':
    app.run(debug=True)