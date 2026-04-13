from rtrq_server import config as server_config


def test_server_secret_is_redacted_in_repr_and_json_dump() -> None:
    secret = "test-shared-secret"
    settings = server_config.Settings(server_secret=secret)

    assert secret not in repr(settings)
    assert settings.model_dump(mode="json")["server_secret"] == "**********"
