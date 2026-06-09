import json

from django.contrib.auth.models import User
from django.test import TestCase

from .models import CarMake, CarModel


class AuthenticationTests(TestCase):
    def setUp(self):
        User.objects.create_user(
            username='demouser',
            password='DemoPass123!',
            first_name='Demo',
            last_name='User',
        )

    def test_login_and_logout(self):
        login_response = self.client.post(
            '/djangoapp/login',
            data=json.dumps({
                'userName': 'demouser',
                'password': 'DemoPass123!',
            }),
            content_type='application/json',
        )
        self.assertEqual(login_response.status_code, 200)
        self.assertEqual(login_response.json()['status'], 'Authenticated')

        logout_response = self.client.get('/djangoapp/logout')
        self.assertEqual(logout_response.status_code, 200)
        self.assertEqual(logout_response.json()['status'], 'Logged out')

    def test_registration_requires_all_fields(self):
        response = self.client.post(
            '/djangoapp/register',
            data=json.dumps({'userName': 'newuser'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)


class CarModelTests(TestCase):
    def test_get_cars_populates_seed_data(self):
        response = self.client.get('/djangoapp/get_cars')
        self.assertEqual(response.status_code, 200)
        self.assertGreater(len(response.json()['CarModels']), 0)
        self.assertTrue(CarMake.objects.exists())
        self.assertTrue(CarModel.objects.exists())
