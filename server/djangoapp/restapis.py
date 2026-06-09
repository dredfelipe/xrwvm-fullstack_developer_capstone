import json
import os
from pathlib import Path
from urllib.parse import quote

import requests
from dotenv import load_dotenv

load_dotenv()

backend_url = os.getenv(
    'backend_url', default="http://localhost:3030")
sentiment_analyzer_url = os.getenv(
    'sentiment_analyzer_url',
    default="http://localhost:5050/")

DATA_DIR = Path(__file__).resolve().parent.parent / 'database' / 'data'


def _load_json(filename, key):
    with (DATA_DIR / filename).open(encoding='utf-8') as source:
        return json.load(source)[key]


def get_request(endpoint, **kwargs):
    request_url = f"{backend_url.rstrip('/')}/{endpoint.lstrip('/')}"
    try:
        response = requests.get(request_url, params=kwargs, timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.RequestException:
        dealers = _load_json('dealerships.json', 'dealerships')
        reviews = _load_json('reviews.json', 'reviews')
        if endpoint == 'fetchDealers':
            return dealers
        if endpoint.startswith('fetchDealer/'):
            dealer_id = int(endpoint.rsplit('/', 1)[1])
            return [dealer for dealer in dealers if dealer['id'] == dealer_id]
        if endpoint.startswith('fetchDealers/'):
            state = endpoint.rsplit('/', 1)[1]
            if state.lower() == 'all':
                return dealers
            return [
                dealer for dealer in dealers
                if dealer['state'].lower() == state.lower()
                or dealer.get('st', '').lower() == state.lower()
            ]
        if endpoint.startswith('fetchReviews/dealer/'):
            dealer_id = int(endpoint.rsplit('/', 1)[1])
            return [
                review for review in reviews
                if review['dealership'] == dealer_id
            ]
        if endpoint == 'fetchReviews':
            return reviews
        raise

def analyze_review_sentiments(text):
    request_url = f"{sentiment_analyzer_url.rstrip('/')}/analyze/{quote(text)}"
    try:
        response = requests.get(request_url, timeout=5)
        response.raise_for_status()
        return response.json().get('sentiment', 'neutral')
    except requests.RequestException:
        positive_words = {'fantastic', 'great', 'excellent', 'good', 'amazing'}
        negative_words = {'bad', 'poor', 'terrible', 'awful'}
        words = set(text.lower().split())
        if words & positive_words:
            return 'positive'
        if words & negative_words:
            return 'negative'
        return 'neutral'

def post_review(data_dict):
    request_url = f"{backend_url.rstrip('/')}/insert_review"
    try:
        response = requests.post(request_url, json=data_dict, timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.RequestException:
        reviews_path = DATA_DIR / 'reviews.json'
        with reviews_path.open(encoding='utf-8') as source:
            payload = json.load(source)
        reviews = payload['reviews']
        duplicate = next((
            review for review in reviews
            if all(review.get(key) == data_dict.get(key) for key in (
                'name', 'dealership', 'review', 'purchase', 'purchase_date',
                'car_make', 'car_model', 'car_year',
            ))
        ), None)
        if duplicate:
            return duplicate
        data_dict['id'] = max((review['id'] for review in reviews), default=0) + 1
        reviews.append(data_dict)
        with reviews_path.open('w', encoding='utf-8') as destination:
            json.dump(payload, destination, indent=2)
        return data_dict
