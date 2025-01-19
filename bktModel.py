import pandas as pd
import numpy as np

#initialize BKT parameters
initial_knowledge = 0.1
learn_rates = {
    'Easy': 0.01,
    'Medium': 0.05,
    'Hard': 0.1
}
max_state_by_difficulty = {
    'Easy': 0.5,
    'Medium': 0.75,
    'Hard': 0.95
}
response_time_thresholds = {
    'quick': 5,  # seconds
    'average': 10  # seconds
}
response_time_adjustments = {
    'quick': 1.1,
    'average': 1.0,
    'slow': 0.9
}
guess_rate = 0.2
slip_rate = 0.1

def get_response_time_category(response_time):
    if response_time <= response_time_thresholds['quick']:
        return 'quick'
    elif response_time <= response_time_thresholds['average']:
        return 'average'
    else:
        return 'slow'

#BKT algorithm per response
def update_knowledge(state, correct, difficulty, response_time, guess_rate=guess_rate, slip_rate=slip_rate):
    
    print(type(correct))
    print(correct)

    if state is None:
        state = initial_knowledge
    else:
        state = float(state)

    learn_rate= learn_rates[difficulty]
    max_state = max_state_by_difficulty[difficulty]

    #adjust learning rate based on response time
    response_time_category = get_response_time_category(response_time)
    adjustment_factor = response_time_adjustments[response_time_category]
    adjusted_learn_rate = learn_rate * adjustment_factor
    
    if correct == 1:
        print('correct')
        p_e = (1 - slip_rate) * state / ((1 - slip_rate) * state + guess_rate * (1 - state))
    else:
        print("incorrect")
        p_e = slip_rate * state / (slip_rate * state + (1 - guess_rate) * (1 - state))

    new_state = p_e + (1 - p_e) * adjusted_learn_rate

    final_state = min(new_state, max_state)
    print(final_state)

    return final_state

if __name__ == "__main__":
    update_knowledge(0.1, 0, 'Easy', 0.8)