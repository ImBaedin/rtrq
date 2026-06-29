from rtrq_server_core import package_info


def test_package_is_scaffolded() -> None:
    assert package_info.name == "rtrq-server-core"
    assert package_info.status == "experimental"
