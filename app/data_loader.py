import json

def load_json_data(filepath):
    with open(filepath, 'r') as f:
        return json.load(f)

def load_products():
    return load_json_data('data/products.json')

def load_users():
    return load_json_data('data/users.json')