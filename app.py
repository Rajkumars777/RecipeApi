from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient, DESCENDING, ASCENDING
from bson import ObjectId, json_util
import json
import math

app = Flask(__name__)

MONGODB_URI = "mongodb+srv://recipes_db1:recipes_db2@recipesdb.ajnojfb.mongodb.net/"
DB_NAME = "recipes_db"

class RecipeAPI:
    def __init__(self):
        self.client = MongoClient(MONGODB_URI)
        self.db = self.client[DB_NAME]
        self.collection = self.db["recipes"]
    
    def get_all_recipes(self, page=1, limit=10):
        skip = (page - 1) * limit
        total = self.collection.count_documents({})
        recipes = list(
            self.collection.find({})
            .sort("rating", DESCENDING)
            .skip(skip)
            .limit(limit)
        )
        return {
            "page": page,
            "limit": limit,
            "total": total,
            "data": recipes
        }
    def search_recipes(self, filters):
        query = {}
        if 'calories' in filters:
            calories_filter = filters['calories']
            if calories_filter.startswith('<='):
                value = float(calories_filter[2:])
                query["nutrients.calories_numeric"] = {"$lte": value}
            elif calories_filter.startswith('>='):
                value = float(calories_filter[2:])
                query["nutrients.calories_numeric"] = {"$gte": value}
            elif calories_filter.startswith('<'):
                value = float(calories_filter[1:])
                query["nutrients.calories_numeric"] = {"$lt": value}
            elif calories_filter.startswith('>'):
                value = float(calories_filter[1:])
                query["nutrients.calories_numeric"] = {"$gt": value}
            else:
                value = float(calories_filter)
                query["nutrients.calories_numeric"] = value
        if 'title' in filters:
            query["title"] = {"$regex": filters['title'], "$options": "i"}
        if 'cuisine' in filters:
            query["cuisine"] = filters['cuisine']
        if 'total_time' in filters:
            total_time_filter = filters['total_time']
            if total_time_filter.startswith('<='):
                value = int(total_time_filter[2:])
                query["total_time"] = {"$lte": value}
            elif total_time_filter.startswith('>='):
                value = int(total_time_filter[2:])
                query["total_time"] = {"$gte": value}
            elif total_time_filter.startswith('<'):
                value = int(total_time_filter[1:])
                query["total_time"] = {"$lt": value}
            elif total_time_filter.startswith('>'):
                value = int(total_time_filter[1:])
                query["total_time"] = {"$gt": value}
            else:
                value = int(total_time_filter)
                query["total_time"] = value
        if 'rating' in filters:
            rating_filter = filters['rating']
            if rating_filter.startswith('<='):
                value = float(rating_filter[2:])
                query["rating"] = {"$lte": value}
            elif rating_filter.startswith('>='):
                value = float(rating_filter[2:])
                query["rating"] = {"$gte": value}
            elif rating_filter.startswith('<'):
                value = float(rating_filter[1:])
                query["rating"] = {"$lt": value}
            elif rating_filter.startswith('>'):
                value = float(rating_filter[1:])
                query["rating"] = {"$gt": value}
            else:
                value = float(rating_filter)
                query["rating"] = value
        
        recipes = list(self.collection.find(query))
        return {"data": recipes}
    
    def get_recipe_by_id(self, recipe_id):
        return self.collection.find_one({"_id": ObjectId(recipe_id)})
recipe_api = RecipeAPI()

def parse_json(data):
    return json.loads(json_util.dumps(data))

@app.route('/')
def index():
    return render_template('index.html')

# API Endpoint 1: Get All Recipes (Paginated and Sorted by Rating)
@app.route('/api/recipes', methods=['GET'])
def get_all_recipes():
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        
        result = recipe_api.get_all_recipes(page, limit)
        return jsonify(parse_json(result))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API Endpoint 2: Search Recipes
@app.route('/api/recipes/search', methods=['GET'])
def search_recipes():
    try:
        filters = {}
        if 'calories' in request.args:
            filters['calories'] = request.args['calories']
        if 'title' in request.args:
            filters['title'] = request.args['title']
        if 'cuisine' in request.args:
            filters['cuisine'] = request.args['cuisine']
        if 'total_time' in request.args:
            filters['total_time'] = request.args['total_time']
        if 'rating' in request.args:
            filters['rating'] = request.args['rating']
        
        result = recipe_api.search_recipes(filters)
        return jsonify(parse_json(result))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API Endpoint 3: Get Recipe by ID
@app.route('/api/recipes/<recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    try:
        recipe = recipe_api.get_recipe_by_id(recipe_id)
        if recipe:
            return jsonify(parse_json(recipe))
        else:
            return jsonify({"error": "Recipe not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)