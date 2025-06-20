"""Megapip: a minimal wrapper around pip."""
import sys
from pip._internal.cli.main import main as pip_main


def main(argv=None):
    argv = argv or sys.argv[1:]
    return pip_main(list(argv))


if __name__ == '__main__':
    sys.exit(main())
