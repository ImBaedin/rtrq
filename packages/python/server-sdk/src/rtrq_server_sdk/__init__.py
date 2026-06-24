from dataclasses import dataclass


@dataclass(frozen=True)
class ServerSdkConfig:
    app_id: str
    api_key: str
    server_url: str


@dataclass(frozen=True)
class PackageInfo:
    name: str
    runtime: str
    status: str


package_info = PackageInfo(
    name="rtrq-server-sdk",
    runtime="server",
    status="scaffold",
)
