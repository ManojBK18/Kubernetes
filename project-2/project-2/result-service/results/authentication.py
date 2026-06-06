from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
import jwt


class TokenUser:
    """Lightweight user object constructed from JWT claims — no DB hit needed."""

    def __init__(self, payload):
        self.id         = payload.get('user_id')
        self.pk         = self.id
        self.username   = payload.get('username', '')
        self.role       = payload.get('role', 'student')
        self.is_active  = True
        self.is_authenticated = True

    @property
    def is_student(self):
        return self.role == 'student'

    @property
    def is_teacher(self):
        return self.role == 'teacher'

    @property
    def is_admin_user(self):
        return self.role == 'admin'

    # Django REST framework checks these
    def __str__(self):
        return self.username


class RemoteJWTAuthentication(BaseAuthentication):
    """
    Validates JWTs issued by the auth-service using the shared signing key.
    No database call — all claims are read from the token payload.
    """

    def authenticate(self, request):
        header = request.META.get('HTTP_AUTHORIZATION', '')
        if not header.startswith('Bearer '):
            return None

        token = header.split(' ', 1)[1]
        try:
            payload = jwt.decode(
                token,
                settings.SIMPLE_JWT['SIGNING_KEY'],
                algorithms=['HS256'],
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired.')
        except jwt.InvalidTokenError as e:
            raise AuthenticationFailed(f'Invalid token: {e}')

        return (TokenUser(payload), token)

