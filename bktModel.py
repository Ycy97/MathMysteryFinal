import pandas as pd
import numpy as np

#initialize BKT parameters
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
    'quick': 1.05,
    'average': 1.0,
    'slow': 0.95
}

guess_rate = 0.25
slip_rate = 0.15
MAX_TIME_PER_QUESTION = 120

def get_response_time_category(response_time, difficulty):
    thresholds = response_time_thresholds[difficulty]
    
    if response_time <= thresholds['quick']:
        return 'quick'
    elif response_time <= thresholds['average']:
        return 'average'
    else:
        return 'slow'

#BKT algorithm per response
def update_knowledge(state, correct, difficulty, response_time, guess_rate=guess_rate, slip_rate=slip_rate):
    """
    Enhanced BKT implementation with:
    - Difficulty-specific timing
    - Realistic parameter ranges
    - Response time normalization
    """
    # Validate inputs
    response_time = min(response_time, MAX_TIME_PER_QUESTION)
    
    # Initialize state if None
    if state is None:
        state = initial_knowledge
    else:
        state = float(np.clip(state, 0, 1))  # Ensure valid probability

    # Get difficulty parameters
    learn_rate = learn_rates[difficulty]
    max_state = max_state_by_difficulty[difficulty]

    # Adjust learning rate based on response time
    time_category = get_response_time_category(response_time, difficulty)
    adjustment = response_time_adjustments[time_category]
    adjusted_learn_rate = learn_rate * adjustment

    # Bayesian update
    if correct == 1:
        numerator = (1 - slip_rate) * state
        denominator = numerator + guess_rate * (1 - state)
    else:
        numerator = slip_rate * state
        denominator = numerator + (1 - guess_rate) * (1 - state)

    p_e = numerator / denominator if denominator != 0 else 0
    new_state = p_e + (1 - p_e) * adjusted_learn_rate

    # Apply constraints
    final_state = min(max(new_state, 0), max_state)
    
    return float(np.round(final_state, 4))

if __name__ == "__main__":
    test_state = update_knowledge(
        state=0.2,
        correct=1,
        difficulty='Medium',
        response_time=25  # seconds
    )
    print(f"Updated knowledge state: {test_state:.2f}")