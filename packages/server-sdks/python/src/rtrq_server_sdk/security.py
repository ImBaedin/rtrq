from pydantic import SecretStr

RTRQ_SHARED_SECRET_HEADER = "x-rtrq-secret"


def build_shared_secret_headers(shared_secret: SecretStr) -> dict[str, str]:
    return {
        RTRQ_SHARED_SECRET_HEADER: shared_secret.get_secret_value(),
    }
