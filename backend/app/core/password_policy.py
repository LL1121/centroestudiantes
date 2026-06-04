from __future__ import annotations

import re

# Contraseñas demasiado comunes (subset; ampliar según necesidad).
COMMON_PASSWORDS = frozenset(
    {
        "password",
        "password1",
        "password123",
        "12345678",
        "123456789",
        "1234567890",
        "qwerty123",
        "admin123",
        "biblioteca",
        "centro123",
    }
)


def validate_password_strength(password: str) -> str | None:
    """Devuelve mensaje de error o None si la contraseña es válida."""
    if len(password) < 10:
        return "La contraseña debe tener al menos 10 caracteres."
    if len(password) > 128:
        return "La contraseña no puede superar 128 caracteres."
    if not re.search(r"[a-z]", password):
        return "Incluí al menos una letra minúscula."
    if not re.search(r"[A-Z]", password):
        return "Incluí al menos una letra mayúscula."
    if not re.search(r"\d", password):
        return "Incluí al menos un número."
    if password.lower() in COMMON_PASSWORDS:
        return "Esa contraseña es demasiado común. Elegí otra."
    return None
