import json
import logging

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import CarModel
from .populate import initiate
from .restapis import (
    analyze_review_sentiments,
    get_request,
    post_review,
)


# Get an instance of a logger
logger = logging.getLogger(__name__)


# Create your views here.

# Create a `login_request` view to handle sign in request
@csrf_exempt
def login_user(request):
    if request.method != 'POST':
        return JsonResponse({'status': 405, 'message': 'POST required'}, status=405)
    data = json.loads(request.body or '{}')
    username = data.get('userName', '')
    password = data.get('password', '')
    user = authenticate(username=username, password=password)
    if user is not None:
        login(request, user)
        return JsonResponse({
            'userName': username,
            'firstName': user.first_name,
            'lastName': user.last_name,
            'status': 'Authenticated',
        })
    return JsonResponse({
        'userName': username,
        'status': 'Unauthenticated',
    }, status=401)

def logout_request(request):
    username = request.user.username if request.user.is_authenticated else ''
    logout(request)
    return JsonResponse({
        'userName': username,
        'status': 'Logged out',
    })

@csrf_exempt
def registration(request):
    if request.method != 'POST':
        return JsonResponse({'status': 405, 'message': 'POST required'}, status=405)
    data = json.loads(request.body or '{}')
    required = ['userName', 'password', 'firstName', 'lastName', 'email']
    missing = [field for field in required if not data.get(field)]
    if missing:
        return JsonResponse({
            'status': 400,
            'message': f"Missing fields: {', '.join(missing)}",
        }, status=400)
    if User.objects.filter(username=data['userName']).exists():
        return JsonResponse({
            'status': 409,
            'message': 'Username already exists',
        }, status=409)

    user = User.objects.create_user(
        username=data['userName'],
        password=data['password'],
        first_name=data['firstName'],
        last_name=data['lastName'],
        email=data['email'],
    )
    login(request, user)
    return JsonResponse({
        'userName': user.username,
        'firstName': user.first_name,
        'lastName': user.last_name,
        'status': 'Authenticated',
    })

def get_dealerships(request, state='All'):
    endpoint = 'fetchDealers' if state == 'All' else f'fetchDealers/{state}'
    dealers = get_request(endpoint)
    return JsonResponse({'status': 200, 'dealers': dealers})

def get_dealer_reviews(request, dealer_id):
    reviews = get_request(f'fetchReviews/dealer/{dealer_id}')
    for review in reviews:
        review['sentiment'] = analyze_review_sentiments(review['review'])
    return JsonResponse({'status': 200, 'reviews': reviews})

def get_dealer_details(request, dealer_id):
    dealer = get_request(f'fetchDealer/{dealer_id}')
    return JsonResponse({'status': 200, 'dealer': dealer})

@csrf_exempt
def add_review(request):
    if request.method != 'POST':
        return JsonResponse({'status': 405, 'message': 'POST required'}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({'status': 401, 'message': 'Login required'}, status=401)
    data = json.loads(request.body or '{}')
    required = [
        'name', 'dealership', 'review', 'purchase', 'purchase_date',
        'car_make', 'car_model', 'car_year',
    ]
    missing = [field for field in required if data.get(field) in (None, '')]
    if missing:
        return JsonResponse({
            'status': 400,
            'message': f"Missing fields: {', '.join(missing)}",
        }, status=400)
    review = post_review(data)
    return JsonResponse({'status': 200, 'review': review})


def get_cars(request):
    if not CarModel.objects.exists():
        initiate()
    models = CarModel.objects.select_related('car_make')
    cars = [{
        'CarMake': model.car_make.name,
        'CarModel': model.name,
        'CarType': model.type,
        'CarYear': model.year,
    } for model in models]
    return JsonResponse({'status': 200, 'CarModels': cars})


def analyze_review(request):
    text = request.GET.get('text', '')
    if not text:
        return JsonResponse({'status': 400, 'message': 'text is required'}, status=400)
    return JsonResponse({
        'status': 200,
        'text': text,
        'sentiment': analyze_review_sentiments(text),
    })
