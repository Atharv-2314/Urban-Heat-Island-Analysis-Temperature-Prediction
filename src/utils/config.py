"""
Configuration loader utility for the UHI project.
"""

from pathlib import Path
from typing import Any, Dict
import yaml


def load_config(config_path: str = "config/config.yaml") -> Dict[str, Any]:
    """Load and parse the project configuration YAML file."""
    path = Path(config_path)
    if not path.exists():
        raise FileNotFoundError(f"Configuration file not found at: {config_path}")

    with open(path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    return config
