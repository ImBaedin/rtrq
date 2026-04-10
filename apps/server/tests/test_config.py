from rtrq_server.config import Settings


def test_server_secret_is_redacted_in_repr_and_json_dump() -> None:
    secret = "test-shared-secret"
    settings = Settings(server_secret=secret)

    assert secret not in repr(settings)
    assert settings.model_dump(mode="json")["server_secret"] == "**********"
