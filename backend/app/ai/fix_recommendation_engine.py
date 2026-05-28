def normalize_kubectl_commands(commands: object) -> list[str]:
    if isinstance(commands, str):
        return [commands] if commands.strip() else []

    if not isinstance(commands, list):
        return []

    normalized = []
    for command in commands:
        if isinstance(command, str) and command.strip():
            normalized.append(command.strip())

    return normalized[:8]

