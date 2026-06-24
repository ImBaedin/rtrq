from dataclasses import dataclass


@dataclass(frozen=True)
class ClientCoreConfig:
    app_id: str
    server_url: str


@dataclass(frozen=True)
class PackageInfo:
    name: str
    runtime: str
    status: str


package_info = PackageInfo(
    name="rtrq-client-core",
    runtime="client",
    status="scaffold",
)
