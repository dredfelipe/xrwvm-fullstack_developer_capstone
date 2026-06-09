from .models import CarMake, CarModel


def initiate():
    cars = {
        'Toyota': [
            ('Camry', CarModel.SEDAN, 2023),
            ('RAV4', CarModel.SUV, 2024),
        ],
        'Honda': [
            ('Civic', CarModel.SEDAN, 2023),
            ('CR-V', CarModel.SUV, 2024),
        ],
        'Ford': [
            ('Mustang', CarModel.COUPE, 2024),
            ('F-150', CarModel.TRUCK, 2023),
        ],
    }

    for make_name, models in cars.items():
        make, _ = CarMake.objects.get_or_create(
            name=make_name,
            defaults={'description': f'{make_name} vehicles'},
        )
        for name, car_type, year in models:
            CarModel.objects.get_or_create(
                car_make=make,
                name=name,
                year=year,
                defaults={'type': car_type},
            )
