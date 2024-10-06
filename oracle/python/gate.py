import subprocess
import logging

def set_gate_state(state, config):
	"""Set the gate state to open or close."""
	try:
		subprocess.run(["node", "javascript/setGetState.js", state, config['oracle_wallet']], check=True)
	except subprocess.CalledProcessError as e:
		logging.error("Failed to set gate state: %s", e)

def check_gate(config):
	"""Check the gate state."""
	try:
		subprocess.run(["node", "javascript/setGetState.js", "check", config['oracle_wallet']], check=True)
	except subprocess.CalledProcessError as e:
		logging.error("Failed to check gate state: %s", e)