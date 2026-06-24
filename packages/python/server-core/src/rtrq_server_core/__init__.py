from dataclasses import dataclass


@dataclass(frozen=True)
class PackageInfo:
    name: str
    runtime: str
    status: str


package_info = PackageInfo(
    name="rtrq-server-core",
    runtime="server",
    status="scaffold",
)
