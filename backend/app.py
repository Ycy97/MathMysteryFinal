from flask import Flask, render_template, request, redirect

app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    return render_template('frontend/public/index.html')

if __name__ == '__main__':
    app.run(debug=True)