from rtrq_server_sdk import ServerSdkConfig, package_info


def test_package_is_scaffolded() -> None:
    assert package_info.name == "rtrq-server-sdk"
    assert package_info.status == "scaffold"


def test_config_shape_contains_server_secret_fields() -> None:
    config = ServerSdkConfig(
        app_id="app_test",
        api_key="rtrq_sk_test",
        server_url="http://localhost:8000",
    )

    assert config.app_id == "app_test"
    assert config.api_key.startswith("rtrq_sk_")
