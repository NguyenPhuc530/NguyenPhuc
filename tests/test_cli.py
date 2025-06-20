import subprocess
import sys


def test_megapip_version():
    mp = subprocess.check_output([sys.executable, '-m', 'megapip.cli', '--version'])
    pp = subprocess.check_output(['pip', '--version'])
    assert mp.strip().endswith(pp.strip())
