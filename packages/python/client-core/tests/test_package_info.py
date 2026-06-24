from rtrq_client_core import ClientCoreConfig, package_info


def test_package_is_scaffolded() -> None:
    assert package_info.name == "rtrq-client-core"
    assert package_info.status == "scaffold"


def test_config_shape_uses_public_fields_only() -> None:
    config = ClientCoreConfig(
        app_id="app_test",
        server_url="http://localhost:8000",
    )

    assert config.app_id == "app_test"
