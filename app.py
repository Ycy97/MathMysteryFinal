from flask import Flask, render_template, request, jsonify
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
import os

app = Flask(__name__)
bcrypt = Bcrypt(app)

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL","postgresql://chengyee:HSpcoYAt98LuINAIlpwKkOAv9LPGpCiq@dpg-cu535rggph6c73dte0og-a.singapore-postgres.render.com/mathmystery")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

##User model
class Users(db.Model):
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

@app.route('/signupUser', methods=['POST'])
def gameSignup():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = Users(username=username, password=password_hash)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'User registered successfully'}), 201    

if __name__ == '__main__':
    app.run(debug=True)