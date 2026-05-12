"""Centralized rate limiter for the application.

Uses slowapi to limit the number of requests per client IP address
to sensitive endpoints such as authentication and password changes.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize the limiter using the client's remote IP as the rate-limit key
limiter = Limiter(key_func=get_remote_address)
