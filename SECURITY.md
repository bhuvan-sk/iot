# Security Policy

## Supported Versions
Currently, only the latest release of the `ESP32 Smart Home Automation Dashboard` is supported for security updates.

## Reporting a Vulnerability
We take the security of this IoT project seriously. If you discover a vulnerability, please do NOT open a public issue.

Instead, please report it privately to the maintainer via email. We will investigate the issue and release a patch as quickly as possible.

## Security Architecture
- This project is designed to run exclusively on a private Local Area Network (LAN).
- It does not currently implement authentication for WebSocket or HTTP traffic. Deploying this system on a public or untrusted network is not recommended.
