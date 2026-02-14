from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    username = None  # remove the default username field
    email = models.EmailField(unique=True)

    USERNAME_FIELD = 'email'  # use email as login identifier
    REQUIRED_FIELDS = []  # no other required fields
