import json
import math
from pymongo import MongoClient, ASCENDING, DESCENDING
from typing import Any, Dict

class RecipeDataLoader:
    def __init__(self, mongodb_uri: str = "mongodb+srv://recipes_db1:recipes_db2@recipesdb.ajnojfb.mongodb.net/", db_name: str = "recipes_db"):
        self.client = MongoClient(mongodb_uri)
        self.db = self.client[db_name]
        self.collection = self.db["recipes"]
    def clean_value(self, value: Any) -> Any:
        if value == "NaN" or (isinstance(value, float) and math.isnan(value)):
            return None
        return value
    def parse_and_clean_recipe(self, recipe_data: Dict) -> Dict:
        cleaned_recipe = {
            "cuisine": self.clean_value(recipe_data.get("cuisine")),
            "title": self.clean_value(recipe_data.get("title")),
            "rating": self.clean_value(recipe_data.get("rating")),
            "prep_time": self.clean_value(recipe_data.get("prep_time")),
            "cook_time": self.clean_value(recipe_data.get("cook_time")),
            "total_time": self.clean_value(recipe_data.get("total_time")),
            "description": self.clean_value(recipe_data.get("description")),
            "nutrients": recipe_data.get("nutrients", {}),
            "serves": self.clean_value(recipe_data.get("serves")),
            "ingredients": recipe_data.get("ingredients", []),
            "instructions": recipe_data.get("instructions", []),
            "url": recipe_data.get("URL"),
            "continent": recipe_data.get("Contient"),
            "country": recipe_data.get("Country_State")
        }
        return cleaned_recipe
    def load_json_file(self, file_path: str):
        print(f"Loading data from {file_path}...")
        with open(file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
        self.collection.delete_many({})
        print("Cleared existing data")
        recipes_to_insert = []
        if isinstance(data, dict):
            data = list(data.values())
        for recipe in data:
            cleaned_recipe = self.parse_and_clean_recipe(recipe)
            recipes_to_insert.append(cleaned_recipe)
        if recipes_to_insert:
            result = self.collection.insert_many(recipes_to_insert)
            print(f"Successfully inserted {len(result.inserted_ids)} recipes")
        self.create_indexes()

    def create_indexes(self):
        print("Creating indexes...")
        self.collection.create_index([("rating", DESCENDING)])
        self.collection.create_index([("title", ASCENDING)])
        self.collection.create_index([("cuisine", ASCENDING)])
        self.collection.create_index([("total_time", ASCENDING)])
        print("Indexes created successfully")
    def close(self):
        self.client.close()
if __name__ == "__main__":
    loader = RecipeDataLoader()
    loader.load_json_file("database.json")
    loader.close()
    print("Data loading completed!")