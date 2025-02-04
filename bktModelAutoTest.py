import numpy as np

# BKT Parameters and Functions (from previous code)
initial_knowledge = 0.15
learn_rates = {
    'Easy': 0.03,
    'Medium': 0.07,
    'Hard': 0.12
}
max_state_by_difficulty = {
    'Easy': 0.5,
    'Medium': 0.75,
    'Hard': 0.95
}
response_time_thresholds = {
    'Easy': {'quick': 15, 'average': 30},
    'Medium': {'quick': 25, 'average': 45},
    'Hard': {'quick': 35, 'average': 60}
}
response_time_adjustments = {
    'quick': 1.0,    # No boost for quick responses
    'average': 1.0,
    'slow': 0.97     # Small penalty for very slow responses
}
guess_rate = 0.20
slip_rate = 0.10
MAX_TIME_PER_QUESTION = 120
FORGETTING_FACTOR = 0.98

def get_response_time_category(response_time, difficulty):
    thresholds = response_time_thresholds[difficulty]
    if response_time <= thresholds['quick']:
        return 'quick'
    elif response_time <= thresholds['average']:
        return 'average'
    else:
        return 'slow'

def update_knowledge(state, correct, difficulty, response_time, last_response_time=None):
    """
    Update the student's knowledge state based on the response.
    
    Parameters:
      state             : current mastery state (float)
      correct           : 1 if answer is correct, 0 if not
      difficulty        : string ("Easy", "Medium", or "Hard")
      response_time     : time taken (in seconds)
      last_response_time: time difference from previous question (optional)
    
    Returns:
      final_state       : updated mastery state (float, rounded to 4 decimals)
    """
    response_time = min(response_time, MAX_TIME_PER_QUESTION)
    
    if state is None:
        state = initial_knowledge
    else:
        state = float(np.clip(state, 0, 1))
    
    learn_rate = learn_rates[difficulty]
    max_state = max_state_by_difficulty[difficulty]
    
    time_category = get_response_time_category(response_time, difficulty)
    adjustment = response_time_adjustments[time_category]
    adjusted_learn_rate = learn_rate * adjustment

    # Apply a slight penalty for very quick responses
    confidence_penalty = 0.98 if time_category == "quick" else 1.0
    adjusted_learn_rate *= confidence_penalty

    # Bayesian update
    if correct == 1:
        numerator = (1 - slip_rate) * state
        denominator = numerator + guess_rate * (1 - state)
    else:
        numerator = slip_rate * state
        denominator = numerator + (1 - guess_rate) * (1 - state)
    
    p_e = numerator / denominator if denominator != 0 else 0
    new_state = p_e + (1 - p_e) * adjusted_learn_rate

    # Apply forgetting decay if needed (for long gaps)
    if last_response_time and (last_response_time > 300):  # more than 5 minutes gap
        new_state *= FORGETTING_FACTOR

    final_state = min(max(new_state, 0), max_state)
    return float(np.round(final_state, 4))

# Simulate a series of responses
# Each response is a dict with:
#   - correct: 1 if correct, 0 if not
#   - response_time: time in seconds the student took to answer
#   - difficulty: the difficulty of the question

simulated_responses = [
    {"correct": 1, "response_time": 20, "difficulty": "Medium"},  # moderate time
    {"correct": 1, "response_time": 15, "difficulty": "Medium"},  # quick answer
    {"correct": 0, "response_time": 40, "difficulty": "Medium"},  # slightly slow incorrect answer
    {"correct": 1, "response_time": 30, "difficulty": "Medium"},  # average time correct answer
    {"correct": 1, "response_time": 10, "difficulty": "Medium"},  # very quick answer (might be penalized)
    {"correct": 1, "response_time": 50, "difficulty": "Medium"},  # slow but correct
]

# Start with an initial state (could be different than initial_knowledge)
current_state = 0.9  # assume the student starts at high mastery
print(f"Initial Mastery: {current_state:.2f}")

# Loop over the simulated responses
for i, response in enumerate(simulated_responses, start=1):
    # For simulation, we won't model last_response_time here, but you could track time gaps
    current_state = update_knowledge(
        state=current_state,
        correct=response["correct"],
        difficulty=response["difficulty"],
        response_time=response["response_time"],
        last_response_time=None  # Not using last_response_time in this simulation
    )
    print(f"After response {i} (correct: {response['correct']}, time: {response['response_time']}s): Mastery = {current_state:.2f}")

print(f"Final Mastery: {current_state:.2f}")
